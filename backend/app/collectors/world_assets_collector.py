"""
World Assets Collector for scraping and storing world assets data from companiesmarketcap.com
"""
import logging
import asyncio
import requests
import pandas as pd
import io
from datetime import datetime, date
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from bs4 import BeautifulSoup
import time
import re

from .base_collector import BaseCollector
from ..models.asset import WorldAssetsRanking, BondMarketData, ScrapingLogs
from ..models.asset import Asset
from ..utils.retry import retry_with_backoff, classify_api_error, TransientAPIError, PermanentAPIError
from ..services.api_strategy_manager import api_manager
from ..core.config_manager import ConfigManager
from ..utils.redis_queue_manager import RedisQueueManager
from ..services.api_strategy_manager import ApiStrategyManager

logger = logging.getLogger(__name__)


class AssetData:
    """Data class for asset information"""
    def __init__(self, rank: int, name: str, ticker: str = None, 
                 market_cap_usd: float = None, price_usd: float = None,
                 daily_change_percent: float = None, country: str = None, 
                 asset_type_id: int = None, asset_id: int = None):
        self.rank = rank
        self.name = name
        self.ticker = ticker
        self.market_cap_usd = market_cap_usd
        self.price_usd = price_usd
        self.daily_change_percent = daily_change_percent
        self.country = country
        self.asset_type_id = asset_type_id
        self.asset_id = asset_id


class WorldAssetsCollector(BaseCollector):
    """세계 자산 데이터 수집 및 처리 서비스"""
    
    def __init__(
        self,
        db: Session,
        config_manager: ConfigManager,
        api_manager: ApiStrategyManager,
        redis_queue_manager: RedisQueueManager,
    ):
        super().__init__(db, config_manager, api_manager, redis_queue_manager)
        self.companies_marketcap_url = "https://companiesmarketcap.com/assets-by-market-cap/"
        self.bis_url = "https://www.bis.org/statistics/totcredit/q_data.csv"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

    async def collect_with_settings(self) -> Dict[str, Any]:
        """Collect world assets data with individual asset settings"""
        try:
            # World assets collection은 전역적으로 실행 (개별 자산 설정 없음)
            # 하지만 향후 개별 설정이 필요할 수 있으므로 구조는 유지
            self.logging_helper.log_info("세계 자산 데이터 수집 시작 (전역 설정)")
            
            result = await self._collect_data()
            
            # BaseCollector에서 사용하는 키로 변환
            if result.get('success'):
                result['total_added_records'] = result.get('assets_updated', 0) + result.get('bonds_updated', 0)
            else:
                result['total_added_records'] = 0
                
            return result
            
        except Exception as e:
            self.logging_helper.log_error(f"World assets collection with settings failed: {e}")
            raise
    
    async def _collect_data(self) -> Dict[str, Any]:
        """Main collection method - collects and stores world assets data"""
        start_time = datetime.now()
        scraping_log = None
        
        try:
            self.logging_helper.log_info("Starting world assets data collection process")
            
            # 스크래핑 로그 시작
            scraping_log = self._create_scraping_log("world_assets_ranking", "running")
            
            # 1. 자산 데이터 수집
            assets_data = await self.scrape_companies_marketcap()
            
            # 2. 채권 시장 데이터 수집 (temporarily disabled due to 404 errors)
            # bond_data = await self.get_bis_bond_data()
            
            # 3. 데이터베이스 업데이트
            assets_updated = self._update_assets_database(assets_data)
            
            # if bond_data:
            #     bonds_updated = self._update_bond_market_database(bond_data)
            # else:
            bonds_updated = 0
            
            # 스크래핑 로그 완료
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            self._update_scraping_log(scraping_log, "success", assets_updated + bonds_updated, assets_updated + bonds_updated, None, execution_time)
            
            return {
                'success': True,
                'assets_updated': assets_updated,
                'bonds_updated': bonds_updated,
                'total_added_records': assets_updated + bonds_updated,  # 스케줄러 로그용
                'message': f"Successfully updated {assets_updated} assets and {bonds_updated} bond records"
            }
            
        except Exception as e:
            # 스크래핑 로그 실패
            if scraping_log:
                end_time = datetime.now()
                execution_time = (end_time - start_time).total_seconds()
                self._update_scraping_log(scraping_log, "failed", 0, 0, str(e), execution_time)
            
            self.logging_helper.log_error(f"World assets collection failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'total_added_records': 0  # 스케줄러 로그용
            }

    async def scrape_companies_marketcap(self) -> List[AssetData]:
        """companiesmarketcap.com에서 자산 순위 데이터를 크롤링"""
        all_assets = []
        
        try:
            self.logging_helper.log_info("Scraping main page from companiesmarketcap.com")
            
            # HTML 응답을 위한 별도 처리
            import requests
            response = requests.get(self.companies_marketcap_url, headers=self.headers, timeout=30)
            response.raise_for_status()
                
            soup = BeautifulSoup(response.content, 'html.parser')
            table = soup.find('table')
                
            if not table:
                self.logging_helper.log_warning("No table found on main page")
                return all_assets
            
            rows = table.find_all('tr')[1:]  # 헤더 제외
            
            for row in rows:
                try:
                    asset_data = self._parse_asset_row(row, len(all_assets) + 1)
                    if asset_data:
                        all_assets.append(asset_data)
                except Exception as e:
                    self.logging_helper.log_error(f"Error parsing row: {e}")
                    continue
                
        except Exception as e:
            self.logging_helper.log_error(f"Error scraping companiesmarketcap.com: {e}")
            raise
        
        self.logging_helper.log_info(f"Successfully scraped {len(all_assets)} assets from main page")
        return all_assets
    
    def _parse_asset_row(self, row, rank: int) -> Optional[AssetData]:
        """개별 자산 행을 파싱"""
        try:
            cells = row.find_all('td')
            if len(cells) < 4:
                return None
            
            # 실제 테이블 구조에 맞는 컬럼 인덱스
            # 0: Rank, 1: Name, 2: Market Cap, 3: Price, 4: Today (변동률), 5: Price (30d), 6: Country
            name_cell = cells[1] if len(cells) > 1 else None
            market_cap_cell = cells[2] if len(cells) > 2 else None
            price_cell = cells[3] if len(cells) > 3 else None
            change_cell = cells[4] if len(cells) > 4 else None
            country_cell = cells[6] if len(cells) > 6 else None
            
            # 이름과 티커 추출 (Name 컬럼에서 분리)
            name = ""
            ticker = ""
            if name_cell:
                # 회사명 추출
                company_name_div = name_cell.find('div', class_='company-name')
                if company_name_div:
                    name = company_name_div.get_text(strip=True)
                
                # 티커 추출
                company_code_div = name_cell.find('div', class_='company-code')
                if company_code_div:
                    ticker = company_code_div.get_text(strip=True)
            
            # 시가총액 파싱
            market_cap_str = market_cap_cell.get_text(strip=True) if market_cap_cell else ""
            market_cap_usd = self._parse_market_cap(market_cap_str)
            
            # 가격 파싱
            price_str = price_cell.get_text(strip=True) if price_cell else ""
            price_usd = self._parse_price(price_str)
            
            # 변동률 파싱
            change_str = change_cell.get_text(strip=True) if change_cell else ""
            daily_change_percent = self._parse_change_percent(change_str)
                        
            # 국가 추출
            country = country_cell.get_text(strip=True) if country_cell else "Unknown"
            
            # 카테고리 분류
            category = self._classify_asset(name, ticker)
            
            # 기존 DB와 조인하여 풍부한 정보 획득
            enriched_data = self._enrich_asset_data(name, ticker)
            
            return AssetData(
                rank=rank,
                name=name,
                ticker=ticker,
                market_cap_usd=market_cap_usd,
                price_usd=price_usd,
                daily_change_percent=daily_change_percent,
                country=country if country != "Unknown" else enriched_data.get('country', 'Unknown'),
                asset_type_id=enriched_data.get('asset_type_id'),
                asset_id=enriched_data.get('asset_id')
            )
                        
        except Exception as e:
            self.logging_helper.log_error(f"Error parsing asset row: {e}")
            return None

    def _parse_market_cap(self, market_cap_str: str) -> Optional[float]:
        """시가총액 문자열을 숫자로 파싱"""
        try:
            if not market_cap_str:
                return None
            
            # "T" (조), "B" (십억), "M" (백만) 단위 처리
            market_cap_str = market_cap_str.replace('$', '').replace(',', '')
            
            if 'T' in market_cap_str:
                value = float(market_cap_str.replace('T', '')) * 1e12
            elif 'B' in market_cap_str:
                value = float(market_cap_str.replace('B', '')) * 1e9
            elif 'M' in market_cap_str:
                value = float(market_cap_str.replace('M', '')) * 1e6
            else:
                value = float(market_cap_str)
            
            return value
        except Exception as e:
            self.logging_helper.log_error(f"Error parsing market cap '{market_cap_str}': {e}")
            return None
    
    def _parse_price(self, price_str: str) -> Optional[float]:
        """가격 문자열을 숫자로 파싱"""
        try:
            if not price_str:
                return None
            
            price_str = price_str.replace('$', '').replace(',', '')
            return float(price_str)
        except Exception as e:
            self.logging_helper.log_error(f"Error parsing price '{price_str}': {e}")
            return None

    def _parse_change_percent(self, change_str: str) -> Optional[float]:
        """변동률 문자열을 숫자로 파싱"""
        try:
            if not change_str:
                return None
            
            change_str = change_str.replace('%', '').replace(',', '')
            return float(change_str)
        except Exception as e:
            self.logging_helper.log_error(f"Error parsing change percent '{change_str}': {e}")
            return None
    
    def _classify_asset(self, name: str, ticker: str) -> str:
        """자산을 카테고리별로 분류"""
        name_lower = name.lower()
        ticker_lower = ticker.lower()
        
        # 암호화폐 분류
        crypto_keywords = ['bitcoin', 'ethereum', 'crypto', 'token', 'coin']
        if any(keyword in name_lower for keyword in crypto_keywords):
            return 'Crypto'
        
        # ETF 분류
        etf_keywords = ['etf', 'fund', 'trust']
        if any(keyword in name_lower for keyword in etf_keywords):
            return 'ETF'
        
        # 채권 분류
        bond_keywords = ['bond', 'treasury', 'government']
        if any(keyword in name_lower for keyword in bond_keywords):
            return 'Bonds'
        
        # 기본적으로 주식으로 분류
        return 'Stocks'
    
    def _enrich_asset_data(self, name: str, ticker: str) -> Dict[str, Any]:
        """기존 DB와 조인하여 풍부한 정보 획득"""
        try:
            db = self.db
            
            # StockProfile 모델 import
            from ..models.asset import StockProfile
            
            # 티커 매핑 테이블 (웹사이트 티커 -> DB 티커)
            ticker_mapping = {
                'GOLD': 'GCUSD',
                'SILVER': 'SIUSD', 
                'BTC': 'BTCUSDT',
                'ETH': 'ETHUSDT',
                'XRP': 'XRPUSDT',
                'DOGE': 'DOGEUSDT',
                'ADA': 'ADAUSDT',
                'BCH': 'BCHUSDT',
                'LTC': 'LTCUSDT',
                'DOT': 'DOTUSDT'
            }
            
            # 매핑된 티커로 검색
            mapped_ticker = ticker_mapping.get(ticker, ticker)
            
            # 1. 정확한 티커 매칭
            db_asset = db.query(Asset).filter(
                Asset.ticker == mapped_ticker
            ).first()
            
            if not db_asset:
                # 2. 원본 티커로 검색
                db_asset = db.query(Asset).filter(
                    Asset.ticker == ticker
                ).first()
            
            if not db_asset:
                # 3. 이름으로 부분 매칭 (더 정확한 매칭)
                name_lower = name.lower()
                db_asset = db.query(Asset).filter(
                    Asset.name.ilike(f"%{name_lower}%")
                ).first()
                
                if not db_asset:
                    # 4. 이름에서 주요 키워드로 검색
                    name_keywords = name_lower.split()
                    for keyword in name_keywords:
                        if len(keyword) > 2:  # 2글자 이상 키워드만
                            db_asset = db.query(Asset).filter(
                                Asset.name.ilike(f"%{keyword}%")
                            ).first()
                            if db_asset:
                                break
            
            if db_asset:
                # StockProfile에서 country 정보 가져오기
                stock_profile = db.query(StockProfile).filter(
                    StockProfile.asset_id == db_asset.asset_id
                ).first()
                
                country = stock_profile.country if stock_profile else 'Unknown'
                
                self.logging_helper.log_info(f"Matched {name} ({ticker}) -> {db_asset.name} ({db_asset.ticker})")
                return {
                    'country': country,
                    'asset_type_id': db_asset.asset_type_id,
                    'asset_id': db_asset.asset_id
                }
            
            self.logging_helper.log_warning(f"No match found for {name} ({ticker})")
            return {
                'country': 'Unknown',
                'asset_type_id': None,
                'asset_id': None
            }
            
        except Exception as e:
            self.logging_helper.log_error(f"Error enriching asset data: {e}")
            return {
                'country': 'Unknown',
                'asset_type_id': None,
                'asset_id': None
            }
    
    def _determine_sector_from_asset_type(self, asset_type_id: int) -> str:
        """Asset Type ID로부터 섹터 결정"""
        sector_mapping = {
            1: 'Indices',
            2: 'Stocks',
            3: 'Commodities',
            4: 'Currencies',
            5: 'ETFs',
            6: 'Bonds',
            7: 'Funds',
            8: 'Crypto'
        }
        return sector_mapping.get(asset_type_id, 'Unknown')
    
    # BIS bond data collection temporarily disabled due to 404 errors
    # async def get_bis_bond_data(self) -> Optional[Dict[str, Any]]:
    #     """BIS에서 글로벌 채권 시장 규모 데이터 수집"""
    #     try:
    #         self.logging_helper.log_info("Fetching BIS bond market data")
    #         
    #         response = requests.get(self.bis_url, headers=self.headers, timeout=30)
    #         if response.status_code == 404:
    #             self.logging_helper.log_warning("BIS URL not found (404), skipping bond data collection")
    #             return None
    #         response.raise_for_status()
    #         
    #         # CSV 데이터 파싱
    #         df = pd.read_csv(io.StringIO(response.text), header=4)
    #         
    #         # "Total debt securities" 행 찾기
    #         total_row = df[df['Title'].str.contains('Total debt securities', na=False)]
    #         
    #         if total_row.empty:
    #             self.logging_helper.log_warning("No total debt securities data found in BIS CSV")
    #             return None
    #         
    #         # 최신 분기 데이터 가져오기
    #         latest_value = total_row.iloc[:, -1].iloc[0]
    #         latest_quarter = total_row.columns[-1]
    #         
    #         # 십억 단위를 달러로 변환 (BIS 데이터는 십억 단위)
    #         market_size_usd = float(latest_value) * 1e9
    #         
    #         return {
    #             'market_size_usd': market_size_usd,
    #             'quarter': latest_quarter,
    #             'data_source': 'BIS'
    #         }
    #         
    #     except Exception as e:
    #         self.logging_helper.log_error(f"Error fetching BIS bond data: {e}")
    #         return None

    def _update_assets_database(self, assets_data: List[AssetData]) -> int:
        """자산 데이터 DB 업데이트 - 히스토리 데이터 보존"""
        try:
            db = self.db
            today = datetime.now().date()
            
            # 오늘 데이터가 이미 있는지 확인
            existing_today_data = db.query(WorldAssetsRanking).filter(
                WorldAssetsRanking.ranking_date == today
            ).count()
            
            if existing_today_data > 0:
                self.logging_helper.log_warning(f"Today's data already exists ({existing_today_data} records). Skipping insertion.")
                return existing_today_data
            
            # 새 데이터 삽입 (히스토리 보존)
            inserted_count = 0
            for asset in assets_data:
                db_asset = WorldAssetsRanking(
                    rank=asset.rank,
                    name=asset.name,
                    ticker=asset.ticker,
                    market_cap_usd=asset.market_cap_usd,
                    price_usd=asset.price_usd,
                    daily_change_percent=asset.daily_change_percent,
                    country=asset.country,
                    asset_type_id=asset.asset_type_id,
                    asset_id=asset.asset_id,
                    ranking_date=today,
                    data_source='companiesmarketcap'
                )
                db.add(db_asset)
                inserted_count += 1
            
            db.commit()
            self.logging_helper.log_info(f"Successfully inserted {inserted_count} new assets for {today}")
            return inserted_count
            
        except Exception as e:
            db.rollback()
            self.logging_helper.log_error(f"Error updating assets database: {e}")
            raise
    
    def _update_bond_market_database(self, bond_data: Dict[str, Any]) -> int:
        """채권 시장 데이터 DB 업데이트"""
        try:
            db = self.db
            today = datetime.now().date()
            
            # 기존 오늘 데이터 삭제
            db.query(BondMarketData).filter(
                BondMarketData.collection_date == today
            ).delete()
            
            # 새 데이터 삽입
            db_bond = BondMarketData(
                category='Global Bond Market',
                market_size_usd=bond_data['market_size_usd'],
                quarter=bond_data['quarter'],
                data_source=bond_data['data_source'],
                collection_date=today
            )
            db.add(db_bond)
            
            db.commit()
            self.logging_helper.log_info("Successfully updated bond market data in database")
            return 1
            
        except Exception as e:
            db.rollback()
            self.logging_helper.log_error(f"Error updating bond market database: {e}")
            raise

    def _create_scraping_log(self, source: str, status: str) -> ScrapingLogs:
        """스크래핑 로그 생성"""
        try:
            db = self.db
            scraping_log = ScrapingLogs(
                source=source,
                status=status,
                started_at=datetime.now()
            )
            db.add(scraping_log)
            db.commit()
            return scraping_log
        except Exception as e:
            self.logging_helper.log_error(f"Error creating scraping log: {e}")
            return None

    def _update_scraping_log(self, scraping_log: ScrapingLogs, status: str, 
                           records_processed: int, records_successful: int, 
                           error_message: str = None, execution_time: float = None):
        """스크래핑 로그 업데이트"""
        try:
            if not scraping_log:
                return
                
            db = self.db
            scraping_log.status = status
            scraping_log.records_processed = records_processed
            scraping_log.records_successful = records_successful
            scraping_log.error_message = error_message
            scraping_log.execution_time_seconds = execution_time
            scraping_log.completed_at = datetime.now()
            
            db.commit()
            self.logging_helper.log_info(f"Scraping log updated: {status}, {records_successful} records processed")
            
        except Exception as e:
            self.logging_helper.log_error(f"Error updating scraping log: {e}") 