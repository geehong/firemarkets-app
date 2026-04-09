import asyncio
import os
import sys
import logging

# Set up logging to see our logger messages
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.news_ai_agent import NewsAIEditorAgent

async def test_agent():
    print("--- Starting NewsAIEditorAgent Test ---")
    
    # 1. Initialization
    agent = NewsAIEditorAgent()
    print(f"Gemini Available: {agent.gemini_available}")
    print(f"Groq Available: {agent.groq_available}")
    print(f"Collection Pool: {agent.collection_pool}")
    print(f"Heavy Duty Pool: {agent.heavy_duty_pool}")
    
    # Wait a bit for warmup to finish if it's running
    print("\nWaiting for warmup validation...")
    await asyncio.sleep(8) 
    print(f"Collection Pool after warmup: {agent.collection_pool}")

    # 2. Test Routing Logic
    print("\n--- Testing Routing Logic ---")
    print(f"Provider for 'collection': {agent._get_provider('collection')}")
    print(f"Provider for 'analysis': {agent._get_provider('analysis')}")
    print(f"Provider for 'merge': {agent._get_provider('merge')}")
    print(f"Provider for 'general': {agent._get_provider('general')}")

    # 3. Test Batch Translation (Array JSON Parsing)
    print("\n--- Testing Batch Translation (Array JSON) ---")
    test_items = [
        {"id": "1", "title": "Bitcoin reaches new ATH", "description": "BTC price soared above $100k today."},
        {"id": "2", "title": "Ethereum upgrade success", "description": "The latest hardfork went smoothly."}
    ]
    try:
        translated = await agent.translate_batch(test_items)
        print(f"Successfully translated {len(translated)} items.")
        if len(translated) > 0:
            print(f"First item title_ko: {translated[0].get('title_ko')}")
    except Exception as e:
        print(f"Translation failed: {e}")

    # 4. Test Analyze Cluster (Analysis Task Type)
    print("\n--- Testing Analyze Cluster (Analysis Task) ---")
    # Stub cluster
    class MockPost:
        def __init__(self, title, description, url):
            self.title = {"en": title}
            self.description = description
            self.post_info = {"url": url, "source": "Reuters", "tickers": ["BTC"]}
            self.published_at = None
            self.asset = None

    cluster = [
        MockPost("BTC Surge", "Bitcoin is going up", "https://example.com/1"),
        MockPost("Crypto Regulation", "SEC is talking about crypto", "https://example.com/2")
    ]
    
    try:
        # This will use task_type="analysis" -> Groq (if available) or Gemini
        analysis = await agent.analyze_cluster(cluster)
        if analysis:
            print("Successfully analyzed cluster.")
            print(f"Title KO: {analysis.get('title_ko')}")
            print(f"Sentiment: {analysis.get('sentiment')}")
        else:
            print("Analysis returned None.")
    except Exception as e:
        print(f"Analysis failed: {e}")

    print("\n--- Test Finished ---")

if __name__ == "__main__":
    asyncio.run(test_agent())
