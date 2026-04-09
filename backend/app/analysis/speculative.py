
import logging
import torch
from transformers import pipeline

logger = logging.getLogger(__name__)

class SentimentAnalyzer:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SentimentAnalyzer, cls).__new__(cls)
            cls._instance._pipeline = None
        return cls._instance

    def _initialize_pipeline(self):
        try:
            device = 0 if torch.cuda.is_available() else -1
            logger.info(f"Initializing SentimentAnalyzer on device: {'GPU' if device == 0 else 'CPU'}")
            
            # Using FinBERT for financial sentiment analysis
            # It's lightweight enough for 3050 Ti (4GB VRAM)
            self._pipeline = pipeline(
                "sentiment-analysis",
                model="ProsusAI/finbert",
                device=device
            )
            logger.info("SentimentAnalyzer initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize SentimentAnalyzer: {e}")
            self._pipeline = None

    def analyze(self, text: str):
        if not text or len(text.strip()) < 5:
            return {"label": "neutral", "score": 0.5}

        # Lazy initialization
        if self._pipeline is None:
            logger.info("Initializing SentimentAnalyzer on first use...")
            self._initialize_pipeline()

        if not self._pipeline:
            logger.warning("Sentiment pipeline not initialized. Returning neutral.")
            return {"label": "neutral", "score": 0.5}

        try:
            # Truncate text to max length of model (512 tokens usually)
            # FinBERT uses 512 tokens. 512 characters is a safe lower bound.
            clean_text = text[:512]
            logger.debug(f"Analyzing sentiment for text (len={len(clean_text)})")
            
            # Record start time for performance tracking
            import time
            start_time = time.time()
            
            result = self._pipeline(clean_text)[0]
            
            duration = time.time() - start_time
            logger.info(f"Sentiment analysis completed in {duration:.3f}s: {result}")
            
            return result
        except Exception as e:
            logger.error(f"Error during sentiment analysis: {e}")
            return {"label": "error", "score": 0.0}

sentiment_analyzer = SentimentAnalyzer()
