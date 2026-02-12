import json
import os
import logging
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.asset import Asset
from app.core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)

class AssetIdentityService:
    _instance = None
    _mapping_data = None
    
    ASSET_TYPE_MAP = {
        8: "crypto",
        2: "stocks",
        5: "etf",
        6: "commodity", 
        3: "commodity", # Precious metals are often type 3
        7: "general", # Index or other
        # Add other types as needed
    }

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AssetIdentityService, cls).__new__(cls)
            cls._instance._load_mapping()
        return cls._instance

    def _load_mapping(self):
        """Load asset mapping from JSON file"""
        try:
            mapping_path = os.path.join(os.getcwd(), 'backend/app/utils/asset_mapping.json')
            if os.path.exists(mapping_path):
                with open(mapping_path, 'r', encoding='utf-8') as f:
                    self._mapping_data = json.load(f)
            else:
                logger.warning(f"Asset mapping file not found at {mapping_path}")
                self._mapping_data = {}
        except Exception as e:
            logger.error(f"Failed to load asset mapping: {e}")
            self._mapping_data = {}

    def identify_asset(self, db: Session, ticker: str) -> Dict[str, Any]:
        """
        Identify asset by ticker.
        Returns:
            {
                "is_valid": bool,
                "asset_type_category": str, # crypto, stocks, etf, commodity, general
                "name": str,
                "normalized_ticker": str,
                "asset_type_id": int
            }
        """
        ticker_upper = ticker.upper().strip()
        
        # 1. Try Direct DB Lookup
        asset = db.query(Asset).filter(Asset.ticker == ticker_upper).first()
        
        if asset:
            return self._format_response(
                valid=True,
                ticker=asset.ticker,
                name=asset.name,
                type_id=asset.asset_type_id
            )

        # 2. Check JSON Mapping (Forward resolution)
        # Check asset_type_id_mapping
        type_mapping = self._mapping_data.get('asset_type_id_mapping', {})
        name_mapping = self._mapping_data.get('name_mapping', {})
        
        if ticker_upper in type_mapping:
            type_id = type_mapping[ticker_upper]
            name = name_mapping.get(ticker_upper, ticker_upper)
            
            # Check if this aliases to a DB asset (optional, but good for completeness)
            # For example if BTC -> type 8, maybe we can assume it's valid even without DB entry
            # Or we could try to find a DB entry that matches the 'name' roughly? 
            # For now, trust the mapping.
            return self._format_response(
                valid=True,
                ticker=ticker_upper,  # Keep the alias if found in mapping
                name=name,
                type_id=type_id
            )

        # 3. Heuristics / Normalization Fallbacks
        # e.g., BTC -> BTCUSDT (Common in this app)
        if not ticker_upper.endswith("USDT") and not ticker_upper.endswith("USD"):
             # Try appending USDT for crypto check
             crypto_try = f"{ticker_upper}USDT"
             asset = db.query(Asset).filter(Asset.ticker == crypto_try).first()
             if asset:
                 return self._format_response(
                     valid=True,
                     ticker=asset.ticker, # Return normalized ticker
                     name=asset.name,
                     type_id=asset.asset_type_id
                 )

        # 4. If all fails
        return {
            "is_valid": False,
            "asset_type_category": "general",
            "name": ticker,
            "normalized_ticker": ticker,
            "asset_type_id": None
        }

    def _format_response(self, valid: bool, ticker: str, name: str, type_id: int) -> Dict[str, Any]:
        category = self.ASSET_TYPE_MAP.get(type_id, "general")
        return {
            "is_valid": valid,
            "asset_type_category": category,
            "name": name,
            "normalized_ticker": ticker,
            "asset_type_id": type_id
        }

# Global instance
asset_identity_service = AssetIdentityService()
