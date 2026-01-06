import asyncio
import os
import logging
from app.services.news_ai_agent import NewsAIEditorAgent
from app.core.config import GOOGLE_API_KEY, GROQ_API_KEY

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_gemma():
    print("--- Starting Gemma Model Test ---")
    
    # API 키 확인
    if not GOOGLE_API_KEY:
        print("ERROR: GOOGLE_API_KEY is missing!")
        return
        
    print(f"GOOGLE_API_KEY present: {bool(GOOGLE_API_KEY)}")
    
    try:
        agent = NewsAIEditorAgent()
        print("NewsAIEditorAgent initialized successfully.")
        
        # Gemma 모델 리스트 확인
        print(f"Gemma Collection Models: {agent.gemma_collection_models}")
        
        # 테스트 데이터 준비
        test_items = [
            {
                "id": "test-1",
                "title": "Bitcoin Surges Past $40,000 Amid ETF Approval Hopes",
                "description": "Bitcoin price rallied significantly today as investors anticipate the approval of a spot Bitcoin ETF by the SEC."
            },
            {
                "id": "test-2",
                "title": "Apple Stock Hits All-Time High on New Vision Pro Release",
                "description": "Apple shares reached a new record high following the positive reception of its mixed reality headset, the Vision Pro."
            }
        ]
        
        print("\n--- Testing translate_batch (should use Gemma) ---")
        print("Calling agent.translate_batch()...")
        
        # translate_batch 호출 (내부적으로 _generate_content(task_type="collection") -> _call_gemma 호출)
        result = await agent.translate_batch(test_items)
        
        if result:
            print("\n--- Test Result: SUCCESS ---")
            for item in result:
                print(f"\nID: {item.get('id')}")
                print(f"Original Title: {item.get('title')}")
                print(f"Translated Title (KR): {item.get('title_ko')}")
                print(f"Content (KR): {item.get('content_ko')[:100]}...") # 내용 일부 출력
        else:
            print("\n--- Test Result: FAILED (No result returned) ---")
            
    except Exception as e:
        print(f"\n--- Test Result: ERROR ---")
        print(f"Exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_gemma())
