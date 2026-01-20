"""
Onchain data collector for fetching and storing Bitcoin metrics.
This version is fully refactored to align with the v2 architecture.
"""
import logging
import asyncio
from typing import List, Dict, Any

from sqlalchemy.orm import Session

from .base_collector import BaseCollector
from ..models.asset import Asset
from ..core.config_manager import ConfigManager
from ..utils.redis_queue_manager import RedisQueueManager
from ..services.api_strategy_manager import ApiStrategyManager
from ..external_apis.base.schemas import OnchainMetricDataPoint # 표준 스키마 임포트

logger = logging.getLogger(__name__)


class OnchainCollector(BaseCollector):
    """
    Orchestrates the collection of onchain metrics for Bitcoin. It determines
    which metrics to collect, delegates fetching to the ApiStrategyManager,
    and enqueues the results for the DataProcessor.
    """

    def __init__(
        self,
        db: Session,
        config_manager: ConfigManager,
        api_manager: ApiStrategyManager,
        redis_queue_manager: RedisQueueManager,
    ):
        super().__init__(db, config_manager, api_manager, redis_queue_manager)
        self.bitcoin_asset_id = self._get_bitcoin_asset_id()

    async def _collect_data(self) -> Dict[str, Any]:
        """
        The main business logic for the OnchainCollector.
        """
        # 1. 설정 조회
        if not self.config_manager.is_onchain_collection_enabled():
            self.logging_helper.log_info("Onchain collection is disabled via configuration.")
            return {"processed_assets": 0, "total_added_records": 0}

        if not self.bitcoin_asset_id:
            self.logging_helper.log_error("Bitcoin asset (BTC or BTCUSDT) not found in DB. Cannot collect onchain data.")
            return {"processed_assets": 0, "total_added_records": 0}
            
        enabled_metrics = self.config_manager.get_enabled_onchain_metrics()
        if not enabled_metrics:
            self.logging_helper.log_warning("No onchain metrics are enabled for collection in configuration.")
            return {"processed_assets": 0, "total_added_records": 0}

        from datetime import datetime, timedelta
        
        # Use KST (UTC+9) for day calculation to align with 08:50 KST job schedule
        kst_now = datetime.utcnow() + timedelta(hours=9)
        day_of_month = kst_now.day
        is_even_day = (day_of_month % 2 == 0)
        
        # 3. 데이터 수집 대상 결정
        # API 키가 없으면 하루 15회 제한(무료)을 준수해야 함 -> 홀수/짝수 분할 전략 사용
        # 단, "스마트 수집"을 통해 한번 요청시 필요한 기간만큼(최소 30일) 넉넉히 가져와서 빈 구멍을 메움
        api_key = self.config_manager.get_bitcoin_data_api_key()
        
        if api_key:
            # API 키가 있으면 제한 없이 매일 전체 수집
            metrics_to_collect = enabled_metrics
            self.logging_helper.log_info(
                f"API Key detected. Collecting ALL {len(metrics_to_collect)} metrics daily."
            )
        else:
            # Group A (Odd days): 15 metrics
            group_a = [
                'mvrv_z_score', 'mvrv', 'nupl', 'sopr', 'realized_price', 
                'sth_realized_price', 'lth_mvrv', 'sth_mvrv', 'lth_nupl', 
                'sth_nupl', 'aviv', 'true_market_mean', 'terminal_price', 
                'delta_price_usd', 'market_cap'
            ]
            
            # Group B (Even days): 15 metrics
            group_b = [
                'hashrate', 'difficulty', 'thermo_cap', 'puell_multiple', 
                'reserve_risk', 'rhodl_ratio', 'nvts', 'nrpl_usd', 
                'utxos_in_profit_pct', 'utxos_in_loss_pct', 'realized_cap', 
                'etf_btc_flow', 'etf_btc_total', 'hodl_waves_supply', 'cdd_90dma'
            ]
            
            current_group = group_b if is_even_day else group_a
            
            # 필터링: 현재 그룹에 속하고 설정에서 활성화된 메트릭만 선택
            metrics_to_collect = [m for m in enabled_metrics if m in current_group]
            
            self.logging_helper.log_info(
                f"No API Key (Active Split Mode). Day: {day_of_month} ({'Even' if is_even_day else 'Odd'}). "
                f"Target Group: {'B' if is_even_day else 'A'}. Collecting {len(metrics_to_collect)} metrics."
            )

        # 3. 데이터 수집 실행 및 결과 집계 (순차 실행으로 변경)
        results = []
        
        # API 키 유무에 따른 지연 시간 설정
        if api_key:
            delay = 2
        else:
            delay = self.config_manager.get_onchain_api_delay() # 기본값 480초 (8분)

        # DB 세션 확보 (Latest Date 조회용)
        from .utils.db_helpers import get_latest_metric_date
        
        for i, metric_name in enumerate(metrics_to_collect):
            try:
                # [Smart Collection] DB에서 해당 메트릭의 최신 날짜 확인
                latest_date = get_latest_metric_date(self.db, self.bitcoin_asset_id, metric_name)
                
                # 수집할 일수(days) 계산
                # 기본 30일, 공백이 길면 그만큼 더 많이
                days_to_fetch = 30
                if latest_date:
                    days_gap = (datetime.utcnow().date() - latest_date.date()).days
                    if days_gap > 30:
                        days_to_fetch = days_gap + 3 # 여유분 추가
                else:
                    days_to_fetch = 365 * 5 # 데이터가 아예 없으면 5년치 (초기 로딩)
                
                # API 최대 `size` 제한 고려 (보통 1000~수천 가능하지만 적절히 제한)
                if days_to_fetch > 2000: days_to_fetch = 2000

                self.logging_helper.log_info(f"Smart Collection for {metric_name}: Last data {latest_date}, fetching {days_to_fetch} days.")

                result = await self.process_with_semaphore(
                    self._fetch_and_enqueue_for_metric(metric_name, days=days_to_fetch)
                )
                results.append(result)
                
                # 마지막 아이템이 아니면 대기
                if i < len(metrics_to_collect) - 1:
                    self.logging_helper.log_debug(f"Sleeping {delay}s before next metric...")
                    await asyncio.sleep(delay)
                    
            except Exception as e:
                self.logging_helper.log_error(f"Error collecting {metric_name}: {e}")
                results.append({"success": False, "error": str(e)})

        # 온체인 컬렉터는 자산 1개(비트코인)에 대해 여러 메트릭을 처리합니다.
        # 따라서 processed_assets는 1 또는 0 입니다.
        successful_metrics = [r for r in results if isinstance(r, dict) and r.get("success")]
        processed_assets = 1 if successful_metrics else 0
        enqueued_count = sum(r.get("enqueued_count", 0) for r in successful_metrics)
        
        return {
            "processed_assets": processed_assets,
            "total_added_records": enqueued_count,
        }

    def _get_bitcoin_asset_id(self) -> int | None:
        """Dynamically finds the asset ID for Bitcoin (BTC or BTCUSDT)."""
        try:
            btc_asset = self.db.query(Asset.asset_id).filter(Asset.ticker.in_(['BTC', 'BTCUSDT'])).first()
            return btc_asset.asset_id if btc_asset else None
        except Exception as e:
            self.logging_helper.log_error(f"Error finding Bitcoin asset ID: {e}")
            return None

    async def _fetch_and_enqueue_for_metric(self, metric_name: str, days: int = None) -> Dict[str, Any]:
        """
        Fetches data for a single onchain metric and enqueues it.
        """
        try:
            self.logging_helper.log_info(f"[OnchainCollector] 메트릭 '{metric_name}' 수집 시작 (asset_id: {self.bitcoin_asset_id}, days: {days})")
            
            # 3. 데이터 가져오라고 시키기 (ApiStrategyManager 사용)
            # 동적 Limit 시스템 사용 (다른 클라이언트들과 동일)
            metric_data: List[OnchainMetricDataPoint] = await self.api_manager.get_onchain_metric(
                metric_name=metric_name,
                asset_id=self.bitcoin_asset_id,
                days=days  # Smart Collection에서 계산된 days 전달
            )

            if not metric_data:
                self.logging_helper.log_warning(f"[OnchainCollector] 메트릭 '{metric_name}'에 대한 데이터가 없습니다.")
                return {"success": True, "enqueued_count": 0}
            
            self.logging_helper.log_info(f"[OnchainCollector] 메트릭 '{metric_name}' 데이터 수집 완료: {len(metric_data)}개 포인트")

            # 4. 작업 큐에 넘겨주기 (RedisQueueManager 사용)
            payload = {
                "asset_id": self.bitcoin_asset_id,
                "metric_name": metric_name,
                "data": []
            }
            
            # 데이터 변환 및 검증
            valid_items = 0
            invalid_items = 0
            
            # metric_data 타입에 따라 처리
            items_to_process = []
            
            if isinstance(metric_data, list):
                # 리스트인 경우 직접 처리
                items_to_process = metric_data
                self.logging_helper.log_debug(f"[OnchainCollector] 메트릭 '{metric_name}' 리스트 데이터: {len(metric_data)}개 항목")
                
            elif isinstance(metric_data, dict):
                # 딕셔너리인 경우 - 여러 가능한 구조 처리
                if "data" in metric_data:
                    # {"data": [...]} 구조
                    items_to_process = metric_data["data"]
                    self.logging_helper.log_debug(f"[OnchainCollector] 메트릭 '{metric_name}' 딕셔너리 데이터: {len(items_to_process)}개 항목")
                elif "_embedded" in metric_data:
                    # {"_embedded": {"mvrvs": [...]}} 구조 (legacy)
                    embedded_data = metric_data["_embedded"]
                    for key, value in embedded_data.items():
                        if isinstance(value, list):
                            items_to_process = value
                            self.logging_helper.log_debug(f"[OnchainCollector] 메트릭 '{metric_name}' embedded 데이터: {len(items_to_process)}개 항목")
                            break
                else:
                    # 단일 딕셔너리 항목인 경우
                    items_to_process = [metric_data]
                    self.logging_helper.log_debug(f"[OnchainCollector] 메트릭 '{metric_name}' 단일 딕셔너리 데이터")
                    
            elif hasattr(metric_data, 'model_dump'):
                # Pydantic 모델인 경우
                items_to_process = [metric_data]
                self.logging_helper.log_debug(f"[OnchainCollector] 메트릭 '{metric_name}' Pydantic 모델 데이터")
                
            else:
                self.logging_helper.log_error(f"[OnchainCollector] 메트릭 '{metric_name}' 지원하지 않는 데이터 타입: {type(metric_data)}")
                return {"success": False, "error": f"Unsupported data type: {type(metric_data)}", "enqueued_count": 0}
            
            # 각 항목 처리
            for i, item in enumerate(items_to_process):
                try:
                    if hasattr(item, 'model_dump'):
                        # Pydantic 모델인 경우
                        converted_item = item.model_dump(mode='json')
                        payload["data"].append(converted_item)
                        valid_items += 1
                        
                        # 첫 번째와 마지막 아이템 로그
                        if i == 0 or i == len(items_to_process) - 1:
                            self.logging_helper.log_debug(f"[OnchainCollector] 메트릭 '{metric_name}' 아이템 {i+1}: "
                                                       f"timestamp={converted_item.get('timestamp_utc')}, "
                                                       f"mvrv_z_score={converted_item.get('mvrv_z_score')}")
                        
                    elif isinstance(item, dict):
                        # 딕셔너리인 경우 - 데이터베이스 스키마에 맞게 변환
                        converted_item = self._convert_onchain_data(item, metric_name)
                        if converted_item:
                            payload["data"].append(converted_item)
                            valid_items += 1
                            
                            # 첫 번째와 마지막 아이템 로그
                            if i == 0 or i == len(items_to_process) - 1:
                                self.logging_helper.log_debug(f"[OnchainCollector] 메트릭 '{metric_name}' 아이템 {i+1}: "
                                                           f"timestamp={converted_item.get('timestamp_utc')}, "
                                                           f"metric_value={converted_item.get(metric_name.lower())}")
                        else:
                            invalid_items += 1
                    else:
                        # 문자열이나 다른 타입인 경우 건너뛰기
                        invalid_items += 1
                        self.logging_helper.log_warning(f"[OnchainCollector] 메트릭 '{metric_name}' 아이템 {i+1} 건너뛰기: "
                                                      f"지원하지 않는 타입 {type(item)}")
                        continue
                except Exception as e:
                    invalid_items += 1
                    self.logging_helper.log_error(f"[OnchainCollector] 메트릭 '{metric_name}' 아이템 {i+1} 변환 실패: {e}")
                    continue
            
            # 변환 결과 로그
            self.logging_helper.log_info(f"[OnchainCollector] 메트릭 '{metric_name}' 데이터 변환 완료:")
            self.logging_helper.log_info(f"  - 총 아이템: {len(items_to_process)}개")
            self.logging_helper.log_info(f"  - 유효한 아이템: {valid_items}개")
            self.logging_helper.log_info(f"  - 무효한 아이템: {invalid_items}개")
            
            if payload["data"]:
                await self.redis_queue_manager.push_batch_task("onchain_metric", payload)
                self.logging_helper.log_info(f"[OnchainCollector] 메트릭 '{metric_name}' 큐 전송 완료: {len(payload['data'])}개 레코드")
                return {"success": True, "enqueued_count": len(payload["data"])}
            else:
                self.logging_helper.log_warning(f"[OnchainCollector] 메트릭 '{metric_name}' 큐에 전송할 유효한 데이터가 없습니다.")
                return {"success": True, "enqueued_count": 0}

        except Exception as e:
            self.logging_helper.log_error(f"Failed to process onchain metric '{metric_name}' for asset_id {self.bitcoin_asset_id}: {e}")
            return {"success": False, "error": str(e), "enqueued_count": 0}
    
    def _convert_onchain_data(self, item: dict, metric_name: str) -> dict:
        """API 데이터를 데이터베이스 스키마에 맞게 변환"""
        try:
            # 기본 필드 변환 - API 응답 구조에 맞게 수정
            converted = {
                "asset_id": self.bitcoin_asset_id,
                "timestamp_utc": self._parse_timestamp(item.get("unixTs") or item.get("d") or item.get("timestamp")),
            }
            
            # 메트릭별 필드 매핑 - API 응답 필드명에 맞게 수정
            metric_mappings = {
                "mvrv_z_score": {
                    "mvrv": "mvrv_z_score",  # API에서 'mvrv' 필드 사용
                    "mvrvZscore": "mvrv_z_score",
                    "mvrv_z_score": "mvrv_z_score"
                },
                "nupl": {
                    "nupl": "nupl"
                },
                "sopr": {
                    "sopr": "sopr"
                },
                "aviv": {
                    "aviv": "aviv"
                },
                "hashrate": {
                    "hashrate": "hashrate"
                },
                "difficulty": {
                    "difficulty": "difficulty",
                    "difficultyBtc": "difficulty"
                },
                "realized_price": {
                    "realizedPrice": "realized_price",
                    "realized_price": "realized_price"
                },
                "thermo_cap": {
                    "thermoCap": "thermo_cap",
                    "thermo_cap": "thermo_cap"
                },
                "true_market_mean": {
                    "trueMarketMean": "true_market_mean",
                    "true_market_mean": "true_market_mean"
                },
                "nrpl_usd": {
                    "nrplUsd": "nrpl_usd"
                },
                "sth_realized_price": {
                    "sthRealizedPrice": "sth_realized_price"
                },
                "cdd_90dma": {
                    "cdd90dma": "cdd_90dma",
                    "cdd_90dma": "cdd_90dma"
                },
                "etf_btc_flow": {
                    "etfFlow": "etf_btc_flow",
                    "etf_btc_flow": "etf_btc_flow"
                },
                "etf_btc_total": {
                    "etfBtcTotal": "etf_btc_total",
                    "etf_btc_total": "etf_btc_total"
                },
                "hodl_waves_supply": {
                    "hodlWavesSupply": "hodl_waves_supply",
                    "hodl_waves_supply": "hodl_waves_supply"
                },
                "cap_real_usd": {
                    "capRealUSD": "cap_real_usd",
                    "cap_real_usd": "cap_real_usd"
                },
                "mvrv": {
                    "mvrv": "mvrv"
                },
                "lth_mvrv": {
                    "mvrvLth": "lth_mvrv",
                    "mvrv_lth": "lth_mvrv"
                },
                "sth_mvrv": {
                    "mvrvSth": "sth_mvrv",
                    "mvrv_sth": "sth_mvrv"
                },
                "puell_multiple": {
                    "puellMultiple": "puell_multiple",
                    "puell_multiple": "puell_multiple"
                },
                "reserve_risk": {
                    "reserveRisk": "reserve_risk",
                    "reserve_risk": "reserve_risk"
                },
                "rhodl_ratio": {
                    "rhodlRatio": "rhodl_ratio",
                    "rhodl_ratio": "rhodl_ratio"
                },
                "terminal_price": {
                    "terminalPrice": "terminal_price",
                    "terminal_price": "terminal_price"
                },
                "delta_price_usd": {
                    "deltaPriceUsd": "delta_price_usd",
                    "delta_price_usd": "delta_price_usd"
                },
                "lth_nupl": {
                    "nuplLth": "lth_nupl",
                    "nupl_lth": "lth_nupl"
                },
                "sth_nupl": {
                    "nuplSth": "sth_nupl",
                    "nupl_sth": "sth_nupl"
                },
                "utxos_in_profit_pct": {
                    "utxosInProfitPct": "utxos_in_profit_pct",
                    "utxos_in_profit_pct": "utxos_in_profit_pct"
                },
                "utxos_in_loss_pct": {
                    "utxosInLossPct": "utxos_in_loss_pct",
                    "utxos_in_loss_pct": "utxos_in_loss_pct"
                },
                "nvts": {
                    "nvts": "nvts"
                },
                "market_cap": {
                    "marketCap": "market_cap",
                    "market_cap": "market_cap"
                },
                "realized_cap": {
                    "realizedCap": "realized_cap",
                    "realized_cap": "realized_cap"
                }
            }
            
            # 현재 메트릭의 매핑 적용
            if metric_name in metric_mappings:
                for api_field, db_field in metric_mappings[metric_name].items():
                    if api_field in item and item[api_field] is not None:
                        value = item[api_field]
                        # DataFrame이나 Series인 경우 처리
                        if hasattr(value, 'iloc'):  # pandas DataFrame/Series
                            # 첫 번째 값만 사용
                            if len(value) > 0:
                                value = value.iloc[0] if hasattr(value, 'iloc') else value.values[0]
                            else:
                                continue
                        # 숫자로 변환 시도
                        try:
                            converted[db_field] = float(value)
                        except (ValueError, TypeError) as e:
                            self.logging_helper.log_warning(f"[OnchainCollector] 메트릭 '{metric_name}' 필드 '{api_field}' 변환 실패: {type(value)} - {e}")
                            continue
            
            # HODL Age 분포 처리 (개별 필드들을 JSON으로 변환)
            hodl_age_distribution = {}
            hodl_age_mapping = {
                'age_0d_1d': '0d_1d',
                'age_1d_1w': '1d_1w', 
                'age_1w_1m': '1w_1m',
                'age_1m_3m': '1m_3m',
                'age_3m_6m': '3m_6m',
                'age_6m_1y': '6m_1y',
                'age_1y_2y': '1y_2y',
                'age_2y_3y': '2y_3y',
                'age_3y_4y': '3y_4y',
                'age_4y_5y': '4y_5y',
                'age_5y_7y': '5y_7y',
                'age_7y_10y': '7y_10y',
                'age_10y': '10y'
            }
            
            for api_key, json_key in hodl_age_mapping.items():
                if api_key in item and item[api_key] is not None:
                    hodl_age_distribution[json_key] = float(item[api_key])
            
            if hodl_age_distribution:
                converted["hodl_age_distribution"] = hodl_age_distribution
            

            return converted
            
        except Exception as e:
            self.logging_helper.log_error(f"데이터 변환 실패: {e}")
            return None
    
    def _parse_timestamp(self, timestamp_str) -> str:
        """타임스탬프 문자열을 ISO 형식으로 변환"""
        try:
            if not timestamp_str:
                return None
                
            # 이미 ISO 형식인 경우
            if isinstance(timestamp_str, str) and 'T' in timestamp_str:
                return timestamp_str
                
            # 날짜 형식인 경우 (YYYY-MM-DD)
            if isinstance(timestamp_str, str) and len(timestamp_str) == 10:
                return f"{timestamp_str}T00:00:00Z"
                
            # Unix timestamp인 경우
            if isinstance(timestamp_str, (int, float)):
                from datetime import datetime
                return datetime.fromtimestamp(timestamp_str).isoformat() + 'Z'
                
            return str(timestamp_str)
            
        except Exception as e:
            self.logging_helper.log_error(f"타임스탬프 파싱 실패: {e}")
            return None
