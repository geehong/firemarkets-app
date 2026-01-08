import asyncio
import os
import sys
import json

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.services.news_ai_agent import NewsAIEditorAgent

async def test_narrative_style():
    print("Testing Narrative Style for analyze_cluster...")
    try:
        agent = NewsAIEditorAgent()
        
        # Mock cluster
        class MockPost:
            def __init__(self, title, content, source):
                self.title = {"en": title}
                self.content = content
                self.post_info = {"source": source}
                self.published_at = None

        cluster = [
            MockPost("Bitcoin ETF Inflows Surge", "U.S. spot Bitcoin ETFs saw $500M in net inflows yesterday.", "CoinDesk"),
            MockPost("MicroStrategy Buys More Bitcoin", "MicroStrategy acquired another 10,000 BTC for $900M.", "The Block")
        ]
        
        print("\nCalling analyze_cluster...")
        result = await agent.analyze_cluster(cluster)
        
        if result:
            print("\n[Success] AI Response Received:")
            print(f"Title (KO): {result.get('title_ko')}")
            print(f"Summary (KO): {result.get('summary_ko')}")
            print(f"Analysis (KO): {result.get('analysis_ko')}")
            
            # Verify it's a string, not a list
            if isinstance(result.get('summary_ko'), str):
                print("\n✅ Verification: summary_ko is a string (Narrative style)")
            else:
                print("\n❌ Warning: summary_ko is still a list")
        else:
            print("\n[Failed] No response from AI agent.")

    except Exception as e:
        print(f"\n[Error] Exception occurred: {e}")

if __name__ == "__main__":
    asyncio.run(test_narrative_style())
