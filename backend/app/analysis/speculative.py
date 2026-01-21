
import logging
import torch
from transformers import pipeline

logger = logging.getLogger(__name__)

class SentimentAnalyzer:
    _instance = None
    _pipeline = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SentimentAnalyzer, cls).__new__(cls)
            cls._instance._initialize_pipeline()
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
        if not self._pipeline:
            logger.warning("Sentiment pipeline not initialized. Returning neutral.")
            return {"label": "neutral", "score": 0.5}

        try:
            # Truncate text to max length of model (512 tokens usually)
            result = self._pipeline(text[:512])[0]
            # FinBERT returns: positive, negative, neutral
            return result
        except Exception as e:
            logger.error(f"Error during sentiment analysis: {e}")
            return {"label": "error", "score": 0.0}

sentiment_analyzer = SentimentAnalyzer()
