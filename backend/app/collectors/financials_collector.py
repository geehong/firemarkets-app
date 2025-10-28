"""
Financial statements data collector for fetching and storing financial data from SEC EDGAR.
This collector uses the EdgarClient to retrieve financial statements and enqueues them for processing.
"""
import logging
import asyncio
import json
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from .base_collector import BaseCollector
from app.models.asset import Asset, AssetType
from app.core.config_manager import ConfigManager
from app.services.api_strategy_manager import ApiStrategyManager
from app.utils.redis_queue_manager import RedisQueueManager
from app.external_apis.implementations.edgar_client import EdgarClient

logger = logging.getLogger(__name__)


class FinancialsCollector(BaseCollector):
    """
    Collector for fetching and storing financial statements data from SEC EDGAR.
    This collector retrieves balance sheet, income statement, and cash flow data.
    """
    
    # Financial statements we are interested in collecting
    FINANCIAL_STATEMENTS = {
        'balance-sheet': {
            'concepts': ['Assets', 'Liabilities', 'StockholdersEquity'],
            'description': 'Balance Sheet data'
        },
        'income-statement': {
            'concepts': ['Revenues', 'NetIncomeLoss', 'OperatingIncomeLoss'],
            'description': 'Income Statement data'
        },
        'cash-flow': {
            'concepts': ['NetCashProvidedByUsedInOperatingActivities', 
                        'NetCashProvidedByUsedInInvestingActivities',
                        'NetCashProvidedByUsedInFinancingActivities'],
            'description': 'Cash Flow Statement data'
        }
    }
    
    # Periods to collect
    PERIODS = ['annual', 'quarterly']

    def __init__(
        self,
        db: Session,
        config_manager: ConfigManager,
        api_manager: ApiStrategyManager,
        redis_queue_manager: RedisQueueManager,
    ):
        super().__init__(db, config_manager, api_manager, redis_queue_manager)
        
        # Initialize EDGAR client
        self.edgar_client = EdgarClient()

    async def _collect_data(self) -> Dict[str, Any]:
        """
        Main collection logic for financial statements data.
        """
        # Check if financial collection is enabled
        if not self.config_manager.is_financials_collection_enabled():
            self.logging_helper.log_info("Financial statements collection is disabled via configuration.")
            return {"processed_assets": 0, "total_added_records": 0}

        # Get target assets (stocks only for financial data)
        asset_ids = self._get_target_asset_ids()
        if not asset_ids:
            self.logging_helper.log_warning("No assets with financial collection enabled were found.")
            return {"processed_assets": 0, "total_added_records": 0}

        self.logging_helper.log_info(f"Starting financial statements collection for {len(asset_ids)} assets")

        # Process each asset
        tasks = [
            self.process_with_semaphore(
                self._collect_financials_for_asset(asset_id)
            )
            for asset_id in asset_ids
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Aggregate results
        total_processed = 0
        total_added_to_queue = 0
        for result in results:
            if isinstance(result, Exception):
                self.logging_helper.log_error(f"An error occurred during financial collection: {result}")
            elif isinstance(result, dict):
                total_processed += result.get("processed_statements", 0)
                total_added_to_queue += result.get("enqueued_records", 0)

        return {
            "processed_assets": total_processed,
            "total_added_records": total_added_to_queue,
        }

    def _get_target_asset_ids(self) -> List[int]:
        """Fetches the IDs of assets that are configured for financial collection."""
        try:
            query = (
                self.db.query(Asset.asset_id)
                .join(AssetType)
                .filter(
                    Asset.is_active == True,
                    Asset.asset_type.has(AssetType.type_name == 'stock'),  # Only stocks have financial statements
                    Asset.collection_settings.op('->>')('collect_financials') == 'true'
                )
            )
            asset_id_tuples = query.all()
            return [asset_id for (asset_id,) in asset_id_tuples]
        except Exception as e:
            self.logging_helper.log_error(f"Failed to fetch target asset IDs: {e}")
            return []

    async def _collect_financials_for_asset(self, asset_id: int) -> Dict[str, Any]:
        """
        Collects financial statements data for a single asset.
        """
        try:
            # Get asset information
            asset = self.db.query(Asset).filter(Asset.asset_id == asset_id).first()
            if not asset:
                self.logging_helper.log_error(f"Asset with ID {asset_id} not found")
                return {"success": False, "error": "Asset not found"}

            symbol = asset.symbol
            self.logging_helper.log_info(f"Collecting financial data for {symbol} (ID: {asset_id})")

            total_enqueued = 0
            processed_statements = 0

            # Collect each type of financial statement
            for statement_type, config in self.FINANCIAL_STATEMENTS.items():
                for period in self.PERIODS:
                    try:
                        # Fetch financial data from EDGAR
                        financial_data = await self.edgar_client.get_financial_statements(
                            symbol=symbol,
                            statement_type=statement_type,
                            period=period,
                            limit=4  # Get last 4 periods
                        )

                        if financial_data:
                            # Enqueue the data for processing
                            enqueued_count = await self._enqueue_financial_data(
                                asset_id, statement_type, period, financial_data
                            )
                            total_enqueued += enqueued_count
                            processed_statements += 1
                            
                            self.logging_helper.log_debug(
                                f"Enqueued {enqueued_count} {period} {statement_type} records for {symbol}"
                            )
                        else:
                            self.logging_helper.log_debug(
                                f"No {period} {statement_type} data found for {symbol}"
                            )

                    except Exception as e:
                        self.logging_helper.log_error(
                            f"Error collecting {statement_type} ({period}) for {symbol}: {e}"
                        )

            return {
                "success": True,
                "processed_statements": processed_statements,
                "enqueued_records": total_enqueued
            }

        except Exception as e:
            self.logging_helper.log_asset_error(asset_id, e)
            return {"success": False, "error": str(e)}

    async def _enqueue_financial_data(
        self, 
        asset_id: int, 
        statement_type: str, 
        period: str, 
        financial_data: List[Dict[str, Any]]
    ) -> int:
        """
        Enqueues financial data for processing.
        """
        try:
            # Prepare the data for enqueueing
            items = []
            for item in financial_data:
                # Add metadata to each item
                item_with_metadata = {
                    **item,
                    "asset_id": asset_id,
                    "statement_type": statement_type,
                    "period": period,
                    "data_source": "SEC EDGAR"
                }
                items.append(item_with_metadata)

            # Enqueue the batch
            await self.redis_queue_manager.push_batch_task(
                "financial_statements_data",
                {
                    "items": items,
                    "metadata": {
                        "asset_id": asset_id,
                        "statement_type": statement_type,
                        "period": period,
                        "data_type": "financial_statements",
                        "data_source": "SEC EDGAR",
                        "total_records": len(items)
                    }
                }
            )

            return len(items)

        except Exception as e:
            self.logging_helper.log_error(f"Error enqueueing financial data: {e}")
            return 0

    async def collect_single_ticker(self, ticker: str) -> Dict[str, Any]:
        """
        Collects financial data for a single ticker (for manual/API use).
        """
        try:
            self.logging_helper.log_info(f"Collecting financial data for ticker: {ticker}")
            
            total_enqueued = 0
            processed_statements = 0

            # Collect each type of financial statement
            for statement_type, config in self.FINANCIAL_STATEMENTS.items():
                for period in self.PERIODS:
                    try:
                        financial_data = await self.edgar_client.get_financial_statements(
                            symbol=ticker,
                            statement_type=statement_type,
                            period=period,
                            limit=4
                        )

                        if financial_data:
                            # For single ticker collection, we don't have an asset_id
                            # So we'll just log the data or return it directly
                            self.logging_helper.log_info(
                                f"Found {len(financial_data)} {period} {statement_type} records for {ticker}"
                            )
                            
                            # Log sample data
                            for item in financial_data[:2]:  # Log first 2 items
                                self.logging_helper.log_debug(
                                    f"[{ticker} / {item.get('frame', 'N/A')}] "
                                    f"{item.get('concept', 'N/A')}: {item.get('value', 'N/A')} "
                                    f"({item.get('date', 'N/A')})"
                                )
                            
                            processed_statements += 1
                        else:
                            self.logging_helper.log_debug(
                                f"No {period} {statement_type} data found for {ticker}"
                            )

                    except Exception as e:
                        self.logging_helper.log_error(
                            f"Error collecting {statement_type} ({period}) for {ticker}: {e}"
                        )

            return {
                "success": True,
                "ticker": ticker,
                "processed_statements": processed_statements,
                "total_records": total_enqueued
            }

        except Exception as e:
            self.logging_helper.log_error(f"Error collecting financial data for {ticker}: {e}")
            return {"success": False, "error": str(e)}


