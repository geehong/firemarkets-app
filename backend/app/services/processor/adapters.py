import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from ...utils.helpers import safe_float

logger = logging.getLogger(__name__)

class BaseAdapter(ABC):
    """데이터 제공자 어댑터 추상 기본 클래스"""
    
    def __init__(self, validator):
        self.validator = validator

    @abstractmethod
    def parse_message(self, message_data: Dict[bytes, bytes]) -> Optional[Dict[str, Any]]:
        """Redis 스트림 메시지를 파싱하여 표준 형식으로 반환"""
        pass

    def _decode(self, data: bytes) -> str:
        """바이트 데이터를 문자열로 디코딩"""
        return data.decode('utf-8') if isinstance(data, bytes) else str(data)

class BinanceAdapter(BaseAdapter):
    def parse_message(self, message_data: Dict[bytes, bytes]) -> Optional[Dict[str, Any]]:
        try:
            symbol = self._decode(message_data.get(b'symbol', b'')).upper()
            price = safe_float(self._decode(message_data.get(b'price', b'')))
            volume = safe_float(self._decode(message_data.get(b'volume', b'')))
            raw_timestamp = self._decode(message_data.get(b'raw_timestamp', b''))
            
            if not symbol or price is None:
                return None

            # 심볼 정규화 (BINANCE:BTCUSDT -> BTCUSDT)
            if ':' in symbol:
                symbol = symbol.split(':')[-1]

            # 베이스 심볼 보정 (BTC -> BTCUSDT)
            if not symbol.endswith('USDT') and '-' not in symbol:
                symbol = f"{symbol}USDT"

            return {
                "ticker": symbol,
                "price": price,
                "volume": volume,
                "timestamp_utc": self.validator.parse_timestamp(raw_timestamp),
                "data_source": "binance"
            }
        except Exception as e:
            logger.warning(f"Binance parsing error: {e}")
            return None

class CoinbaseAdapter(BaseAdapter):
    def parse_message(self, message_data: Dict[bytes, bytes]) -> Optional[Dict[str, Any]]:
        try:
            symbol = self._decode(message_data.get(b'symbol', b'')).upper()
            price = safe_float(self._decode(message_data.get(b'price', b'')))
            volume = safe_float(self._decode(message_data.get(b'volume', b'')))
            raw_timestamp = self._decode(message_data.get(b'raw_timestamp', b''))
            
            if not symbol or price is None:
                return None

            original_symbol = symbol
            
            # 심볼 형식 변환 (ETH-USD -> ETHUSDT)
            if symbol.endswith('-USD') and len(symbol) > 4:
                base = symbol[:-4]
                symbol = f"{base}USDT"
            
            # 예외 매핑
            overrides = {
                'WBTC-USD': 'WBTCUSDT',
                'PAXG-USD': 'PAXGUSDT'
            }
            if original_symbol in overrides:
                symbol = overrides[original_symbol]

            # 베이스 심볼 보정
            if not symbol.endswith('USDT') and '-' not in symbol:
                symbol = f"{symbol}USDT"

            return {
                "ticker": symbol,
                "price": price,
                "volume": volume,
                "timestamp_utc": self.validator.parse_timestamp(raw_timestamp),
                "data_source": "coinbase"
            }
        except Exception as e:
            logger.warning(f"Coinbase parsing error: {e}")
            return None

class SwissquoteAdapter(BaseAdapter):
    def parse_message(self, message_data: Dict[bytes, bytes]) -> Optional[Dict[str, Any]]:
        try:
            symbol = self._decode(message_data.get(b'symbol', b'')).upper()
            price = safe_float(self._decode(message_data.get(b'price', b'')))
            volume = safe_float(self._decode(message_data.get(b'volume', b'')))
            raw_timestamp = self._decode(message_data.get(b'raw_timestamp', b''))
            
            if not symbol or price is None:
                return None

            # 심볼 역정규화
            mapping = {
                'XAU/USD': 'GCUSD',
                'XAG/USD': 'SIUSD'
            }
            if symbol in mapping:
                symbol = mapping[symbol]

            return {
                "ticker": symbol,
                "price": price,
                "volume": volume,
                "timestamp_utc": self.validator.parse_timestamp(raw_timestamp),
                "data_source": "swissquote"
            }
        except Exception as e:
            logger.warning(f"Swissquote parsing error: {e}")
            return None

class DefaultAdapter(BaseAdapter):
    def parse_message(self, message_data: Dict[bytes, bytes]) -> Optional[Dict[str, Any]]:
        try:
            # 기본 파싱 시도
            symbol = self._decode(message_data.get(b'symbol', b'')).upper()
            price = safe_float(self._decode(message_data.get(b'price', b'')))
            volume = safe_float(self._decode(message_data.get(b'volume', b'')))
            raw_timestamp = self._decode(message_data.get(b'raw_timestamp', b''))
            provider = self._decode(message_data.get(b'provider', b'unknown'))

            # Legacy JSON 파싱
            if not symbol and b'data' in message_data:
                try:
                    data_json = json.loads(self._decode(message_data[b'data']))
                    symbol = data_json.get('symbol', '').upper()
                    price = safe_float(data_json.get('price'))
                    volume = safe_float(data_json.get('volume'))
                    raw_timestamp = str(data_json.get('raw_timestamp', ''))
                    provider = self._decode(message_data.get(b'provider', b'finnhub'))
                except Exception:
                    pass

            if not symbol or price is None:
                return None

            if ':' in symbol:
                symbol = symbol.split(':')[-1]

            return {
                "ticker": symbol,
                "price": price,
                "volume": volume,
                "timestamp_utc": self.validator.parse_timestamp(raw_timestamp),
                "data_source": provider
            }
        except Exception as e:
            logger.warning(f"Default parsing error: {e}")
            return None

class AdapterFactory:
    def __init__(self, validator):
        self.adapters = {
            'binance': BinanceAdapter(validator),
            'coinbase': CoinbaseAdapter(validator),
            'swissquote': SwissquoteAdapter(validator)
        }
        self.default_adapter = DefaultAdapter(validator)

    def get_adapter(self, provider: str) -> BaseAdapter:
        return self.adapters.get(provider, self.default_adapter)
