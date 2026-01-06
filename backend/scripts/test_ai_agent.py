import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.services.news_ai_agent import NewsAIEditorAgent

async def test_ai():
    print("Initializing NewsAIEditorAgent...")
    try:
        agent = NewsAIEditorAgent()
        # Force Gemini
        agent._get_provider = lambda x="general": "gemini"
        
        print(f"Gemini Available: {agent.gemini_available}")
        if agent.gemini_available:
             print(f"Gemini Model: {agent.gemini_model.model_name}")

        print("\nTesting rewrite_post...")
        sample_post = {
            "title": "Bitcoin Price Soars Past $90,000",
            "content": "Bitcoin has reached a new all-time high today, driven by institutional adoption and ETF inflows."
        }
        
        result = await agent.rewrite_post(sample_post)
        
        if result:
            print("\n[Success] AI Response Received:")
            print(f"Title (EN): {result.get('title_en')}")
            print(f"Title (KO): {result.get('title_ko')}")
        else:
            print("\n[Failed] No response from AI agent.")

    except Exception as e:
        print(f"\n[Error] Exception occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_ai())
