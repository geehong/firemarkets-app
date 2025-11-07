import json
import os
from functools import lru_cache
from typing import Dict


@lru_cache(maxsize=1)
def _load_asset_mapping() -> Dict:
    """Load asset mapping JSON once with simple caching."""
    # Resolve path to asset_mapping.json
    current_dir = os.path.dirname(os.path.abspath(__file__))
    mapping_path = os.path.join(current_dir, "asset_mapping.json")
    try:
        with open(mapping_path, "r", encoding="utf-8") as f:
            return json.load(f) or {}
    except Exception:
        return {}


def get_symbol_for_provider(raw_ticker: str, provider: str) -> str:
    """Return provider-specific normalized symbol using mapping file with sensible defaults.

    - If mapping contains overrides, use them.
    - Otherwise, apply conservative defaults:
      - binance: ensure USDT quote (e.g., BTC -> BTCUSDT)
      - coinbase: ensure -USD quote (e.g., BTC -> BTC-USD, BTCUSDT -> BTC-USD)
    """
    t = (raw_ticker or "").upper().strip()
    mapping = _load_asset_mapping()

    # Check provider_mapping first (new format)
    provider_mapping: Dict[str, Dict[str, str]] = mapping.get("provider_mapping", {})
    provider_overrides: Dict[str, str] = provider_mapping.get(provider.lower(), {})
    
    if t in provider_overrides:
        return provider_overrides[t]

    # Optional overrides section we can add in JSON later without breaking (legacy format)
    overrides: Dict[str, Dict[str, str]] = mapping.get("symbol_overrides", {})
    legacy_provider_overrides: Dict[str, str] = overrides.get(provider.lower(), {})

    if t in legacy_provider_overrides:
        return legacy_provider_overrides[t]

    if provider.lower() == "binance":
        # If already provider-formatted
        if t.endswith("USDT"):
            return t
        # Basic default: append USDT
        return f"{t}USDT"

    if provider.lower() == "coinbase":
        # If already provider-formatted
        if "-" in t:
            return t
        if t.endswith("USDT"):
            base = t[:-4] or "USDT"
            return f"{base}-USD"
        return f"{t}-USD"

    # Fallback: return as-is
    return t



