
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
            if torch.cuda.is_available():
                # ⚠️ GPU 메모리 제한: RTX 3050 (4GB VRAM) 환경에서 PyTorch가 캐시를 쌓아 
                # VRAM을 독점하는 것을 방지하기 위해 최대 15% (~614MB)로 메모리 사용 제한
                try:
                    torch.cuda.set_per_process_memory_fraction(0.15, device=0)
                    logger.info("Set PyTorch VRAM allocation limit to 15% (~614MB)")
                except Exception as mem_err:
                    logger.warning(f"Could not set VRAM fraction: {mem_err}")
                device = 0
            else:
                device = -1
                
            logger.info(f"Initializing SentimentAnalyzer on device: {'GPU' if device == 0 else 'CPU'}")
            
            # Using FinBERT for financial sentiment analysis
            self._pipeline = pipeline(
                "sentiment-analysis",
                model="ProsusAI/finbert",
                device=device
            )
            logger.info(f"SentimentAnalyzer initialized successfully on {'GPU' if device == 0 else 'CPU'}.")
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
            clean_text = text[:512]
            logger.debug(f"Analyzing sentiment for text (len={len(clean_text)})")
            
            # Record start time for performance tracking
            import time
            start_time = time.time()
            
            result = self._pipeline(clean_text)[0]
            
            duration = time.time() - start_time
            logger.info(f"Sentiment analysis completed in {duration:.3f}s: {result}")
            
            # ⚠️ 사용 완료 후 GPU 캐시를 즉시 반환하여 VRAM 누적 방지
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                
            return result
        except Exception as e:
            logger.error(f"Error during sentiment analysis: {e}")
            return {"label": "error", "score": 0.0}

sentiment_analyzer = SentimentAnalyzer()
