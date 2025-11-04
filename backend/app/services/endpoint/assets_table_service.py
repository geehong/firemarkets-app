"""
Assets Table Service - 자산 테이블 데이터 조회 및 병합 로직
"""
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, and_, or_
from datetime import datetime, timedelta
import json
import logging

from ...models import (
    Asset,
    AssetType,
    OHLCVData,
    RealtimeQuote,
    SparklineData,
    WorldAssetsRanking,
    StockFinancial,
)
from app.external_apis.implementations import TwelveDataClient, BinanceClient, CoinGeckoClient
from ...core.cache import cache_with_invalidation
from ...core.config import GLOBAL_APP_CONFIGS

logger = logging.getLogger(__name__)

# API 클라이언트 인스턴스
twelvedata_client = TwelveDataClient()
binance_client = BinanceClient()
coingecko_client = CoinGeckoClient()


class AssetsTableService:
    """자산 테이블 데이터 서비스"""
    
    @staticmethod
    async def get_assets_table_data(
        db: Session,
        type_name: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "market_cap",
        order: str = "desc",
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """자산 테이블 데이터 조회 및 병합"""
        
        # 1. 기본 자산 데이터 조회
        assets_data = AssetsTableService._get_base_assets_data(
            db, type_name, page, page_size, sort_by, order, search
        )
        
        if not assets_data['assets']:
            return {
                'data': [],
                'total': 0,
                'page': page,
                'size': page_size,
                'pages': 0,
                'asset_type': type_name,
                'sort_by': sort_by,
                'order': order,
                'search': search
            }
        
        # 2. 실시간 데이터 병합
        enriched_data = await AssetsTableService._enrich_with_realtime_data(
            db, assets_data['assets']
        )
        
        # 3. 스파크라인 데이터 병합
        enriched_data = await AssetsTableService._enrich_with_sparkline_data(
            db, enriched_data
        )
        
        return {
            'data': enriched_data,
            'total': assets_data['total'],
            'page': page,
            'size': page_size,
            'pages': assets_data['pages'],
            'asset_type': type_name,
            'sort_by': sort_by,
            'order': order,
            'search': search
        }
    
    @staticmethod
    def _get_base_assets_data(
        db: Session,
        type_name: Optional[str],
        page: int,
        page_size: int,
        sort_by: str,
        order: str,
        search: Optional[str]
    ) -> Dict[str, Any]:
        """기본 자산 데이터 조회 (성능 최적화)"""
        import math
        
        # 자산유형별 표시 컷오프 (상위 N개만 노출)
        display_cutoff_by_type = {
            "Stocks": 200,
            "Crypto": 200,
            "ETFs": 200,
            "Funds": 200,
            "Commodities": 200,
        }
        cutoff = display_cutoff_by_type.get(type_name) if type_name else None

        # 최신 WorldAssetsRanking (시총, rank) 서브쿼리 - asset_id 기준
        latest_war_id_sq = (
            db.query(
                WorldAssetsRanking.asset_id.label("asset_id"),
                func.max(WorldAssetsRanking.id).label("max_id"),
            )
            .group_by(WorldAssetsRanking.asset_id)
            .subquery("latest_war_id")
        )

        war_sq = (
            db.query(
                WorldAssetsRanking.asset_id.label("war_asset_id"),
                WorldAssetsRanking.market_cap_usd.label("war_market_cap"),
                WorldAssetsRanking.rank.label("war_rank"),
            )
            .join(
                latest_war_id_sq,
                and_(
                    WorldAssetsRanking.asset_id == latest_war_id_sq.c.asset_id,
                    WorldAssetsRanking.id == latest_war_id_sq.c.max_id,
                ),
            )
            .subquery("war_sq")
        )

        # 최신 WorldAssetsRanking (시총, rank) 서브쿼리 - ticker 기준 (asset_id 매핑 없을 때 대비)
        latest_war_ticker_id_sq = (
            db.query(
                WorldAssetsRanking.ticker.label("ticker"),
                func.max(WorldAssetsRanking.id).label("max_id"),
            )
            .filter(WorldAssetsRanking.ticker.isnot(None))
            .group_by(WorldAssetsRanking.ticker)
            .subquery("latest_war_ticker_id")
        )

        war_ticker_sq = (
            db.query(
                WorldAssetsRanking.ticker.label("war_ticker"),
                WorldAssetsRanking.market_cap_usd.label("war_ticker_market_cap"),
                WorldAssetsRanking.rank.label("war_ticker_rank"),
            )
            .join(
                latest_war_ticker_id_sq,
                and_(
                    WorldAssetsRanking.ticker == latest_war_ticker_id_sq.c.ticker,
                    WorldAssetsRanking.id == latest_war_ticker_id_sq.c.max_id,
                ),
            )
            .subquery("war_ticker_sq")
        )

        # 최신 WorldAssetsRanking (시총, rank) 서브쿼리 - name 기준 (ticker가 없는 경우 대비)
        latest_war_name_id_sq = (
            db.query(
                WorldAssetsRanking.name.label("name"),
                func.max(WorldAssetsRanking.id).label("max_id"),
            )
            .filter(WorldAssetsRanking.name.isnot(None))
            .group_by(WorldAssetsRanking.name)
            .subquery("latest_war_name_id")
        )

        war_name_sq = (
            db.query(
                WorldAssetsRanking.name.label("war_name"),
                WorldAssetsRanking.market_cap_usd.label("war_name_market_cap"),
                WorldAssetsRanking.rank.label("war_name_rank"),
            )
            .join(
                latest_war_name_id_sq,
                and_(
                    WorldAssetsRanking.name == latest_war_name_id_sq.c.name,
                    WorldAssetsRanking.id == latest_war_name_id_sq.c.max_id,
                ),
            )
            .subquery("war_name_sq")
        )

        # 최신 StockFinancials (시총) 서브쿼리
        latest_sf_date_sq = (
            db.query(
                StockFinancial.asset_id.label("asset_id"),
                func.max(StockFinancial.snapshot_date).label("max_date"),
            )
            .group_by(StockFinancial.asset_id)
            .subquery("latest_sf_date")
        )

        sf_sq = (
            db.query(
                StockFinancial.asset_id.label("sf_asset_id"),
                StockFinancial.market_cap.label("sf_market_cap"),
            )
            .join(
                latest_sf_date_sq,
                and_(
                    StockFinancial.asset_id == latest_sf_date_sq.c.asset_id,
                    StockFinancial.snapshot_date == latest_sf_date_sq.c.max_date,
                ),
            )
            .subquery("sf_sq")
        )

        # 기본 쿼리 구성 + 랭킹/재무 조인
        base_query = (
            db.query(
                Asset.asset_id,
                Asset.ticker,
                Asset.name,
                AssetType.type_name.label('asset_type'),
                Asset.exchange,
                Asset.currency,
                war_sq.c.war_market_cap,
                war_sq.c.war_rank,
                war_ticker_sq.c.war_ticker_market_cap,
                war_ticker_sq.c.war_ticker_rank,
                war_name_sq.c.war_name_market_cap,
                war_name_sq.c.war_name_rank,
                sf_sq.c.sf_market_cap,
            )
            .join(AssetType, Asset.asset_type_id == AssetType.asset_type_id)
            .outerjoin(war_sq, war_sq.c.war_asset_id == Asset.asset_id)
            .outerjoin(
                war_ticker_sq,
                or_(
                    func.upper(func.trim(war_ticker_sq.c.war_ticker)) == func.upper(func.trim(Asset.ticker)),
                    func.upper(func.trim(war_ticker_sq.c.war_ticker)) == func.upper(func.split_part(Asset.ticker, '.', 1)),
                    func.upper(func.trim(war_ticker_sq.c.war_ticker)) == func.upper(func.split_part(Asset.ticker, '-', 1)),
                    func.upper(func.trim(war_ticker_sq.c.war_ticker)) == func.upper(func.split_part(Asset.ticker, ':', 1)),
                ),
            )
            .outerjoin(
                war_name_sq,
                func.upper(func.trim(war_name_sq.c.war_name)) == func.upper(func.trim(Asset.name)),
            )
            .outerjoin(sf_sq, sf_sq.c.sf_asset_id == Asset.asset_id)
        )
        
        # 필터링
        if type_name:
            base_query = base_query.filter(AssetType.type_name == type_name)
        
        if search:
            search_term = f"%{search}%"
            base_query = base_query.filter(
                (Asset.ticker.ilike(search_term)) | (Asset.name.ilike(search_term))
            )
        
        # OHLCV 데이터가 있는 자산만 필터링 (성능 최적화)
        base_query = base_query.filter(
            db.query(OHLCVData).filter(
                OHLCVData.asset_id == Asset.asset_id,
                OHLCVData.data_interval.is_(None)  # 일봉 데이터는 data_interval이 NULL
            ).exists()
        )
        
        # 정렬
        order_func = desc if order == "desc" else asc
        if sort_by == "market_cap":
            # WorldAssetsRanking 우선, 없으면 stock_financials
            # market_cap이 완전히 NULL인 행은 뒤로 밀기 위해 COALESCE IS NULL 우선 정렬
            base_query = base_query.order_by(
                order_func(
                    func.coalesce(
                        war_sq.c.war_market_cap,
                        war_ticker_sq.c.war_ticker_market_cap,
                        war_name_sq.c.war_name_market_cap,
                        sf_sq.c.sf_market_cap,
                    ).is_(None)
                ),
                order_func(
                    func.coalesce(
                        war_sq.c.war_market_cap,
                        war_ticker_sq.c.war_ticker_market_cap,
                        war_name_sq.c.war_name_market_cap,
                        sf_sq.c.sf_market_cap,
                    )
                )
            )
        else:
            # 기본 정렬: asset_id
            base_query = base_query.order_by(order_func(Asset.asset_id))
        
        # 전체 개수 계산
        total_count = base_query.count()
        # 컷오프 적용 시 총 개수 제한
        effective_total = min(total_count, cutoff) if cutoff else total_count
        
        # 페이지네이션 (컷오프 고려)
        offset = (page - 1) * page_size
        if cutoff:
            if offset >= cutoff:
                # 컷오프를 초과하는 페이지 요청 시 빈 결과 반환
                assets_data = []
            else:
                effective_limit = max(0, min(page_size, cutoff - offset))
                assets_data = base_query.offset(offset).limit(effective_limit).all()
        else:
            assets_data = base_query.offset(offset).limit(page_size).all()

        # 랭킹/시총 보강용 배치 조회 (asset_id, ticker 기준 최신값)
        asset_ids = [row.asset_id for row in assets_data]
        tickers = [row.ticker for row in assets_data]

        # asset_id 기준 최신 ranking_date 레코드
        war_by_asset_id: Dict[int, Any] = {}
        if asset_ids:
            latest_by_asset_sq = (
                db.query(
                    WorldAssetsRanking.asset_id.label("asset_id"),
                    func.max(WorldAssetsRanking.id).label("max_id"),
                )
                .filter(WorldAssetsRanking.asset_id.in_(asset_ids))
                .group_by(WorldAssetsRanking.asset_id)
                .subquery()
            )
            war_rows = (
                db.query(
                    WorldAssetsRanking.asset_id,
                    WorldAssetsRanking.rank,
                    WorldAssetsRanking.market_cap_usd,
                )
                .join(
                    latest_by_asset_sq,
                    and_(
                        WorldAssetsRanking.asset_id == latest_by_asset_sq.c.asset_id,
                        WorldAssetsRanking.id == latest_by_asset_sq.c.max_id,
                    ),
                )
                .all()
            )
            for r in war_rows:
                war_by_asset_id[r.asset_id] = r

        # ticker 기준 최신 레코드 (간단한 variant 매칭: 원형/문자열 분리 접두)
        war_by_ticker: Dict[str, Any] = {}
        if tickers:
            variants: List[str] = []
            for t in tickers:
                if not t:
                    continue
                t0 = t.strip()
                variants.append(t0)
                for sep in ('.', '-', ':'):
                    if sep in t0:
                        variants.append(t0.split(sep)[0])
            variants = list({v for v in variants if v})

            if variants:
                latest_by_ticker_sq = (
                    db.query(
                        WorldAssetsRanking.ticker.label("ticker"),
                        func.max(WorldAssetsRanking.id).label("max_id"),
                    )
                    .filter(
                        WorldAssetsRanking.ticker.isnot(None),
                        WorldAssetsRanking.ticker.in_(variants),
                    )
                    .group_by(WorldAssetsRanking.ticker)
                    .subquery()
                )
                war_ticker_rows = (
                    db.query(
                        WorldAssetsRanking.ticker,
                        WorldAssetsRanking.rank,
                        WorldAssetsRanking.market_cap_usd,
                    )
                    .join(
                        latest_by_ticker_sq,
                        and_(
                            WorldAssetsRanking.ticker == latest_by_ticker_sq.c.ticker,
                            WorldAssetsRanking.id == latest_by_ticker_sq.c.max_id,
                        ),
                    )
                    .all()
                )
                for r in war_ticker_rows:
                    war_by_ticker[r.ticker.upper()] = r
        
        # 딕셔너리 형태로 변환
        assets_dict = []
        for asset in assets_data:
            # 기본 OHLCV 데이터 조회
            latest_ohlcv = db.query(OHLCVData).filter(
                OHLCVData.asset_id == asset.asset_id,
                OHLCVData.data_interval.is_(None)  # 일봉 데이터는 data_interval이 NULL
            ).order_by(desc(OHLCVData.timestamp_utc)).first()
            
            # 시총 및 랭크 (우선순위: WorldAssetsRanking -> StockFinancials)
            war_market_cap = float(asset.war_market_cap) if getattr(asset, 'war_market_cap', None) is not None else None
            war_ticker_market_cap = float(asset.war_ticker_market_cap) if getattr(asset, 'war_ticker_market_cap', None) is not None else None
            war_name_market_cap = float(asset.war_name_market_cap) if getattr(asset, 'war_name_market_cap', None) is not None else None
            sf_market_cap = float(asset.sf_market_cap) if getattr(asset, 'sf_market_cap', None) is not None else None
            # 보강: 배치 조회 결과 반영
            if war_market_cap is None:
                by_asset = war_by_asset_id.get(asset.asset_id)
                if by_asset and by_asset.market_cap_usd is not None:
                    war_market_cap = float(by_asset.market_cap_usd)
            if war_ticker_market_cap is None:
                by_ticker = war_by_ticker.get(asset.ticker.upper()) if asset.ticker else None
                if by_ticker and by_ticker.market_cap_usd is not None:
                    war_ticker_market_cap = float(by_ticker.market_cap_usd)
            final_market_cap = (
                war_market_cap
                if war_market_cap is not None
                else (war_ticker_market_cap if war_ticker_market_cap is not None else (war_name_market_cap if war_name_market_cap is not None else (sf_market_cap if sf_market_cap is not None else None)))
            )
            # 최후 보강: 여전히 None이면 단건 조회로 최신 랭킹값 채움
            if final_market_cap is None and asset.ticker:
                try:
                    latest_rank_row = (
                        db.query(WorldAssetsRanking)
                        .filter(WorldAssetsRanking.ticker == asset.ticker)
                        .order_by(WorldAssetsRanking.id.desc())
                        .first()
                    )
                    if latest_rank_row and latest_rank_row.market_cap_usd is not None:
                        final_market_cap = float(latest_rank_row.market_cap_usd)
                        # 랭크도 같이 반영
                        if getattr(asset, 'war_rank', None) is None and getattr(asset, 'war_ticker_rank', None) is None and getattr(asset, 'war_name_rank', None) is None:
                            _rank_val = latest_rank_row.rank
                        else:
                            _rank_val = None
                    else:
                        _rank_val = None
                except Exception:
                    _rank_val = None
            else:
                _rank_val = None
            final_rank = (
                int(asset.war_rank)
                if getattr(asset, 'war_rank', None) is not None
                else (
                    int(asset.war_ticker_rank)
                    if getattr(asset, 'war_ticker_rank', None) is not None
                    else (
                        int(asset.war_name_rank)
                        if getattr(asset, 'war_name_rank', None) is not None
                        else (
                            int(war_by_asset_id.get(asset.asset_id).rank)
                            if war_by_asset_id.get(asset.asset_id) is not None and getattr(war_by_asset_id.get(asset.asset_id), 'rank', None) is not None
                            else (
                                int(war_by_ticker.get(asset.ticker.upper()).rank)
                                if asset.ticker and war_by_ticker.get(asset.ticker.upper()) is not None and getattr(war_by_ticker.get(asset.ticker.upper()), 'rank', None) is not None
                                else (_rank_val if _rank_val is not None else None)
                            )
                        )
                    )
                )
            )

            assets_dict.append({
                'asset_id': asset.asset_id,
                'rank': final_rank,
                'ticker': asset.ticker,
                'name': asset.name,
                'asset_type': asset.asset_type,
                'exchange': asset.exchange,
                'currency': asset.currency,
                'price': float(latest_ohlcv.close_price) if latest_ohlcv and latest_ohlcv.close_price else None,
                'change_percent_today': None,  # 실시간 데이터에서 업데이트
                'market_cap': final_market_cap,
                'volume_today': float(latest_ohlcv.volume) if latest_ohlcv and latest_ohlcv.volume else None,
                'change_52w_percent': None,  # 계산에서 업데이트
                'sparkline_30d': None,  # 스파크라인에서 업데이트
                'data_source': 'db',
                'last_updated': latest_ohlcv.timestamp_utc if latest_ohlcv else None,
                'is_realtime': False
            })
        
        # 총 페이지 수 계산
        total_pages = math.ceil(effective_total / page_size)
        
        return {
            'assets': assets_dict,
            'total': effective_total,
            'pages': total_pages
        }
    
    @staticmethod
    async def _enrich_with_realtime_data(
        db: Session,
        assets_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """실시간 데이터로 자산 정보 보강 (성능 최적화)"""
        
        if not assets_data:
            return assets_data
        
        # 배치로 실시간 데이터 조회
        tickers = [asset['ticker'] for asset in assets_data]
        asset_types = [asset['asset_type'] for asset in assets_data]
        
        # asset_id로 실시간 데이터 조회 (최신 데이터만 가져오도록 수정)
        asset_ids = [asset['asset_id'] for asset in assets_data]
        
        # 각 asset_id별로 최신 실시간 데이터만 조회
        realtime_dict = {}
        for asset_id in asset_ids:
            latest_quote = db.query(RealtimeQuote).filter(
                RealtimeQuote.asset_id == asset_id
            ).order_by(desc(RealtimeQuote.timestamp_utc)).first()
            
            if latest_quote:
                realtime_dict[asset_id] = latest_quote
        
        # 배치로 52주 변화율 계산
        asset_ids = [asset['asset_id'] for asset in assets_data]
        ohlcv_data = db.query(
            OHLCVData.asset_id,
            func.max(OHLCVData.close_price).label('latest_price'),
            func.min(OHLCVData.close_price).label('year_ago_price')
        ).filter(
            OHLCVData.asset_id.in_(asset_ids),
            OHLCVData.data_interval.is_(None)  # 일봉 데이터는 data_interval이 NULL
        ).group_by(OHLCVData.asset_id).all()
        
        ohlcv_dict = {item.asset_id: item for item in ohlcv_data}
        
        enriched_data = []
        for asset_item in assets_data:
            asset_id = asset_item['asset_id']
            ticker = asset_item['ticker']
            asset_type = asset_item['asset_type']
            
            # 1. 실시간 데이터 병합 (새로운 구조에 맞게 수정)
            realtime_quote = realtime_dict.get(asset_id)
            
            if realtime_quote:
                # 실시간 데이터 신선도 체크
                freshness_threshold = int(GLOBAL_APP_CONFIGS.get("REALTIME_DATA_FRESHNESS_THRESHOLD_SECONDS", 30))
                current_time = datetime.utcnow()
                data_age = (current_time - realtime_quote.timestamp_utc).total_seconds()
                
                if data_age <= freshness_threshold:
                    # 신선한 실시간 데이터가 있으면 덮어쓰기
                    if realtime_quote.price:
                        asset_item['price'] = float(realtime_quote.price)
                    if realtime_quote.change_percent:
                        asset_item['change_percent_today'] = float(realtime_quote.change_percent)
                    if realtime_quote.volume:
                        asset_item['volume_today'] = float(realtime_quote.volume)
                    asset_item['data_source'] = realtime_quote.data_source
                    asset_item['last_updated'] = realtime_quote.timestamp_utc
                    asset_item['is_realtime'] = True
                    logger.debug(f"실시간 데이터 사용: {ticker}, 나이: {data_age:.1f}초")
                else:
                    # 오래된 데이터는 실시간으로 간주하지 않음
                    asset_item['is_realtime'] = False
                    logger.debug(f"오래된 데이터 무시: {ticker}, 나이: {data_age:.1f}초 (임계값: {freshness_threshold}초)")
            else:
                # 실시간 데이터가 없는 경우
                asset_item['is_realtime'] = False
                # 실시간 데이터가 없으면 data_source에 따라 API에서 직접 조회
                asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
                if asset and asset.data_source:
                    try:
                        if asset.data_source == 'twelvedata':
                            quote_data = await twelvedata_client.get_quote(ticker)
                            if quote_data:
                                asset_item['price'] = quote_data.get('close')
                                asset_item['change_percent_today'] = quote_data.get('percent_change')
                                asset_item['volume_today'] = quote_data.get('volume')
                                asset_item['data_source'] = 'twelvedata'
                                asset_item['last_updated'] = datetime.now()
                        elif asset.data_source == 'tiingo':
                            from app.external_apis.implementations import TiingoClient
                            tiingo_client = TiingoClient()
                            quote_data = await tiingo_client.get_quote(ticker)
                            if quote_data:
                                asset_item['price'] = quote_data.get('last')
                                asset_item['change_percent_today'] = quote_data.get('changePercent')
                                asset_item['volume_today'] = quote_data.get('volume')
                                asset_item['data_source'] = 'tiingo'
                                asset_item['last_updated'] = datetime.now()
                        elif asset.data_source == 'finnhub':
                            # Finnhub API로 직접 조회 (60 calls/minute 제한)
                            from app.external_apis.implementations.finnhub_client import FinnhubClient
                            finnhub_client = FinnhubClient(GLOBAL_APP_CONFIGS.get('FINNHUB_API_KEY'))
                            quote_data = await finnhub_client.get_realtime_quote(ticker)
                            if quote_data:
                                asset_item['price'] = quote_data.price
                                asset_item['change_percent_today'] = quote_data.change_percent
                                asset_item['volume_today'] = quote_data.volume
                                asset_item['data_source'] = 'finnhub'
                                asset_item['last_updated'] = datetime.now()
                                logger.info(f"Finnhub API로 {ticker} 실시간 데이터 조회 성공: ${quote_data.price}")
                    except Exception as e:
                        logger.warning(f"Failed to fetch real-time data for {ticker} from {asset.data_source}: {e}")
                
                # API 조회가 실패하거나 data_source가 없는 경우 OHLCV 데이터를 기본값으로 사용
                if asset_item['price'] is None:
                    # OHLCV에서 최신 가격 조회
                    latest_ohlcv = db.query(OHLCVData).filter(
                        OHLCVData.asset_id == asset_id,
                        OHLCVData.data_interval.is_(None)  # 일봉 데이터는 data_interval이 NULL
                    ).order_by(desc(OHLCVData.timestamp_utc)).first()
                    
                    if latest_ohlcv and latest_ohlcv.close_price:
                        asset_item['price'] = float(latest_ohlcv.close_price)
                        asset_item['volume_today'] = float(latest_ohlcv.volume) if latest_ohlcv.volume else None
                        asset_item['last_updated'] = latest_ohlcv.timestamp_utc
            # 변화율/거래량 보강: OHLCV 기반 보정
            if asset_item.get('change_percent_today') is None:
                # 최근 2일 종가로 today 변동률 계산
                last_two = db.query(OHLCVData).filter(
                    OHLCVData.asset_id == asset_id,
                    OHLCVData.data_interval.is_(None)  # 일봉 데이터는 data_interval이 NULL
                ).order_by(desc(OHLCVData.timestamp_utc)).limit(2).all()
                if len(last_two) >= 2 and last_two[0].close_price and last_two[1].close_price:
                    try:
                        latest_cp = float(last_two[0].close_price)
                        prev_cp = float(last_two[1].close_price)
                        if prev_cp != 0:
                            cpct = ((latest_cp - prev_cp) / prev_cp) * 100.0
                            asset_item['change_percent_today'] = round(cpct, 4)
                    except Exception:
                        pass
            if asset_item.get('volume_today') is None:
                # 최신 OHLCV의 거래량 사용
                latest_ohlcv_v = db.query(OHLCVData).filter(
                    OHLCVData.asset_id == asset_id,
                    OHLCVData.data_interval.is_(None)  # 일봉 데이터는 data_interval이 NULL
                ).order_by(desc(OHLCVData.timestamp_utc)).first()
                if latest_ohlcv_v and latest_ohlcv_v.volume is not None:
                    try:
                        asset_item['volume_today'] = float(latest_ohlcv_v.volume)
                    except Exception:
                        pass
            # 통화 기본값 보강
            if not asset_item.get('currency') and asset_item.get('asset_type') == 'Stocks':
                asset_item['currency'] = 'USD'
            
            # 2. 52주 변화율 계산 (배치 데이터 사용)
            ohlcv_item = ohlcv_dict.get(asset_id)
            if ohlcv_item and ohlcv_item.latest_price and ohlcv_item.year_ago_price:
                try:
                    change_52w = ((float(ohlcv_item.latest_price) - float(ohlcv_item.year_ago_price)) / float(ohlcv_item.year_ago_price)) * 100
                    asset_item['change_52w_percent'] = round(change_52w, 2)
                except (ValueError, ZeroDivisionError):
                    asset_item['change_52w_percent'] = None
            else:
                asset_item['change_52w_percent'] = None
            
            enriched_data.append(asset_item)
        
        return enriched_data
    
    @staticmethod
    async def _enrich_with_sparkline_data(
        db: Session,
        assets_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """스파크라인 데이터로 자산 정보 보강 (성능 최적화)"""
        
        if not assets_data:
            return assets_data
        
        # 배치로 스파크라인 데이터 조회
        tickers = [asset['ticker'] for asset in assets_data]
        asset_types = [asset['asset_type'] for asset in assets_data]
        
        # 한 번의 쿼리로 모든 스파크라인 데이터 조회
        sparkline_records = db.query(SparklineData).filter(
            SparklineData.ticker.in_(tickers),
            SparklineData.asset_type.in_(asset_types)
        ).all()
        
        # 딕셔너리로 변환하여 빠른 조회
        sparkline_dict = {}
        for record in sparkline_records:
            key = f"{record.ticker}_{record.asset_type}"
            sparkline_dict[key] = record
        
        for asset_item in assets_data:
            ticker = asset_item['ticker']
            asset_type = asset_item['asset_type']
            asset_id = asset_item['asset_id']
            
            # 1. 스파크라인 데이터 테이블에서 조회
            sparkline_key = f"{ticker}_{asset_type}"
            sparkline_record = sparkline_dict.get(sparkline_key)
            
            if sparkline_record:
                try:
                    price_data = json.loads(sparkline_record.price_data)
                    asset_item['sparkline_30d'] = price_data
                except (json.JSONDecodeError, TypeError):
                    asset_item['sparkline_30d'] = None
            
            # 2. DB에서 OHLCV 데이터로 스파크라인 생성 (fallback)
            if not asset_item['sparkline_30d']:
                asset_item['sparkline_30d'] = AssetsTableService._get_sparkline_from_ohlcv(
                    db, asset_id
                )
        
        return assets_data
    
    @staticmethod
    def _calculate_52w_change(db: Session, asset_id: int) -> Optional[float]:
        """52주 변화율 계산"""
        try:
            # 최신 가격
            latest_ohlcv = db.query(OHLCVData).filter(
                OHLCVData.asset_id == asset_id,
                OHLCVData.data_interval.is_(None)  # 일봉 데이터는 data_interval이 NULL
            ).order_by(desc(OHLCVData.timestamp_utc)).first()
            
            if not latest_ohlcv or not latest_ohlcv.close_price:
                return None
            
            # 52주 전 가격
            year_ago = datetime.now() - timedelta(days=365)
            year_ago_ohlcv = db.query(OHLCVData).filter(
                OHLCVData.asset_id == asset_id,
                OHLCVData.data_interval.is_(None),  # 일봉 데이터는 data_interval이 NULL
                OHLCVData.timestamp_utc >= year_ago
            ).order_by(OHLCVData.timestamp_utc).first()
            
            if not year_ago_ohlcv or not year_ago_ohlcv.close_price:
                return None
            
            # 변화율 계산
            change_52w = ((float(latest_ohlcv.close_price) - float(year_ago_ohlcv.close_price)) / float(year_ago_ohlcv.close_price)) * 100
            return round(change_52w, 2)
            
        except (ValueError, ZeroDivisionError):
            return None
    
    @staticmethod
    def _get_sparkline_from_ohlcv(db: Session, asset_id: int) -> Optional[List[float]]:
        """OHLCV 데이터에서 스파크라인 생성"""
        try:
            sparkline_data = db.query(OHLCVData.close_price).filter(
                OHLCVData.asset_id == asset_id,
                OHLCVData.data_interval.is_(None)  # 일봉 데이터는 data_interval이 NULL
            ).order_by(desc(OHLCVData.timestamp_utc)).limit(30).all()
            
            if sparkline_data:
                return [float(price.close_price) for price in reversed(sparkline_data)]
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting sparkline from OHLCV for asset {asset_id}: {e}")
            return None
    
    @staticmethod
    async def update_realtime_quotes(
        db: Session,
        tickers: List[str],
        asset_type: str
    ) -> None:
        """실시간 가격 데이터 업데이트"""
        try:
            if asset_type == "stock":
                await AssetsTableService._update_stock_quotes(db, tickers)
            elif asset_type == "crypto":
                await AssetsTableService._update_crypto_quotes(db, tickers)
            else:
                logger.warning(f"Unsupported asset type for realtime quotes: {asset_type}")
                
        except Exception as e:
            logger.error(f"Error updating realtime quotes: {e}")
    
    @staticmethod
    async def _update_stock_quotes(db: Session, tickers: List[str]) -> None:
        """주식 실시간 가격 업데이트 (Twelve Data) - 새로운 RealtimeQuote 구조에 맞게 수정 필요"""
        # TODO: 새로운 RealtimeQuote 모델 구조에 맞게 수정 필요
        # 현재 RealtimeQuote는 asset_id 기반이므로 ticker로 직접 조회 불가
        logger.warning("_update_stock_quotes is not implemented for new RealtimeQuote structure")
        pass
    
    @staticmethod
    async def _update_crypto_quotes(db: Session, tickers: List[str]) -> None:
        """암호화폐 실시간 가격 업데이트 (Binance) - 새로운 RealtimeQuote 구조에 맞게 수정 필요"""
        # TODO: 새로운 RealtimeQuote 모델 구조에 맞게 수정 필요
        # 현재 RealtimeQuote는 asset_id 기반이므로 ticker로 직접 조회 불가
        logger.warning("_update_crypto_quotes is not implemented for new RealtimeQuote structure")
        pass
