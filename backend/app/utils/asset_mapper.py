"""
Asset Mapping Utility
비어있는 나라명과 asset_id를 JSON 파일을 통해 매핑하는 유틸리티
"""
import json
import os
from typing import Dict, Optional, Tuple
from sqlalchemy.orm import Session
from ..models.asset import WorldAssetsRanking
import logging

logger = logging.getLogger(__name__)


class AssetMapper:
    """자산 매핑 유틸리티 클래스"""
    
    def __init__(self):
        self.mapping_file = os.path.join(os.path.dirname(__file__), 'asset_mapping.json')
        self.mappings = self._load_mappings()
    
    def _load_mappings(self) -> Dict:
        """JSON 매핑 파일 로드"""
        try:
            with open(self.mapping_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.error(f"Mapping file not found: {self.mapping_file}")
            return {"country_mapping": {}, "asset_id_mapping": {}, "country_codes": {}}
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in mapping file: {e}")
            return {"country_mapping": {}, "asset_id_mapping": {}, "country_codes": {}}
    
    def get_country_for_ticker(self, ticker: str) -> Optional[str]:
        """티커에 대한 나라명 반환"""
        return self.mappings.get("country_mapping", {}).get(ticker)
    
    def get_asset_id_for_ticker(self, ticker: str) -> Optional[int]:
        """티커에 대한 asset_id 반환"""
        return self.mappings.get("asset_id_mapping", {}).get(ticker)
    
    def get_asset_type_id_for_ticker(self, ticker: str) -> Optional[int]:
        """티커에 대한 asset_type_id 반환"""
        return self.mappings.get("asset_type_id_mapping", {}).get(ticker)
    
    def get_name_for_ticker(self, ticker: str) -> Optional[str]:
        """티커에 대한 name 반환"""
        return self.mappings.get("name_mapping", {}).get(ticker)
    
    def get_country_code(self, country: str) -> Optional[str]:
        """나라명에 대한 국가 코드 반환"""
        return self.mappings.get("country_codes", {}).get(country)
    
    def update_missing_data(self, db: Session, ranking_date: str = None) -> Dict[str, int]:
        """비어있는 나라명과 asset_id 업데이트"""
        try:
            if not ranking_date:
                from datetime import date
                ranking_date = date.today().isoformat()
            
            # 비어있는 데이터 조회
            from sqlalchemy import or_
            missing_data = db.query(WorldAssetsRanking).filter(
                WorldAssetsRanking.ranking_date == ranking_date,
                or_(
                    WorldAssetsRanking.country.is_(None),
                    WorldAssetsRanking.country == '',
                    WorldAssetsRanking.country == 'Unknown',
                    WorldAssetsRanking.asset_id.is_(None),
                    WorldAssetsRanking.asset_type_id.is_(None),
                    WorldAssetsRanking.name.is_(None),
                    WorldAssetsRanking.name == ''
                )
            ).all()
            
            # 실제 존재하는 asset_id들 조회
            from ..models.asset import Asset
            existing_asset_ids = set()
            existing_assets = db.query(Asset.asset_id).all()
            for asset in existing_assets:
                existing_asset_ids.add(asset.asset_id)
            
            country_updated = 0
            asset_id_updated = 0
            asset_id_skipped = 0
            asset_type_id_updated = 0
            name_updated = 0
            
            for asset in missing_data:
                updated = False
                
                # 나라명 업데이트
                if not asset.country or asset.country == 'Unknown':
                    country = self.get_country_for_ticker(asset.ticker)
                    if country:
                        asset.country = country
                        updated = True
                        country_updated += 1
                
                # asset_id 업데이트 (실제 존재하는 ID만)
                if not asset.asset_id:
                    asset_id = self.get_asset_id_for_ticker(asset.ticker)
                    if asset_id and asset_id in existing_asset_ids:
                        asset.asset_id = asset_id
                        updated = True
                        asset_id_updated += 1
                    elif asset_id and asset_id not in existing_asset_ids:
                        logger.warning(f"Asset ID {asset_id} for ticker {asset.ticker} does not exist in assets table")
                        asset_id_skipped += 1
                
                # asset_type_id 업데이트
                if not asset.asset_type_id:
                    asset_type_id = self.get_asset_type_id_for_ticker(asset.ticker)
                    if asset_type_id:
                        asset.asset_type_id = asset_type_id
                        updated = True
                        asset_type_id_updated += 1
                
                # name 업데이트
                if not asset.name or asset.name == '':
                    name = self.get_name_for_ticker(asset.ticker)
                    if name:
                        asset.name = name
                        updated = True
                        name_updated += 1
                
                if updated:
                    asset.last_updated = db.query(WorldAssetsRanking).filter(
                        WorldAssetsRanking.id == asset.id
                    ).first().last_updated
            
            db.commit()
            
            logger.info(f"Updated {country_updated} countries, {asset_id_updated} asset_ids, {asset_type_id_updated} asset_type_ids, and {name_updated} names for {ranking_date} (skipped {asset_id_skipped} non-existent asset_ids)")
            
            return {
                "country_updated": country_updated,
                "asset_id_updated": asset_id_updated,
                "asset_type_id_updated": asset_type_id_updated,
                "name_updated": name_updated,
                "asset_id_skipped": asset_id_skipped,
                "total_processed": len(missing_data)
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating missing data: {e}")
            raise
    
    def add_mapping(self, ticker: str, country: str = None, asset_id: int = None, asset_type_id: int = None, name: str = None) -> bool:
        """새로운 매핑 추가"""
        try:
            if country:
                self.mappings["country_mapping"][ticker] = country
            
            if asset_id:
                self.mappings["asset_id_mapping"][ticker] = asset_id
            
            if asset_type_id:
                self.mappings["asset_type_id_mapping"][ticker] = asset_type_id
            
            if name:
                self.mappings["name_mapping"][ticker] = name
            
            # 파일에 저장
            with open(self.mapping_file, 'w', encoding='utf-8') as f:
                json.dump(self.mappings, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Added mapping for {ticker}: country={country}, asset_id={asset_id}, asset_type_id={asset_type_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error adding mapping: {e}")
            return False
    
    def get_missing_tickers(self, db: Session, ranking_date: str = None) -> list:
        """매핑이 필요한 티커 목록 반환"""
        try:
            if not ranking_date:
                from datetime import date
                ranking_date = date.today().isoformat()
            
            from sqlalchemy import or_
            missing_data = db.query(WorldAssetsRanking).filter(
                WorldAssetsRanking.ranking_date == ranking_date,
                or_(
                    WorldAssetsRanking.country.is_(None),
                    WorldAssetsRanking.country == '',
                    WorldAssetsRanking.country == 'Unknown',
                    WorldAssetsRanking.asset_id.is_(None),
                    WorldAssetsRanking.asset_type_id.is_(None)
                )
            ).all()
            
            missing_tickers = []
            for asset in missing_data:
                missing_info = {
                    "ticker": asset.ticker,
                    "name": asset.name,
                    "current_country": asset.country,
                    "current_asset_id": asset.asset_id,
                    "current_asset_type_id": asset.asset_type_id,
                    "suggested_country": self.get_country_for_ticker(asset.ticker),
                    "suggested_asset_id": self.get_asset_id_for_ticker(asset.ticker),
                    "suggested_asset_type_id": self.get_asset_type_id_for_ticker(asset.ticker)
                }
                missing_tickers.append(missing_info)
            
            return missing_tickers
            
        except Exception as e:
            logger.error(f"Error getting missing tickers: {e}")
            return []


def update_asset_mappings(db: Session, ranking_date: str = None) -> Dict[str, int]:
    """자산 매핑 업데이트 함수 (편의 함수)"""
    mapper = AssetMapper()
    return mapper.update_missing_data(db, ranking_date)


def get_missing_asset_info(db: Session, ranking_date: str = None) -> list:
    """매핑이 필요한 자산 정보 반환 함수 (편의 함수)"""
    mapper = AssetMapper()
    return mapper.get_missing_tickers(db, ranking_date)
