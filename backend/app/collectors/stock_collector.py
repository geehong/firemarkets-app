"""
Stock data collector for fetching and storing company information, financials, and estimates.
"""
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any

import httpx
import backoff
from sqlalchemy.orm import Session

from .base_collector import BaseCollector
from .logging_helper import CollectorLoggingHelper, BatchProcessor
from ..core.config import GLOBAL_APP_CONFIGS
from ..models.asset import Asset
from ..utils.retry import retry_with_backoff, classify_api_error, TransientAPIError, PermanentAPIError

from ..crud.asset import crud_stock_financial, crud_stock_profile, crud_stock_estimate, crud_asset

logger = logging.getLogger(__name__)


class StockCollector(BaseCollector):
    """Collects stock data including company info, financials, and estimates"""
    
    def __init__(self, db: Session = None):
        super().__init__(db)
        from ..core.config import GLOBAL_APP_CONFIGS
        self.api_timeout = GLOBAL_APP_CONFIGS.get("API_REQUEST_TIMEOUT_SECONDS", 30)
        self.max_retries = GLOBAL_APP_CONFIGS.get("MAX_API_RETRY_ATTEMPTS", 3)
        
        # 로깅 헬퍼 초기화
        self.logging_helper = CollectorLoggingHelper("StockCollector", self)
    
    async def collect_with_settings(self) -> Dict[str, Any]:
        """Collect stock data with individual asset settings"""
        try:
            # Get assets that have stock collection enabled in their settings
            # 하이브리드 방식: True/False와 true/false 모두 지원
            from sqlalchemy import or_, text
            
            db = self.get_db_session()
            condition1 = Asset.collection_settings.contains({"collect_assets_info": True})
            condition2 = text("JSON_EXTRACT(collection_settings, '$.collect_assets_info') = true")
            
            assets = db.query(Asset).filter(
                Asset.is_active == True,
                or_(condition1, condition2)
            ).all()
            
            if not assets:
                self.logging_helper.log_assets_filtered(0, {"collect_assets_info": True})
                await self.safe_emit('scheduler_log', {
                    'message': "주식 데이터 수집이 활성화된 자산이 없습니다.", 
                    'type': 'warning'
                })
                return {"message": "No assets with stock collection enabled", "processed": 0}
            
            # 수집 시작 로그
            self.logging_helper.start_collection("stock data", len(assets), {
                "collection_type": "settings_based",
                "filter_criteria": {"collect_assets_info": True}
            })
            
            # 자산 필터링 결과 로그
            self.logging_helper.log_assets_filtered(len(assets), {"collect_assets_info": True})
            
            await self.safe_emit('scheduler_log', {
                'message': f"주식 데이터 수집 시작: {len(assets)}개 자산 (설정 기반)", 
                'type': 'info'
            })
            
            return await self._collect_data()
            
        except Exception as e:
            self.log_progress(f"Stock collection with settings failed: {e}", "error")
            raise
        finally:
            db.close()
    
    async def _collect_data(self) -> Dict[str, Any]:
        """Collect stock data for all stock assets"""
        db = self.get_db_session()
        
        try:
            # Get stock assets that have collection enabled in their settings
            from ..models import AssetType
            from sqlalchemy import or_, text
            
            # 각 수집 타입별로 필터링
            condition1 = Asset.collection_settings.contains({"collect_assets_info": True})
            condition2 = text("JSON_EXTRACT(collection_settings, '$.collect_assets_info') = true")
            condition3 = Asset.collection_settings.contains({"collect_estimates": True})
            condition4 = text("JSON_EXTRACT(collection_settings, '$.collect_estimates') = true")
            condition5 = Asset.collection_settings.contains({"collect_financials": True})
            condition6 = text("JSON_EXTRACT(collection_settings, '$.collect_financials') = true")
            
            stock_assets = db.query(Asset).join(AssetType).filter(
                Asset.is_active == True,
                AssetType.type_name.in_(['Stock', 'stock', 'stocks']),
                or_(condition1, condition2, condition3, condition4, condition5, condition6)
            ).all()
            
            if not stock_assets:
                self.logging_helper.log_assets_filtered(0, {"asset_type": "stock"})
                return {"message": "No active stock assets found", "processed": 0}
            
            # 자산 필터링 결과 로그
            self.logging_helper.log_assets_filtered(len(stock_assets), {
                "asset_type": "stock",
                "collection_types": ["assets_info", "estimates", "financials"]
            })
            
            self.log_progress(f"Starting stock data collection for {len(stock_assets)} stocks")
            
            # 배치 프로세서를 사용한 처리
            batch_processor = BatchProcessor(self.logging_helper, batch_size=3)
            
            async def process_stock_asset(asset):
                return await self.process_with_semaphore(
                    self._fetch_and_store_stock_data_for_asset(asset)
                )
            
            result = await batch_processor.process_assets(stock_assets, process_stock_asset)
            
            # 수집 완료 로그
            self.logging_helper.log_collection_completion(
                result["processed_assets"], 
                result["total_added_records"],
                {"collection_type": "stock_data"}
            )
            
            return {
                "processed_stocks": result["processed_assets"],
                "updated_stocks": result["total_added_records"],
                "message": f"Successfully processed {result['processed_assets']} stocks, updated {result['total_added_records']}"
            }
            
        except Exception as e:
            self.log_progress(f"Stock collection failed: {e}", "error")
            raise
    
    async def _fetch_async(self, client: httpx.AsyncClient, url: str, api_name: str, ticker: str):
        """Fetch data from API with advanced retry logic"""
        async def api_call():
            await self.safe_emit('scheduler_log', {
                'message': f"[{ticker}] {api_name} API 호출 시도: {url}", 
                'type': 'info'
            })
            
            response = await client.get(url, timeout=self.api_timeout)
            
            # API 응답 상태 코드에 따른 오류 분류
            if response.status_code == 429:
                raise TransientAPIError(f"Rate limit exceeded for {api_name}")
            elif response.status_code >= 500:
                raise TransientAPIError(f"Server error {response.status_code} for {api_name}")
            elif response.status_code == 404:
                raise PermanentAPIError(f"Resource not found for {ticker} in {api_name}")
            elif response.status_code in [401, 403]:
                raise PermanentAPIError(f"Authentication failed for {api_name}")
            
            response.raise_for_status()
            return response.json()
        
        # 고도화된 재시도 로직 적용
        max_retries = GLOBAL_APP_CONFIGS.get("MAX_API_RETRY_ATTEMPTS", 3)
        return await retry_with_backoff(
            api_call,
            max_retries=max_retries,
            base_delay=1.0,
            max_delay=30.0,
            jitter=True
        )
    
    async def _fetch_fmp_profile(self, client: httpx.AsyncClient, ticker: str, api_key: str) -> Optional[dict]:
        """Fetch company profile from FMP"""
        try:
            url = f"https://financialmodelingprep.com/api/v3/profile/{ticker}?apikey={api_key}"
            data = await self._fetch_async(client, url, "FMP Profile", ticker)
            
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            elif isinstance(data, dict) and data.get('success', False):
                return data.get('data', [{}])[0] if data.get('data') else None
            return None
        except Exception as e:
            self.log_progress(f"FMP profile fetch failed for {ticker}: {e}", "error")
            return None
    
    async def _fetch_alpha_vantage_overview(self, client: httpx.AsyncClient, ticker: str, api_key: str) -> Optional[dict]:
        """Fetch company overview from Alpha Vantage"""
        try:
            url = f"https://www.alphavantage.co/query?function=OVERVIEW&symbol={ticker}&apikey={api_key}"
            data = await self._fetch_async(client, url, "Alpha Vantage Overview", ticker)
            
            if isinstance(data, dict) and data.get('Symbol'):
                return data
            return None
        except Exception as e:
            self.log_progress(f"Alpha Vantage overview fetch failed for {ticker}: {e}", "error")
            return None
    
    async def _fetch_fmp_estimates(self, client: httpx.AsyncClient, ticker: str, api_key: str) -> Optional[list]:
        """Fetch analyst estimates from FMP"""
        try:
            url = f"https://financialmodelingprep.com/stable/analyst-estimates?symbol={ticker}&period=annual&page=0&limit=10&apikey={api_key}"
            data = await self._fetch_async(client, url, "FMP Estimates", ticker)
            
            if isinstance(data, list):
                return data
            elif isinstance(data, dict) and data.get('success', False):
                return data.get('data', [])
            return None
        except Exception as e:
            self.log_progress(f"FMP estimates fetch failed for {ticker}: {e}", "error")
            return None
    
    async def _fetch_fmp_quote(self, client: httpx.AsyncClient, ticker: str, api_key: str) -> Optional[dict]:
        """Fetch real-time quote from FMP"""
        try:
            url = f"https://financialmodelingprep.com/api/v3/quote/{ticker}?apikey={api_key}"
            data = await self._fetch_async(client, url, "FMP Quote", ticker)
            
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            elif isinstance(data, dict) and data.get('success', False):
                return data.get('data', [{}])[0] if data.get('data') else None
            return None
        except Exception as e:
            self.log_progress(f"FMP quote fetch failed for {ticker}: {e}", "error")
            return None
    
    async def _fetch_twelvedata_profile(self, client: httpx.AsyncClient, ticker: str) -> Optional[dict]:
        """Fetch company profile from TwelveData"""
        try:
            from ..external_apis.twelvedata_client import TwelveDataClient
            
            twelvedata_client = TwelveDataClient()
            
            # TwelveData API에서 회사 정보 조회
            profile_data = await twelvedata_client.get_metadata(ticker)
            
            if profile_data:
                return {
                    'company_name': profile_data.get('name'),
                    'description': profile_data.get('description'),
                    'sector': profile_data.get('sector'),
                    'industry': profile_data.get('industry'),
                    'country': profile_data.get('country'),
                    'exchange': profile_data.get('exchange'),
                    'currency': profile_data.get('currency'),
                    'market_cap': profile_data.get('market_cap'),
                    'pe_ratio': profile_data.get('pe_ratio'),
                    'beta': profile_data.get('beta')
                }
            
            return None
            
        except Exception as e:
            self.log_progress(f"TwelveData profile fetch failed for {ticker}: {e}", "error")
            return None

    async def _fetch_twelvedata_quote(self, client: httpx.AsyncClient, ticker: str) -> Optional[dict]:
        """Fetch real-time quote from TwelveData"""
        try:
            from ..external_apis.twelvedata_client import TwelveDataClient
            
            twelvedata_client = TwelveDataClient()
            
            # TwelveData API에서 실시간 가격 조회
            quote_data = await twelvedata_client.get_quote(ticker)
            
            if quote_data:
                return {
                    'price': quote_data.get('close'),
                    'change': quote_data.get('change'),
                    'change_percent': quote_data.get('percent_change'),
                    'volume': quote_data.get('volume'),
                    'high': quote_data.get('high'),
                    'low': quote_data.get('low'),
                    'open': quote_data.get('open'),
                    'previous_close': quote_data.get('previous_close')
                }
            
            return None
            
        except Exception as e:
            self.log_progress(f"TwelveData quote fetch failed for {ticker}: {e}", "error")
            return None

    async def _fetch_tiingo_profile(self, client: httpx.AsyncClient, ticker: str) -> Optional[dict]:
        """Fetch company profile from Tiingo"""
        try:
            from ..external_apis.tiingo_client import TiingoClient
            
            tiingo_client = TiingoClient()
            
            # Tiingo API에서 회사 정보 조회
            metadata = await tiingo_client.get_metadata(ticker)
            
            if metadata:
                return {
                    'company_name': metadata.get('name'),
                    'description': metadata.get('description'),
                    'sector': metadata.get('sector'),
                    'industry': metadata.get('industry'),
                    'country': metadata.get('country'),
                    'exchange': metadata.get('exchange'),
                    'currency': metadata.get('currency'),
                    'market_cap': metadata.get('market_cap'),
                    'pe_ratio': metadata.get('pe_ratio'),
                    'beta': metadata.get('beta')
                }
            
            return None
            
        except Exception as e:
            self.log_progress(f"Tiingo profile fetch failed for {ticker}: {e}", "error")
            return None

    async def _fetch_tiingo_quote(self, client: httpx.AsyncClient, ticker: str) -> Optional[dict]:
        """Fetch real-time quote from Tiingo"""
        try:
            from ..external_apis.tiingo_client import TiingoClient
            
            tiingo_client = TiingoClient()
            
            # Tiingo API에서 실시간 가격 조회
            quote_data = await tiingo_client.get_quote(ticker)
            
            if quote_data:
                return {
                    'price': quote_data.get('last'),
                    'change': quote_data.get('change'),
                    'change_percent': quote_data.get('changePercent'),
                    'volume': quote_data.get('volume'),
                    'high': quote_data.get('high'),
                    'low': quote_data.get('low'),
                    'open': quote_data.get('open'),
                    'previous_close': quote_data.get('prevClose')
                }
            
            return None
            
        except Exception as e:
            self.log_progress(f"Tiingo quote fetch failed for {ticker}: {e}", "error")
            return None

    async def _fetch_and_store_stock_data_for_asset(self, asset: Asset) -> Dict[str, Any]:
        """Fetch and store comprehensive stock data for a single asset"""
        try:
            self.log_progress(f"[{asset.ticker}] Starting comprehensive stock data collection")
            
            # Get API keys and determine data source
            from ..core.config import GLOBAL_APP_CONFIGS
            fmp_api_key = GLOBAL_APP_CONFIGS.get("FMP_API_KEY")
            av_api_key = GLOBAL_APP_CONFIGS.get("ALPHA_VANTAGE_API_KEY_1")
            twelvedata_api_key = GLOBAL_APP_CONFIGS.get("TWELVEDATA_API_KEY")
            tiingo_api_key = GLOBAL_APP_CONFIGS.get("TIINGO_API_KEY")
            
            # Determine which API to use based on asset's data_source
            data_source = asset.data_source or 'fmp'
            
            if data_source == 'fmp' and not fmp_api_key:
                self.log_progress(f"[{asset.ticker}] FMP API key not configured", "error")
                return {"success": False, "error": "FMP API key not configured"}
            elif data_source == 'alpha_vantage' and not av_api_key:
                self.log_progress(f"[{asset.ticker}] Alpha Vantage API key not configured", "error")
                return {"success": False, "error": "Alpha Vantage API key not configured"}
            elif data_source == 'twelvedata' and not twelvedata_api_key:
                self.log_progress(f"[{asset.ticker}] TwelveData API key not configured", "error")
                return {"success": False, "error": "TwelveData API key not configured"}
            elif data_source == 'tiingo' and not tiingo_api_key:
                self.log_progress(f"[{asset.ticker}] Tiingo API key not configured", "error")
                return {"success": False, "error": "Tiingo API key not configured"}
            
            # Fetch data based on data_source with fallback strategy
            tasks = []
            fallback_sources = []
            
            # Fallback 전략 정의
            if data_source == 'fmp':
                fallback_sources = ['alpha_vantage', 'twelvedata', 'tiingo']
            elif data_source == 'alpha_vantage':
                fallback_sources = ['fmp', 'twelvedata', 'tiingo']
            elif data_source == 'twelvedata':
                fallback_sources = ['fmp', 'alpha_vantage', 'tiingo']
            elif data_source == 'tiingo':
                fallback_sources = ['fmp', 'alpha_vantage', 'twelvedata']
            else:
                fallback_sources = ['fmp', 'alpha_vantage', 'twelvedata', 'tiingo']
            
            # Primary source 시도
            if data_source == 'fmp' and fmp_api_key:
                tasks.extend([
                    self._fetch_fmp_profile(httpx.AsyncClient(), asset.ticker, fmp_api_key),
                    self._fetch_fmp_estimates(httpx.AsyncClient(), asset.ticker, fmp_api_key),
                    self._fetch_fmp_quote(httpx.AsyncClient(), asset.ticker, fmp_api_key)
                ])
            elif data_source == 'alpha_vantage' and av_api_key:
                tasks.append(self._fetch_alpha_vantage_overview(httpx.AsyncClient(), asset.ticker, av_api_key))
            elif data_source == 'twelvedata' and twelvedata_api_key:
                tasks.extend([
                    self._fetch_twelvedata_profile(httpx.AsyncClient(), asset.ticker),
                    self._fetch_twelvedata_quote(httpx.AsyncClient(), asset.ticker)
                ])
            elif data_source == 'tiingo' and tiingo_api_key:
                tasks.extend([
                    self._fetch_tiingo_profile(httpx.AsyncClient(), asset.ticker),
                    self._fetch_tiingo_quote(httpx.AsyncClient(), asset.ticker)
                ])
            
            # Primary source가 실패하면 fallback 시도
            if not tasks:
                for fallback_source in fallback_sources:
                    if fallback_source == 'fmp' and fmp_api_key:
                        tasks.extend([
                            self._fetch_fmp_profile(httpx.AsyncClient(), asset.ticker, fmp_api_key),
                            self._fetch_fmp_estimates(httpx.AsyncClient(), asset.ticker, fmp_api_key),
                            self._fetch_fmp_quote(httpx.AsyncClient(), asset.ticker, fmp_api_key)
                        ])
                        break
                    elif fallback_source == 'alpha_vantage' and av_api_key:
                        tasks.append(self._fetch_alpha_vantage_overview(httpx.AsyncClient(), asset.ticker, av_api_key))
                        break
                    elif fallback_source == 'twelvedata' and twelvedata_api_key:
                        tasks.extend([
                            self._fetch_twelvedata_profile(httpx.AsyncClient(), asset.ticker),
                            self._fetch_twelvedata_quote(httpx.AsyncClient(), asset.ticker)
                        ])
                        break
                    elif fallback_source == 'tiingo' and tiingo_api_key:
                        tasks.extend([
                            self._fetch_tiingo_profile(httpx.AsyncClient(), asset.ticker),
                            self._fetch_tiingo_quote(httpx.AsyncClient(), asset.ticker)
                        ])
                        break
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            fmp_profile = None
            fmp_estimates = None
            fmp_quote = None
            av_overview = None
            
            result_index = 0
            if fmp_api_key:
                fmp_profile = results[result_index] if not isinstance(results[result_index], Exception) else None
                result_index += 1
                fmp_estimates = results[result_index] if not isinstance(results[result_index], Exception) else None
                result_index += 1
                fmp_quote = results[result_index] if not isinstance(results[result_index], Exception) else None
                result_index += 1
            
            if av_api_key:
                av_overview = results[result_index] if not isinstance(results[result_index], Exception) else None
            
            # Consolidate and store data
            success = await self._consolidate_and_store_stock_data(asset, fmp_profile, fmp_estimates, fmp_quote, av_overview)
            
            if success:
                self.log_progress(f"[{asset.ticker}] Stock data collection completed successfully")
                return {"success": True, "message": "Stock data collected and stored"}
            else:
                return {"success": False, "error": "Failed to store stock data"}
                
        except Exception as e:
            self.log_progress(f"[{asset.ticker}] Stock data collection failed: {e}", "error")
            return {"success": False, "error": str(e)}
    
    async def _consolidate_and_store_stock_data(self, asset: Asset, fmp_profile: dict, fmp_estimates: list, fmp_quote: dict, av_overview: dict) -> bool:
        """Consolidate data from multiple sources and store in database"""
        db = self.get_db_session()
        
        try:
            # 1. Profile data consolidation (FMP priority, Alpha Vantage fallback)
            profile_data = {'asset_id': asset.asset_id}
            
            if isinstance(fmp_profile, dict):
                profile_data.update({
                    'company_name': fmp_profile.get('companyName'),
                    'description': fmp_profile.get('description'),
                    'sector': fmp_profile.get('sector'),
                    'industry': fmp_profile.get('industry'),
                    'country': fmp_profile.get('country'),
                    'city': fmp_profile.get('city'),
                    'address': fmp_profile.get('address'),
                    'phone': fmp_profile.get('phone'),
                    'website': fmp_profile.get('website'),
                    'ceo': fmp_profile.get('ceo'),
                    'employees_count': self._safe_int(fmp_profile.get('fullTimeEmployees')),
                    'ipo_date': self._safe_date_parse(fmp_profile.get('ipoDate')),
                    'logo_image_url': fmp_profile.get('image')
                })
            
            if isinstance(av_overview, dict):
                # Fill missing values with Alpha Vantage data
                profile_data.setdefault('company_name', av_overview.get('Name'))
                profile_data.setdefault('description', av_overview.get('Description'))
                profile_data.setdefault('sector', av_overview.get('Sector'))
                profile_data.setdefault('industry', av_overview.get('Industry'))
                profile_data.setdefault('country', av_overview.get('Country'))
                profile_data.setdefault('address', av_overview.get('Address'))
                profile_data.setdefault('website', av_overview.get('OfficialSite'))
            
            # 2. Financials data consolidation (Alpha Vantage priority, FMP fallback)
            financials_data = {
                'asset_id': asset.asset_id,
                'snapshot_date': datetime.now().date()
            }
            
            if isinstance(av_overview, dict):
                financials_data.update({
                    'currency': av_overview.get('Currency'),
                    'market_cap': self._safe_int(av_overview.get('MarketCapitalization')),
                    'pe_ratio': self._safe_float(av_overview.get('PERatio')),
                    'peg_ratio': self._safe_float(av_overview.get('PEGRatio')),
                    'beta': self._safe_float(av_overview.get('Beta')),
                    'eps': self._safe_float(av_overview.get('EPS')),
                    'dividend_yield': self._safe_float(av_overview.get('DividendYield')),
                    'dividend_per_share': self._safe_float(av_overview.get('DividendPerShare')),
                    'profit_margin_ttm': self._safe_float(av_overview.get('ProfitMargin')),
                    'return_on_equity_ttm': self._safe_float(av_overview.get('ReturnOnEquityTTM')),
                    'revenue_ttm': self._safe_int(av_overview.get('RevenueTTM')),
                    'price_to_book_ratio': self._safe_float(av_overview.get('PriceToBookRatio')),
                    '_52_week_high': self._safe_float(av_overview.get('52WeekHigh')),
                    '_52_week_low': self._safe_float(av_overview.get('52WeekLow')),
                    '_50_day_moving_avg': self._safe_float(av_overview.get('50DayMovingAverage')),
                    '_200_day_moving_avg': self._safe_float(av_overview.get('200DayMovingAverage')),
                    'shares_outstanding': self._safe_int(av_overview.get('SharesOutstanding'))
                })
            
            if isinstance(fmp_profile, dict):
                financials_data.setdefault('market_cap', self._safe_int(fmp_profile.get('marketCap')))
                financials_data.setdefault('beta', self._safe_float(fmp_profile.get('beta')))
                financials_data.setdefault('pe_ratio', self._safe_float(fmp_profile.get('pe')))
                financials_data.setdefault('eps', self._safe_float(fmp_profile.get('eps')))
                financials_data.setdefault('dividend_yield', self._safe_float(fmp_profile.get('dividendYield')))
                financials_data.setdefault('dividend_per_share', self._safe_float(fmp_profile.get('lastDiv')))
                financials_data.setdefault('shares_outstanding', self._safe_int(fmp_profile.get('sharesOutstanding')))
            
            if isinstance(fmp_quote, dict):
                financials_data.setdefault('_52_week_high', self._safe_float(fmp_quote.get('yearHigh')))
                financials_data.setdefault('_52_week_low', self._safe_float(fmp_quote.get('yearLow')))
                financials_data.setdefault('_50_day_moving_avg', self._safe_float(fmp_quote.get('priceAvg50')))
                financials_data.setdefault('_200_day_moving_avg', self._safe_float(fmp_quote.get('priceAvg200')))
            
            # 3. Estimates data (FMP only)
            estimates_data_list = []
            if isinstance(fmp_estimates, list):
                for est in fmp_estimates:
                    estimates_data_list.append({
                        'asset_id': asset.asset_id,
                        'fiscal_date': self._safe_date_parse(est.get('date')),
                        'revenue_avg': self._safe_int(est.get('revenueAvg')),
                        'revenue_low': self._safe_int(est.get('revenueLow')),
                        'revenue_high': self._safe_int(est.get('revenueHigh')),
                        'revenue_analysts_count': self._safe_int(est.get('numAnalystsRevenue')),
                        'eps_avg': self._safe_float(est.get('epsAvg')),
                        'eps_low': self._safe_float(est.get('epsLow')),
                        'eps_high': self._safe_float(est.get('epsHigh')),
                        'eps_analysts_count': self._safe_int(est.get('numAnalystsEps')),
                        'ebitda_avg': self._safe_int(est.get('ebitdaAvg'))
                    })
            
            # Store data in database
            success = True
            
            if profile_data:
                success &= crud_stock_profile.upsert_stock_profile(db, profile_data)
            
            if financials_data:
                success &= crud_stock_financial.upsert_stock_financials(db, financials_data)
            
            if estimates_data_list:
                for est_data in estimates_data_list:
                    if est_data.get('fiscal_date'):
                        success &= crud_stock_estimate.upsert_stock_estimate(db, est_data)
            
            # Update last collection time
            crud_asset.update_ticker_settings(db, asset.asset_id, {'last_company_info_collection': datetime.now()})
            
            return success
            
        except Exception as e:
            db.rollback()
            self.log_progress(f"Error consolidating stock data: {e}", "error")
            return False
    
    def _safe_int(self, value: Any) -> Optional[int]:
        """Safely convert value to integer"""
        if value is None or value == "None" or value == "N/A" or value == "":
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None
    
    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float"""
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def _safe_date_parse(self, date_str: str) -> Optional[datetime]:
        """Safely parse date string"""
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            return None 