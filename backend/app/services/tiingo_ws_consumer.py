"""
Async Tiingo WebSocket consumer: subscribes to tickers and upserts realtime quotes.
"""
import asyncio
import json
import logging
from typing import List, Optional, Set
from datetime import datetime, timedelta

import websockets

from ..core.database import SessionLocal
from ..models.realtime import RealtimeQuote
from ..core.config import GLOBAL_APP_CONFIGS
from ..models import OHLCVData, Asset
import os

logger = logging.getLogger(__name__)


class TiingoWSConsumer:
    def __init__(self, auth_token: Optional[str], service: str = "iex"):
        # prefer explicit token -> global configs -> environment variable
        self.auth_token = auth_token or GLOBAL_APP_CONFIGS.get("TIINGO_API_KEY") or os.getenv("TIINGO_API_KEY")
        self.service = service
        # IEX stocks/ETFs funds ws endpoint
        self.ws_url = "wss://api.tiingo.com/iex" if service == "iex" else "wss://api.tiingo.com/test"
        self._task: Optional[asyncio.Task] = None
        self._stop = asyncio.Event()
        self._tickers: Set[str] = set()
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        # observability
        self.last_connect_at: Optional[datetime] = None
        self.last_tick_at: Optional[datetime] = None
        self.last_error: Optional[str] = None
        self._last_sub_payload: Optional[dict] = None
        self._no_tick_backfill_seconds: int = 120

    def list_subscriptions(self) -> List[str]:
        return sorted(self._tickers)

    async def add_tickers(self, tickers: List[str]):
        new_set = {t.upper() for t in tickers or []}
        if not new_set:
            return
        self._tickers |= new_set
        await self._send_subscribe()

    async def remove_tickers(self, tickers: List[str]):
        rem_set = {t.upper() for t in tickers or []}
        self._tickers -= rem_set
        await self._send_subscribe()

    async def start(self, tickers: List[str]):
        self._tickers = {t.upper() for t in tickers or []}
        self._stop.clear()
        if not self.auth_token:
            logger.error("Tiingo WS auth token not configured")
        # Backfill immediately so table has values even before first tick
        await self._backfill_latest_prices(list(self._tickers))
        self.last_tick_at = None
        if self._task and not self._task.done():
            logger.info("Tiingo WS consumer already running")
            # refresh subscription
            await self._send_subscribe()
            return
        self._task = asyncio.create_task(self._run())
        logger.info(f"Tiingo WS consumer started for {sorted(self._tickers)}")

    async def stop(self):
        self._stop.set()
        if self._task:
            await asyncio.sleep(0)
            logger.info("Tiingo WS consumer stop signaled")

    async def _run(self):
        backoff = 1
        while not self._stop.is_set():
            try:
                if not self.auth_token:
                    logger.error("Tiingo WS auth token not configured")
                    await asyncio.sleep(10)
                    continue
                async with websockets.connect(self.ws_url, ping_interval=20, ping_timeout=20) as ws:
                    self._ws = ws
                    self.last_connect_at = datetime.utcnow()
                    await self._send_subscribe()
                    backoff = 1
                    while not self._stop.is_set():
                        try:
                            raw = await asyncio.wait_for(ws.recv(), timeout=30)
                            await self._handle_message(raw)
                        except asyncio.TimeoutError:
                            # Heartbeat: if no tick for a while, perform gentle backfill
                            if self._should_backfill_due_to_no_ticks():
                                await self._backfill_latest_prices(list(self._tickers))
                            # also try to re-send subscription to keep stream alive
                            await self._send_subscribe()
                            continue
            except Exception as e:
                logger.warning(f"Tiingo WS error: {e}; reconnecting in {backoff}s")
                self.last_error = str(e)
                self._ws = None
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 60)

    async def _send_subscribe(self):
        if not self._tickers:
            return
        payload = {
            "eventName": "subscribe",
            "eventData": {
                "authToken": self.auth_token,
                "tickers": sorted(list(self._tickers)),
            },
        }
        try:
            if self._ws is not None:
                await self._ws.send(json.dumps(payload))
                self._last_sub_payload = payload
                logger.info(f"Subscribed to Tiingo WS {self.ws_url} for {sorted(self._tickers)}")
        except Exception as e:
            logger.warning(f"Failed to send subscribe: {e}")

    async def _handle_message(self, raw: str):
        try:
            msg = json.loads(raw)
        except Exception:
            logger.debug(f"Non-JSON WS message: {raw}")
            return
        mtype = msg.get("messageType")
        if mtype == "H":
            return
        if mtype in ("I", "E"):
            logger.info(f"Tiingo WS info: {msg}")
            return
        data = msg.get("data")
        if not data:
            return
        # Data messages can be single object or list
        if isinstance(data, dict):
            await self._upsert_quote(data)
        elif isinstance(data, list):
            for item in data:
                await self._upsert_quote(item)

    async def _upsert_quote(self, item: dict):
        # Tiingo IEX payload fields: ticker, last, bidPrice, askPrice, volume, timestamp, prevClose (sometimes)
        ticker = (item.get("ticker") or item.get("symbol") or "").upper()
        if not ticker:
            return
        price = item.get("last") or item.get("price") or item.get("close")
        volume = item.get("volume")
        prev_close = item.get("prevClose") or item.get("open")
        change_pct = None
        try:
            if price is not None and prev_close is not None:
                change_pct = ((float(price) - float(prev_close)) / float(prev_close)) * 100.0
        except Exception:
            change_pct = None
        db = SessionLocal()
        try:
            # Fallback prevClose from DB if missing
            if prev_close is None:
                prev_close = self._get_prev_close_from_db(db, ticker)
                if prev_close is not None and price is not None:
                    try:
                        change_pct = ((float(price) - float(prev_close)) / float(prev_close)) * 100.0
                    except Exception:
                        pass
            quote = db.query(RealtimeQuote).filter(
                RealtimeQuote.ticker == ticker,
                RealtimeQuote.asset_type == "Stocks",
            ).first()
            if not quote:
                quote = RealtimeQuote(
                    ticker=ticker,
                    asset_type="Stocks",
                    data_source="tiingo_ws",
                )
                db.add(quote)
            quote.price = float(price) if price is not None else quote.price
            quote.volume_today = float(volume) if volume is not None else quote.volume_today
            quote.change_percent_today = float(change_pct) if change_pct is not None else quote.change_percent_today
            quote.data_source = "tiingo_ws"
            db.commit()
            self.last_tick_at = datetime.utcnow()
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to upsert realtime quote for {ticker}: {e}")
        finally:
            db.close()

    async def _backfill_latest_prices(self, tickers: List[str]):
        if not tickers:
            return
        db = SessionLocal()
        try:
            for t in tickers:
                sym = t.upper()
                asset = db.query(Asset).filter(Asset.ticker == sym).first()
                if not asset:
                    continue
                latest = db.query(OHLCVData).filter(
                    OHLCVData.asset_id == asset.asset_id,
                    OHLCVData.data_interval == '1d'
                ).order_by(OHLCVData.timestamp_utc.desc()).first()
                if not latest:
                    continue
                quote = db.query(RealtimeQuote).filter(
                    RealtimeQuote.ticker == sym,
                    RealtimeQuote.asset_type == "Stocks",
                ).first()
                if not quote:
                    quote = RealtimeQuote(
                        ticker=sym,
                        asset_type="Stocks",
                        data_source="db_backfill",
                    )
                    db.add(quote)
                quote.price = float(latest.close_price) if latest.close_price is not None else quote.price
                quote.volume_today = float(latest.volume) if latest.volume is not None else quote.volume_today
                quote.change_percent_today = float(latest.change_percent) if latest.change_percent is not None else quote.change_percent_today
                quote.data_source = "db_backfill"
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Backfill failed: {e}")
        finally:
            db.close()

    def _should_backfill_due_to_no_ticks(self) -> bool:
        if not self._tickers:
            return False
        if self.last_tick_at is None:
            # since start, no ticks yet
            if self.last_connect_at is None:
                return False
            return (datetime.utcnow() - self.last_connect_at) > timedelta(seconds=self._no_tick_backfill_seconds)
        else:
            return (datetime.utcnow() - self.last_tick_at) > timedelta(seconds=self._no_tick_backfill_seconds)

    def _get_prev_close_from_db(self, db, ticker: str) -> Optional[float]:
        try:
            asset = db.query(Asset).filter(Asset.ticker == ticker).first()
            if not asset:
                return None
            rows = db.query(OHLCVData).filter(
                OHLCVData.asset_id == asset.asset_id,
                OHLCVData.data_interval == '1d'
            ).order_by(OHLCVData.timestamp_utc.desc()).limit(2).all()
            if len(rows) >= 2 and rows[1].close_price is not None:
                return float(rows[1].close_price)
            # fallback: use latest close if only one exists
            if len(rows) >= 1 and rows[0].close_price is not None:
                return float(rows[0].close_price)
        except Exception as e:
            logger.debug(f"prevClose fallback failed for {ticker}: {e}")
        return None


# Singleton manager
_consumer: Optional[TiingoWSConsumer] = None


def get_consumer() -> TiingoWSConsumer:
    global _consumer
    if _consumer is None:
        _consumer = TiingoWSConsumer(auth_token=GLOBAL_APP_CONFIGS.get("TIINGO_API_KEY") or os.getenv("TIINGO_API_KEY"))
    return _consumer
