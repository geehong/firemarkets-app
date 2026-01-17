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
        self.companies_marketcap_etfs_url = "https://companiesmarketcap.com/etfs/largest-etfs-by-marketcap/"
        self.eight_marketcap_url = "https://8marketcap.com/companies/"
        self.eight_marketcap_etfs_url = "https://8marketcap.com/etfs/"
        self.eight_marketcap_cryptos_url = "https://8marketcap.com/cryptos/"
        self.eight_marketcap_metals_url = "https://8marketcap.com/metals/"
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
            
            # 1. 자산 데이터 수집 (companiesmarketcap.com)
            companies_data = await self.scrape_companies_marketcap()
            
            # 1-2. ETFs 데이터 수집 (companiesmarketcap.com)
            companies_etfs_data = await self.scrape_companies_marketcap_etfs()
            
            # 2. 8marketcap.com 데이터 수집 (Companies)
            eight_marketcap_data = await self.scrape_eight_marketcap()
            
            # 3. 8marketcap.com ETFs 데이터 수집
            eight_marketcap_etfs_data = await self.scrape_eight_marketcap_etfs()
            
            # 4. 8marketcap.com Cryptos 데이터 수집
            eight_marketcap_cryptos_data = await self.scrape_eight_marketcap_cryptos()
            
            # 5. 8marketcap.com Metals 데이터 수집
            eight_marketcap_metals_data = await self.scrape_eight_marketcap_metals()
            
            # 6. 각 데이터 소스별로 큐에 전송 (표준 패턴 적용)
            self.logging_helper.log_info(f"Data collection summary:")
            self.logging_helper.log_info(f"  - CompaniesMarketCap: {len(companies_data)} assets")
            self.logging_helper.log_info(f"  - CompaniesMarketCap ETFs: {len(companies_etfs_data)} assets")
            self.logging_helper.log_info(f"  - 8MarketCap Companies: {len(eight_marketcap_data)} assets")
            self.logging_helper.log_info(f"  - 8MarketCap ETFs: {len(eight_marketcap_etfs_data)} assets")
            self.logging_helper.log_info(f"  - 8MarketCap Cryptos: {len(eight_marketcap_cryptos_data)} assets")
            self.logging_helper.log_info(f"  - 8MarketCap Metals: {len(eight_marketcap_metals_data)} assets")
            
            companies_updated = await self._send_to_queue(companies_data, 'companiesmarketcap')
            companies_etfs_updated = await self._send_to_queue(companies_etfs_data, 'companiesmarketcap_etfs')
            eight_marketcap_updated = await self._send_to_queue(eight_marketcap_data, '8marketcap_companies')
            eight_marketcap_etfs_updated = await self._send_to_queue(eight_marketcap_etfs_data, '8marketcap_etfs')
            eight_marketcap_cryptos_updated = await self._send_to_queue(eight_marketcap_cryptos_data, '8marketcap_cryptos')
            eight_marketcap_metals_updated = await self._send_to_queue(eight_marketcap_metals_data, '8marketcap_metals')
            
            self.logging_helper.log_info(f"Queue processing summary:")
            self.logging_helper.log_info(f"  - CompaniesMarketCap: {companies_updated} items sent to queue")
            self.logging_helper.log_info(f"  - CompaniesMarketCap ETFs: {companies_etfs_updated} items sent to queue")
            self.logging_helper.log_info(f"  - 8MarketCap Companies: {eight_marketcap_updated} items sent to queue")
            self.logging_helper.log_info(f"  - 8MarketCap ETFs: {eight_marketcap_etfs_updated} items sent to queue")
            self.logging_helper.log_info(f"  - 8MarketCap Cryptos: {eight_marketcap_cryptos_updated} items sent to queue")
            self.logging_helper.log_info(f"  - 8MarketCap Metals: {eight_marketcap_metals_updated} items sent to queue")
            
            # 4. 채권 시장 데이터 수집 (temporarily disabled due to 404 errors)
            # bond_data = await self.get_bis_bond_data()
            
            # 7. 총 업데이트 수 계산
            assets_updated = (companies_updated + companies_etfs_updated + eight_marketcap_updated + 
                            eight_marketcap_etfs_updated + eight_marketcap_cryptos_updated + 
                            eight_marketcap_metals_updated)
            
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
    
    async def scrape_companies_marketcap_etfs(self) -> List[AssetData]:
        """companiesmarketcap.com/etfs/ 에서 ETF 순위 데이터를 크롤링"""
        all_assets = []
        
        try:
            self.logging_helper.log_info("Scraping ETFs page from companiesmarketcap.com")
            
            response = requests.get(self.companies_marketcap_etfs_url, headers=self.headers, timeout=30)
            response.raise_for_status()
                
            soup = BeautifulSoup(response.content, 'html.parser')
            table = soup.find('table')
                
            if not table:
                self.logging_helper.log_warning("No table found on ETFs page")
                return all_assets
            
            rows = table.find_all('tr')[1:]  # 헤더 제외
            
            for row in rows:
                try:
                    asset_data = self._parse_asset_row(row, len(all_assets) + 1)
                    if asset_data:
                        # ETF 타입으로 강제 설정
                        asset_data.asset_type_id = 5
                        all_assets.append(asset_data)
                except Exception as e:
                    self.logging_helper.log_error(f"Error parsing ETF row: {e}")
                    continue
                
        except Exception as e:
            self.logging_helper.log_error(f"Error scraping companiesmarketcap.com ETFs: {e}")
            # ETF 실패해도 전체 프로세스는 계속 진행
            return []
        
        self.logging_helper.log_info(f"Successfully scraped {len(all_assets)} ETFs from companiesmarketcap.com")
        return all_assets
    
    async def scrape_eight_marketcap(self) -> List[AssetData]:
        """8marketcap.com에서 자산 순위 데이터를 크롤링"""
        all_assets = []
        
        try:
            self.logging_helper.log_info("Scraping data from 8marketcap.com/companies/")
            
            # HTML 응답을 위한 별도 처리
            import requests
            response = requests.get(self.eight_marketcap_url, headers=self.headers, timeout=30)
            if not response or response.status_code != 200:
                self.logging_helper.log_warning(f"No valid response from 8marketcap Companies URL (status: {response.status_code if response else 'None'})")
                return []
            response.raise_for_status()
                
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 8marketcap.com의 테이블 구조 찾기
            table = soup.find('table')
            if not table:
                # 다른 가능한 테이블 선택자들 시도
                table = soup.find('div', class_='table-responsive')
                if table:
                    table = table.find('table')
                
            if not table:
                self.logging_helper.log_warning("No table found on 8marketcap.com page")
                return all_assets
            
            rows = table.find_all('tr')[1:]  # 헤더 제외
            
            for row in rows:
                try:
                    asset_data = self._parse_eight_marketcap_row(row, len(all_assets) + 1)
                    if asset_data:
                        all_assets.append(asset_data)
                except Exception as e:
                    self.logging_helper.log_error(f"Error parsing 8marketcap row: {e}")
                    continue
                
        except Exception as e:
            self.logging_helper.log_error(f"Error scraping 8marketcap.com: {e}")
            # 8marketcap 실패해도 전체 프로세스는 계속 진행
            return []
        
        self.logging_helper.log_info(f"Successfully scraped {len(all_assets)} assets from 8marketcap.com")
        return all_assets
    
    def _parse_eight_marketcap_row(self, row, rank: int) -> Optional[AssetData]:
        """8marketcap.com의 개별 자산 행을 파싱"""
        try:
            cells = row.find_all('td')
            if len(cells) < 6:
                return None
            
            # 8marketcap.com 테이블 구조: fav, #, Name, Symbol, Market Cap, Price, 24h, 7d, Price (30 days)
            # 0: fav, 1: #, 2: Name, 3: Symbol, 4: Market Cap, 5: Price, 6: 24h, 7: 7d, 8: Price (30 days)
            rank_cell = cells[1] if len(cells) > 1 else None
            name_cell = cells[2] if len(cells) > 2 else None
            symbol_cell = cells[3] if len(cells) > 3 else None
            market_cap_cell = cells[4] if len(cells) > 4 else None
            price_cell = cells[5] if len(cells) > 5 else None
            change_cell = cells[6] if len(cells) > 6 else None
            
            # 순위 추출 (실제 순위 사용)
            actual_rank = rank
            if rank_cell:
                try:
                    actual_rank = int(rank_cell.get_text(strip=True))
                except:
                    actual_rank = rank
            
            # 이름 추출
            name = ""
            if name_cell:
                # company-name 클래스를 가진 div에서 이름 추출
                company_name_div = name_cell.find('div', class_='company-name')
                if company_name_div:
                    name = company_name_div.get_text(strip=True)
                else:
                    # fallback: 전체 텍스트에서 추출
                    name = name_cell.get_text(strip=True)
            
            # 심볼 추출
            ticker = ""
            if symbol_cell:
                # badge 클래스를 가진 span에서 추출
                badge_span = symbol_cell.find('span', class_='badge')
                if badge_span:
                    ticker = badge_span.get_text(strip=True)
                else:
                    ticker = symbol_cell.get_text(strip=True)
            
            # 시가총액 파싱
            market_cap_str = market_cap_cell.get_text(strip=True) if market_cap_cell else ""
            market_cap_usd = self._parse_market_cap(market_cap_str)
            
            # 가격 파싱
            price_str = price_cell.get_text(strip=True) if price_cell else ""
            price_usd = self._parse_price(price_str)
            
            # 변동률 파싱 (24h)
            change_str = change_cell.get_text(strip=True) if change_cell else ""
            daily_change_percent = self._parse_change_percent(change_str)
            
            # 카테고리 분류
            category = self._classify_asset(name, ticker)
            
            # 기존 DB와 조인하여 풍부한 정보 획득
            enriched_data = self._enrich_asset_data(name, ticker)
            
            return AssetData(
                rank=actual_rank,
                name=name,
                ticker=ticker,
                market_cap_usd=market_cap_usd,
                price_usd=price_usd,
                daily_change_percent=daily_change_percent,
                country=enriched_data.get('country', 'Unknown'),
                asset_type_id=enriched_data.get('asset_type_id'),
                asset_id=enriched_data.get('asset_id')
            )
                        
        except Exception as e:
            self.logging_helper.log_error(f"Error parsing 8marketcap row: {e}")
            return None
    
    def _parse_asset_row(self, row, rank: int) -> Optional[AssetData]:
        """개별 자산 행을 파싱"""
        try:
            cells = row.find_all('td')
            if len(cells) < 4:
                return None
            
            # 8marketcap이나 companiesmarketcap 일부 페이지에는 첫 번째 컬럼에 'fav' 아이콘이 있음
            # 이를 감지하여 인덱스를 조정
            start_idx = 0
            if cells[0].get('class') and 'fav' in cells[0].get('class'):
                start_idx = 1
            
            # 실제 테이블 구조에 맞는 컬럼 인덱스
            # 0: Rank, 1: Name, 2: Market Cap, 3: Price, 4: Today (변동률), 5: Price (30d), 6: Country
            name_idx = start_idx + 1
            mcap_idx = start_idx + 2
            price_idx = start_idx + 3
            change_idx = start_idx + 4
            
            name_cell = cells[name_idx] if len(cells) > name_idx else None
            market_cap_cell = cells[mcap_idx] if len(cells) > mcap_idx else None
            price_cell = cells[price_idx] if len(cells) > price_idx else None
            change_cell = cells[change_idx] if len(cells) > change_idx else None
            
            # 국가 정보는 보통 뒤쪽에 위치 (최대한 찾아봄)
            country_cell = None
            if len(cells) > start_idx + 6:
                country_cell = cells[len(cells)-1] # 보통 마지막 컬럼
            
            # 이름과 티커 추출 (Name 컬럼에서 분리)
            name = ""
            ticker = ""
            if name_cell:
                # 회사명 추출
                company_name_div = name_cell.find('div', class_='company-name')
                if company_name_div:
                    name = company_name_div.get_text(strip=True)
                else:
                    # fallback (단순 텍스트인 경우)
                    name_text = name_cell.get_text(strip=True)
                    # 만약 티커가 이름 뒤에 붙어있다면 분리 시도
                    if ' ' in name_text:
                        name = name_text

                
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
            if not change_str or change_str.strip() == '':
                return None
            
            # N/A 값 처리
            if change_str.upper() in ['N/A', 'NA', '-', '--', 'N/A%']:
                return None
            
            # 숫자가 아닌 문자 제거 (단, 마이너스와 소수점은 제외)
            # 때때로 가격($123.45)이 이 필드에 들어오는 경우를 방지하기 위해 정규식 사용
            clean_str = re.sub(r'[^\d\.\-]', '', change_str.replace(',', ''))
            
            if not clean_str or clean_str == '.':
                return None
                
            value = float(clean_str)
            
            # 합리적인 범위 체크 (일반적인 주식/암호화폐 변동률 범위)
            # 극단적인 값은 사이트 오류로 간주하고 NULL 처리
            if value > 1000 or value < -1000:  # ±1000% 이상은 NULL 처리
                self.logging_helper.log_warning(f"Extreme change percent value {value}% treated as NULL (likely site error or wrong column)")
                return None
            
            return value
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
            if not name.strip() and not ticker.strip():
                return {
                    'country': 'Unknown',
                    'asset_type_id': 2,
                    'asset_id': None
                }

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
                'DOT': 'DOTUSDT',
                'SOL': 'SOLUSDT',
                'MATIC': 'MATICUSDT',
                'AVAX': 'AVAXUSDT',
                'LINK': 'LINKUSDT',
                'UNI': 'UNIUSDT',
                'ATOM': 'ATOMUSDT',
                'FTM': 'FTMUSDT',
                'NEAR': 'NEARUSDT',
                'ALGO': 'ALGOUSDT',
                'VET': 'VETUSDT'
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
            
            # 매핑 실패 시 이름과 티커 기반으로 기본 asset_type_id 추정
            default_asset_type_id = self._estimate_asset_type_from_name_ticker(name, ticker)
            
            self.logging_helper.log_warning(f"No match found for {name} ({ticker}), using default asset_type_id: {default_asset_type_id}")
            return {
                'country': 'Unknown',
                'asset_type_id': default_asset_type_id,
                'asset_id': None
            }
            
        except Exception as e:
            self.logging_helper.log_error(f"Error enriching asset data: {e}")
            # 예외 발생 시에도 기본 asset_type_id 추정
            default_asset_type_id = self._estimate_asset_type_from_name_ticker(name, ticker)
            return {
                'country': 'Unknown',
                'asset_type_id': default_asset_type_id,
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
    
    def _estimate_asset_type_from_name_ticker(self, name: str, ticker: str) -> int:
        """이름과 티커를 기반으로 asset_type_id 추정"""
        name_lower = name.lower()
        ticker_lower = ticker.lower()
        
        # 암호화폐 키워드
        crypto_keywords = ['bitcoin', 'ethereum', 'crypto', 'token', 'coin', 'btc', 'eth', 'xrp', 'doge', 'ada', 'bch', 'ltc', 'dot', 'sol', 'matic', 'avax', 'link', 'uni', 'atom', 'ftm', 'near', 'algo', 'vet']
        if any(keyword in name_lower or keyword in ticker_lower for keyword in crypto_keywords):
            return 8  # Crypto
        
        # ETF 키워드
        etf_keywords = ['etf', 'fund', 'trust', 'spdr', 'ishares', 'vanguard', 'invesco']
        if any(keyword in name_lower for keyword in etf_keywords):
            return 5  # ETFs
        
        # 상품 키워드
        commodity_keywords = ['gold', 'silver', 'oil', 'gas', 'copper', 'platinum', 'palladium', 'wheat', 'corn', 'soybean']
        if any(keyword in name_lower or keyword in ticker_lower for keyword in commodity_keywords):
            return 3  # Commodities
        
        # 채권 키워드
        bond_keywords = ['bond', 'treasury', 'government', 'corporate', 'municipal']
        if any(keyword in name_lower for keyword in bond_keywords):
            return 6  # Bonds
        
        # 기본적으로 주식으로 분류
        return 2  # Stocks
    
    
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

    async def _send_to_queue(self, assets_data: List[AssetData], data_source: str) -> int:
        """자산 데이터를 큐에 전송 (표준 패턴 적용)"""
        try:
            if not assets_data:
                return 0
                
            # AssetData 객체를 딕셔너리로 변환하면서 asset_id 자동 매핑
            items = []
            for asset in assets_data:
                # USDC, USDT 제외
                if asset.ticker in ['USDC', 'USDT']:
                    self.logging_helper.log_debug(f"Excluding {asset.ticker} from world assets ranking")
                    continue
                    
                # asset_id가 없으면 assets 테이블에서 찾기
                asset_id = asset.asset_id
                if not asset_id and asset.ticker and asset.asset_type_id:
                    try:
                        existing_asset = self.db.query(Asset).filter(
                            Asset.ticker == asset.ticker,
                            Asset.asset_type_id == asset.asset_type_id
                        ).first()
                        if existing_asset:
                            asset_id = existing_asset.asset_id
                            self.logging_helper.log_debug(f"Found asset_id {asset_id} for ticker {asset.ticker}")
                    except Exception as e:
                        self.logging_helper.log_error(f"Error looking up asset_id for {asset.ticker}: {e}")
                
                item = {
                    'rank': asset.rank,
                    'name': asset.name,
                    'ticker': asset.ticker,
                    'market_cap_usd': asset.market_cap_usd,
                    'price_usd': asset.price_usd,
                    'daily_change_percent': asset.daily_change_percent,
                    'country': asset.country,
                    'asset_type_id': asset.asset_type_id,
                    'asset_id': asset_id
                }
                items.append(item)
            
            # 큐에 전송
            payload = {
                "items": items,
                "metadata": {
                    "data_source": data_source,
                    "collection_date": datetime.now().isoformat()
                }
            }
            
            await self.redis_queue_manager.push_batch_task("world_assets_ranking", payload)
            self.logging_helper.log_info(f"World assets data sent to queue: {len(items)} items from {data_source}")
            
            return len(items)
            
        except Exception as e:
            self.logging_helper.log_error(f"Error sending world assets data to queue: {e}")
            return 0

    def _update_assets_database(self, assets_data: List[AssetData], data_source: str) -> int:
        """자산 데이터 DB 업데이트 - 히스토리 데이터 보존"""
        try:
            db = self.db
            today = datetime.now().date()
            
            # 오늘 데이터가 이미 있는지 확인 (요청에 따라 주석 처리하여 항상 수행)
            # existing_today_data = db.query(WorldAssetsRanking).filter(
            #     WorldAssetsRanking.ranking_date == today
            # ).count()
            # if existing_today_data > 0:
            #     self.logging_helper.log_warning(f"Today's data already exists ({existing_today_data} records). Skipping insertion.")
            #     return existing_today_data
            
            # MySQL UPSERT 로직 적용 (INSERT ... ON DUPLICATE KEY UPDATE)
            inserted_count = 0
            for asset in assets_data:
                try:
                    # INSERT 시도
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
                        data_source=data_source
                    )
                    db.add(db_asset)
                    db.commit()
                    inserted_count += 1
                except Exception as e:
                    # 중복 키 에러인 경우 UPDATE
                    if "Duplicate entry" in str(e) or "1062" in str(e):
                        db.rollback()
                        existing = db.query(WorldAssetsRanking).filter(
                            WorldAssetsRanking.ranking_date == today,
                            WorldAssetsRanking.ticker == asset.ticker,
                            WorldAssetsRanking.data_source == data_source
                        ).first()
                        
                        if existing:
                            existing.rank = asset.rank
                            existing.name = asset.name
                            existing.market_cap_usd = asset.market_cap_usd
                            existing.price_usd = asset.price_usd
                            existing.daily_change_percent = asset.daily_change_percent
                            existing.country = asset.country
                            existing.asset_type_id = asset.asset_type_id
                            existing.asset_id = asset.asset_id
                            existing.last_updated = datetime.now()
                            db.commit()
                    else:
                        db.rollback()
                        raise e
            self.logging_helper.log_info(f"[WorldAssetsRanking dual-write] MySQL 저장 완료: {inserted_count}개 레코드 for {today} (source: {data_source})")
            
            # PostgreSQL 이중 저장
            try:
                from app.core.database import get_postgres_db
                pg_db = next(get_postgres_db())
                try:
                    from sqlalchemy.dialects.postgresql import insert as pg_insert
                    from sqlalchemy import func
                    from app.models.asset import WorldAssetsRanking as PGWorldAssetsRanking
                    
                    # PostgreSQL UPSERT
                    for asset in assets_data:
                        pg_data = {
                            'rank': asset.rank,
                            'name': asset.name,
                            'ticker': asset.ticker,
                            'market_cap_usd': asset.market_cap_usd,
                            'price_usd': asset.price_usd,
                            'daily_change_percent': asset.daily_change_percent,
                            'country': asset.country,
                            'asset_type_id': asset.asset_type_id,
                            'asset_id': asset.asset_id,
                            'ranking_date': today,
                            'data_source': data_source,
                            'last_updated': datetime.now()
                        }
                        
                        stmt = pg_insert(PGWorldAssetsRanking).values(**pg_data)
                        stmt = stmt.on_conflict_do_update(
                            index_elements=['ranking_date', 'ticker', 'data_source'],  # 동일 날짜/티커/소스 조합 기준으로 UPSERT
                            set_={
                                'rank': stmt.excluded.rank,
                                'name': stmt.excluded.name,
                                'ticker': stmt.excluded.ticker,
                                'market_cap_usd': stmt.excluded.market_cap_usd,
                                'price_usd': stmt.excluded.price_usd,
                                'daily_change_percent': stmt.excluded.daily_change_percent,
                                'country': stmt.excluded.country,
                                'asset_type_id': stmt.excluded.asset_type_id,
                                'asset_id': stmt.excluded.asset_id,
                                'ranking_date': stmt.excluded.ranking_date,
                                'data_source': stmt.excluded.data_source,
                                'last_updated': stmt.excluded.last_updated
                            }
                        )
                        pg_db.execute(stmt)
                    
                    pg_db.commit()
                    self.logging_helper.log_info(f"[WorldAssetsRanking dual-write] PostgreSQL 저장 완료: {inserted_count}개 레코드 for {today} (source: {data_source})")
                except Exception as e:
                    pg_db.rollback()
                    self.logging_helper.log_warning(f"[WorldAssetsRanking dual-write] PostgreSQL 저장 실패: {e}")
                finally:
                    pg_db.close()
            except Exception as e:
                self.logging_helper.log_warning(f"[WorldAssetsRanking dual-write] PostgreSQL 연결 실패: {e}")
            
            # 데이터 저장 후 매핑 적용
            try:
                from ..utils.asset_mapper import AssetMapper
                mapper = AssetMapper()
                mapping_result = mapper.update_missing_data(db, today.isoformat())
                self.logging_helper.log_info(f"[Asset Mapping] 매핑 적용 완료: {mapping_result}")
            except Exception as e:
                self.logging_helper.log_error(f"[Asset Mapping] 매핑 적용 실패: {str(e)}")
                # 매핑 실패는 전체 프로세스를 중단시키지 않음
            
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

    async def scrape_eight_marketcap_etfs(self) -> List[AssetData]:
        """8marketcap.com ETFs 섹션에서 데이터 스크래핑"""
        try:
            self.logging_helper.log_info("Starting 8marketcap ETFs data scraping")
            
            response = requests.get(self.eight_marketcap_etfs_url, headers=self.headers, timeout=30)
            if not response or response.status_code != 200:
                self.logging_helper.log_warning(f"No valid response from 8marketcap ETFs URL (status: {response.status_code if response else 'None'})")
                return []
            
            soup = BeautifulSoup(response.content, 'html.parser')
            assets_data = []
            
            # ETFs 테이블에서 데이터 추출
            table = soup.find('table')
            if not table:
                self.logging_helper.log_warning("ETFs table not found on 8marketcap.com")
                return []
            
            rows = table.find_all('tr')[1:]  # 헤더 제외
            
            for row in rows:
                try:
                    asset = self._parse_eight_marketcap_etf_row(row)
                    if asset:
                        assets_data.append(asset)
                except Exception as e:
                    self.logging_helper.log_warning(f"Error parsing ETF row: {e}")
                    continue
            
            self.logging_helper.log_info(f"Successfully scraped {len(assets_data)} ETFs from 8marketcap.com")
            return assets_data
            
        except Exception as e:
            self.logging_helper.log_error(f"Error scraping 8marketcap ETFs: {e}")
            return []

    def _parse_eight_marketcap_etf_row(self, row) -> Optional[AssetData]:
        """8marketcap ETFs 테이블 행 파싱"""
        try:
            cells = row.find_all('td')
            if len(cells) < 9:  # 9개 컬럼 필요
                return None
            
            # 순위 (두 번째 컬럼, #)
            rank_cell = cells[1]
            rank_text = rank_cell.get_text(strip=True)
            if not rank_text or rank_text == '':
                return None
            try:
                rank = int(rank_text)
            except ValueError:
                return None
            
            # 이름 (세 번째 컬럼, Name)
            name_cell = cells[2]
            name_link = name_cell.find('a')
            if name_link:
                name = name_link.get_text(strip=True)
            else:
                name = name_cell.get_text(strip=True)
            
            # 티커 (네 번째 컬럼, Symbol)
            ticker_cell = cells[3]
            ticker = ticker_cell.get_text(strip=True)
            
            # 시가총액 (다섯 번째 컬럼, Market Cap)
            market_cap_cell = cells[4]
            market_cap_text = market_cap_cell.get_text(strip=True)
            market_cap_usd = self._parse_market_cap(market_cap_text)
            
            # 가격 (여섯 번째 컬럼, Price)
            price_cell = cells[5]
            price_text = price_cell.get_text(strip=True)
            price_usd = self._parse_price(price_text)
            
            # 24h 변화율 (일곱 번째 컬럼, 24h)
            change_cell = cells[6]
            change_text = change_cell.get_text(strip=True)
            daily_change_percent = self._parse_change_percent(change_text)
            
            # 기존 DB와 조인하여 풍부한 정보 획득
            enriched_data = self._enrich_asset_data(name, ticker)
            
            return AssetData(
                rank=rank,
                name=name,
                ticker=ticker,
                market_cap_usd=market_cap_usd,
                price_usd=price_usd,
                daily_change_percent=daily_change_percent,
                country=enriched_data.get('country', 'Global'),  # ETFs는 글로벌
                asset_type_id=enriched_data.get('asset_type_id', 5),  # ETFs fallback
                asset_id=enriched_data.get('asset_id')
            )
            
        except Exception as e:
            self.logging_helper.log_warning(f"Error parsing ETF row: {e}")
            return None

    async def scrape_eight_marketcap_cryptos(self) -> List[AssetData]:
        """8marketcap.com Cryptos 섹션에서 데이터 스크래핑"""
        try:
            self.logging_helper.log_info("Starting 8marketcap Cryptos data scraping")
            
            response = requests.get(self.eight_marketcap_cryptos_url, headers=self.headers, timeout=30)
            if not response or response.status_code != 200:
                self.logging_helper.log_warning(f"No valid response from 8marketcap Cryptos URL (status: {response.status_code if response else 'None'})")
                return []
            
            soup = BeautifulSoup(response.content, 'html.parser')
            assets_data = []
            
            # Cryptos 테이블에서 데이터 추출
            table = soup.find('table')
            if not table:
                self.logging_helper.log_warning("Cryptos table not found on 8marketcap.com")
                return []
            
            rows = table.find_all('tr')[1:]  # 헤더 제외
            
            for row in rows:
                try:
                    asset = self._parse_eight_marketcap_crypto_row(row)
                    if asset:
                        assets_data.append(asset)
                except Exception as e:
                    self.logging_helper.log_warning(f"Error parsing Crypto row: {e}")
                    continue
            
            self.logging_helper.log_info(f"Successfully scraped {len(assets_data)} Cryptos from 8marketcap.com")
            return assets_data
            
        except Exception as e:
            self.logging_helper.log_error(f"Error scraping 8marketcap Cryptos: {e}")
            return []

    def _parse_eight_marketcap_crypto_row(self, row) -> Optional[AssetData]:
        """8marketcap Cryptos 테이블 행 파싱"""
        try:
            cells = row.find_all('td')
            if len(cells) < 9:  # 9개 컬럼 필요
                return None
            
            # 순위 (두 번째 컬럼, #)
            rank_cell = cells[1]
            rank_text = rank_cell.get_text(strip=True)
            if not rank_text or rank_text == '':
                return None
            try:
                rank = int(rank_text)
            except ValueError:
                return None
            
            # 이름 (세 번째 컬럼, Name)
            name_cell = cells[2]
            name_link = name_cell.find('a')
            if name_link:
                name = name_link.get_text(strip=True)
            else:
                name = name_cell.get_text(strip=True)
            
            # 티커 (네 번째 컬럼, Symbol)
            ticker_cell = cells[3]
            ticker = ticker_cell.get_text(strip=True)
            
            # 시가총액 (다섯 번째 컬럼, Market Cap)
            market_cap_cell = cells[4]
            market_cap_text = market_cap_cell.get_text(strip=True)
            market_cap_usd = self._parse_market_cap(market_cap_text)
            
            # 가격 (여섯 번째 컬럼, Price)
            price_cell = cells[5]
            price_text = price_cell.get_text(strip=True)
            price_usd = self._parse_price(price_text)
            
            # 24h 변화율 (일곱 번째 컬럼, 24h)
            change_cell = cells[6]
            change_text = change_cell.get_text(strip=True)
            daily_change_percent = self._parse_change_percent(change_text)
            
            # 기존 DB와 조인하여 풍부한 정보 획득
            enriched_data = self._enrich_asset_data(name, ticker)
            
            return AssetData(
                rank=rank,
                name=name,
                ticker=ticker,
                market_cap_usd=market_cap_usd,
                price_usd=price_usd,
                daily_change_percent=daily_change_percent,
                country=enriched_data.get('country', 'Global'),  # Cryptos는 글로벌
                asset_type_id=enriched_data.get('asset_type_id', 8),  # Crypto fallback
                asset_id=enriched_data.get('asset_id')
            )
            
        except Exception as e:
            self.logging_helper.log_warning(f"Error parsing Crypto row: {e}")
            return None

    async def scrape_eight_marketcap_metals(self) -> List[AssetData]:
        """8marketcap.com Metals 섹션에서 데이터 스크래핑"""
        try:
            self.logging_helper.log_info("Starting 8marketcap Metals data scraping")
            
            response = requests.get(self.eight_marketcap_metals_url, headers=self.headers, timeout=30)
            if not response or response.status_code != 200:
                self.logging_helper.log_warning(f"No valid response from 8marketcap Metals URL (status: {response.status_code if response else 'None'})")
                return []
            
            soup = BeautifulSoup(response.content, 'html.parser')
            assets_data = []
            
            # Metals 테이블에서 데이터 추출
            table = soup.find('table')
            if not table:
                self.logging_helper.log_warning("Metals table not found on 8marketcap.com")
                return []
            
            rows = table.find_all('tr')[1:]  # 헤더 제외
            
            for row in rows:
                try:
                    asset = self._parse_eight_marketcap_metal_row(row)
                    if asset:
                        assets_data.append(asset)
                except Exception as e:
                    self.logging_helper.log_warning(f"Error parsing Metal row: {e}")
                    continue
            
            self.logging_helper.log_info(f"Successfully scraped {len(assets_data)} Metals from 8marketcap.com")
            return assets_data
            
        except Exception as e:
            self.logging_helper.log_error(f"Error scraping 8marketcap Metals: {e}")
            return []

    def _parse_eight_marketcap_metal_row(self, row) -> Optional[AssetData]:
        """8marketcap Metals 테이블 행 파싱"""
        try:
            cells = row.find_all('td')
            if len(cells) < 9:  # 9개 컬럼 필요
                return None
            
            # 순위 (두 번째 컬럼, #)
            rank_cell = cells[1]
            rank_text = rank_cell.get_text(strip=True)
            if not rank_text or rank_text == '':
                return None
            try:
                rank = int(rank_text)
            except ValueError:
                return None
            
            # 이름 (세 번째 컬럼, Name)
            name_cell = cells[2]
            name_link = name_cell.find('a')
            if name_link:
                name = name_link.get_text(strip=True)
            else:
                name = name_cell.get_text(strip=True)
            
            # 티커 (네 번째 컬럼, Symbol)
            ticker_cell = cells[3]
            ticker = ticker_cell.get_text(strip=True)
            
            # 시가총액 (다섯 번째 컬럼, Market Cap)
            market_cap_cell = cells[4]
            market_cap_text = market_cap_cell.get_text(strip=True)
            market_cap_usd = self._parse_market_cap(market_cap_text)
            
            # 가격 (여섯 번째 컬럼, Price)
            price_cell = cells[5]
            price_text = price_cell.get_text(strip=True)
            price_usd = self._parse_price(price_text)
            
            # 24h 변화율 (일곱 번째 컬럼, 24h)
            change_cell = cells[6]
            change_text = change_cell.get_text(strip=True)
            daily_change_percent = self._parse_change_percent(change_text)
            
            # 기존 DB와 조인하여 풍부한 정보 획득
            enriched_data = self._enrich_asset_data(name, ticker)
            
            return AssetData(
                rank=rank,
                name=name,
                ticker=ticker,
                market_cap_usd=market_cap_usd,
                price_usd=price_usd,
                daily_change_percent=daily_change_percent,
                country=enriched_data.get('country', 'Global'),  # Metals는 글로벌
                asset_type_id=enriched_data.get('asset_type_id', 3),  # Commodities fallback
                asset_id=enriched_data.get('asset_id')
            )
            
        except Exception as e:
            self.logging_helper.log_warning(f"Error parsing Metal row: {e}")
            return None 