import logging
from datetime import datetime, timezone
from typing import Dict, Optional, Any, Tuple
from ...models import Asset
from ...core.database import get_postgres_db

logger = logging.getLogger(__name__)

class DataValidator:
    """
    데이터 유효성 검증 및 타임스탬프 파싱을 담당하는 클래스
    """
    def __init__(self):
        self.price_ranges = self._initialize_price_ranges()
        self._ticker_cache: Dict[int, str] = {}

    def _initialize_price_ranges(self) -> Dict[str, tuple]:
        """자산별 가격 범위 초기화 (최소값, 최대값)"""
        return {}

    def _get_asset_ticker(self, asset_id: int) -> Optional[str]:
        """자산 ID로 티커 조회 (캐시 적용)"""
        if asset_id in self._ticker_cache:
            return self._ticker_cache[asset_id]

        try:
            # PostgreSQL에서 직접 조회
            pg_db = next(get_postgres_db())
            try:
                asset = pg_db.query(Asset).filter(Asset.asset_id == asset_id).first()
                if asset:
                    self._ticker_cache[asset_id] = asset.ticker
                    return asset.ticker
                return None
            finally:
                pg_db.close()
        except Exception as e:
            logger.warning(f"자산 티커 조회 실패 asset_id={asset_id}: {e}")
            return None

    def validate_price_range(self, asset_id: int, price: float, ticker: str = None) -> bool:
        """자산별 가격 범위 검증"""
        try:
            # 티커가 없으면 조회
            if not ticker:
                ticker = self._get_asset_ticker(asset_id)
                if not ticker:
                    logger.warning(f"🚨 자산 정보 없음: asset_id={asset_id}")
                    return False
            
            # 가격 범위 확인
            if ticker in self.price_ranges:
                min_price, max_price = self.price_ranges[ticker]
                if price < min_price or price > max_price:
                    logger.warning(f"🚨 가격 범위 초과: {ticker}={price:.2f}, "
                                  f"정상범위={min_price}-{max_price}")
                    return False
                else:
                    logger.debug(f"✅ 가격 범위 검증 통과: {ticker}={price:.2f}")
            else:
                # 정의되지 않은 자산은 기본 검증 (양수)
                if price <= 0:
                    logger.warning(f"🚨 가격이 0 이하: {ticker}={price}")
                    return False
                logger.debug(f"✅ 기본 가격 검증 통과: {ticker}={price:.2f}")
            
            return True
            
        except Exception as e:
            logger.error(f"가격 범위 검증 실패 asset_id={asset_id}, price={price}: {e}")
            return False

    def validate_realtime_quote(self, record_data: Dict[str, Any]) -> bool:
        """실시간 인용 데이터 종합 검증"""
        try:
            asset_id = record_data.get('asset_id')
            price = record_data.get('price')
            ticker = record_data.get('ticker')
            data_source = record_data.get('data_source', 'unknown')
            
            # 기본 데이터 검증
            if not asset_id or price is None:
                logger.warning(f"🚨 필수 데이터 누락: asset_id={asset_id}, price={price}")
                return False
            
            # 가격 범위 검증
            if not self.validate_price_range(asset_id, price, ticker=ticker):
                return False
            
            logger.debug(f"✅ 실시간 인용 검증 통과: asset_id={asset_id}, ticker={ticker}, price={price:.2f}, source={data_source}")
            return True
            
        except Exception as e:
            logger.error(f"실시간 인용 검증 실패: {e}")
            return False

    def parse_timestamp(self, timestamp_str: str, provider: str = None) -> datetime:
        """타임스탬프 문자열을 파싱하고 UTC로 변환합니다."""
        try:
            if not timestamp_str:
                return datetime.utcnow()

            # 먼저 표준 ISO 형식으로 시도
            parsed_time = datetime.fromisoformat(str(timestamp_str).replace('Z', '+00:00'))
            # UTC로 변환
            if parsed_time.tzinfo is not None:
                return parsed_time.astimezone(timezone.utc).replace(tzinfo=None)
            return parsed_time
        except ValueError:
            try:
                # Unix timestamp (milliseconds) 형태인지 확인
                if str(timestamp_str).isdigit() and len(str(timestamp_str)) >= 10:
                    # 밀리초 단위 Unix timestamp를 초 단위로 변환
                    timestamp_ms = int(timestamp_str)
                    if len(str(timestamp_str)) > 10:  # 밀리초가 포함된 경우
                        timestamp_seconds = timestamp_ms / 1000.0
                    else:  # 초 단위인 경우
                        timestamp_seconds = timestamp_ms
                    # Unix timestamp는 이미 UTC 기준이므로 그대로 사용
                    return datetime.fromtimestamp(timestamp_seconds)
                
                # 마이크로초가 6자리를 초과하는 경우 처리
                if '.' in str(timestamp_str) and len(str(timestamp_str).split('.')[1]) > 6:
                    # 마이크로초를 6자리로 자르기
                    parts = str(timestamp_str).split('.')
                    if len(parts) == 2:
                        base_time = parts[0]
                        microseconds = parts[1][:6]  # 6자리로 자르기
                        timezone_part = ''
                        if '-' in microseconds or '+' in microseconds:
                            # 타임존 정보가 마이크로초에 포함된 경우
                            for i, char in enumerate(microseconds):
                                if char in ['-', '+']:
                                    microseconds = microseconds[:i]
                                    timezone_part = parts[1][i:]
                                    break
                        timestamp_str = f"{base_time}.{microseconds}{timezone_part}"
                        parsed_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        # UTC로 변환
                        if parsed_time.tzinfo is not None:
                            return parsed_time.astimezone(timezone.utc).replace(tzinfo=None)
                        return parsed_time
            except (ValueError, OSError):
                pass
            
            # 모든 파싱이 실패하면 현재 UTC 시간 반환
            logger.warning(f"타임스탬프 파싱 실패: {timestamp_str}, 현재 UTC 시간 사용")
            return datetime.utcnow()
