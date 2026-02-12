import json
import os
import random
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class PromoTemplateLoader:
    def __init__(self):
        self.template_file = os.path.join(os.path.dirname(__file__), 'promo_templates.json')
        self.templates = self._load_templates()
        
        # Hardcoded fallback templates in case file load fails
        self.fallback_templates = {
            "general": {
                "ko": [
                    "<strong><a href=\"https://firemarkets.net\">FireMarkets</a></strong>에서 제공하는 <a href=\"https://firemarkets.net/blog\">Market Insight</a>를 통해 시장 트렌드를 확인하세요.",
                    "더 많은 시장 분석은 <strong><a href=\"https://firemarkets.net\">FireMarkets</a></strong>에서 확인하실 수 있습니다."
                ],
                "en": [
                    "Check market trends via <a href=\"https://firemarkets.net/blog\">Market Insight</a> on <strong><a href=\"https://firemarkets.net\">FireMarkets</a></strong>.",
                    "Find more market analysis on <strong><a href=\"https://firemarkets.net\">FireMarkets</a></strong>."
                ]
            }
        }

    def _load_templates(self) -> Dict:
        """Load templates from JSON file"""
        try:
            with open(self.template_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load promo templates from {self.template_file}: {e}")
            return {}

    def get_category_for_ticker(self, ticker: str) -> str:
        """Determine category for a given ticker"""
        if not self.templates:
            return "general"
            
        mapping = self.templates.get("ticker_category_map", {})
        # Check exact match
        if ticker in mapping:
            return mapping[ticker]
            
        # Heuristic checks if not in map (optional, but keep simple for now)
        # e.g. checking for USDT suffix for crypto
        if ticker.endswith("USDT"):
            return "crypto"
            
        return "general"

    def get_promo_candidates(self, tickers: List[str] = None, category: str = None, count: int = 3) -> Dict[str, List[str]]:
        """
        Select random promo templates based on tickers.
        Returns a dict with 'ko' and 'en' lists of strings.
        """
        # Determine primary ticker for formatting
        primary_ticker = None
        if tickers and len(tickers) > 0:
            primary_ticker = tickers[0]

        # Use provided category or determine from tickers
        if not category:
            category = "general"
            if tickers and len(tickers) > 0:
                for t in tickers:
                    cat = self.get_category_for_ticker(t)
                    if cat != "general":
                        category = cat
                        primary_ticker = t
                        break
        
        logger.info(f"Selected promo category '{category}' for tickers: {tickers}")

        # Retrieve templates for category
        if self.templates and category in self.templates:
            source = self.templates[category]
        else:
            # Fallback to general if category not found in templates
            if self.templates and "general" in self.templates:
                source = self.templates["general"]
                category = "general" # fallback
            else:
                source = self.fallback_templates["general"]
                category = "general_fallback"

        # Select random candidates
        candidates = {
            "ko": [],
            "en": []
        }
        
        for lang in ["ko", "en"]:
            pool = source.get(lang, [])
            if not pool:
                continue
                
            # Random selection
            selected = random.sample(pool, min(len(pool), count))
            
            formatted = []
            for tmpl in selected:
                try:
                    txt = tmpl
                    if primary_ticker:
                        # Simple name derivation (can be improved by passing name)
                        name = primary_ticker.replace("USDT", "")
                        txt = txt.replace("{Ticker}", primary_ticker).replace("{Name}", name)
                    else:
                        txt = txt.replace("{Ticker}", "").replace("{Name}", "")
                    formatted.append(txt)
                except Exception as e:
                    logger.error(f"Error formatting promo template: {e}")
                    formatted.append(tmpl) # fallback to raw
            
            candidates[lang] = formatted
            
        return candidates

# Singleton instance
_loader_instance = None

def get_promo_candidates(tickers: List[str] = None, category: str = None, count: int = 3) -> Dict[str, List[str]]:
    """Global accessor for promo candidates"""
    global _loader_instance
    if _loader_instance is None:
        _loader_instance = PromoTemplateLoader()
    return _loader_instance.get_promo_candidates(tickers, category, count)
