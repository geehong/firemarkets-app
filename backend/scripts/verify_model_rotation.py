import asyncio
import sys
import os
from unittest.mock import MagicMock, AsyncMock, patch
import google.generativeai as genai

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.services.news_ai_agent import NewsAIEditorAgent

async def run_verification():
    print("=== Starting Model Rotation Verification ===")
    
    # 1. Instantiate Agent
    agent = NewsAIEditorAgent()
    print(f"Initial Model Config: {agent.gemini_model_list}")
    print(f"Current Model: {agent.gemini_model_list[agent.current_model_index]}")
    
    # 2. Verify Provider Routing
    print("\n[Check 1] Provider Routing:")
    merge_provider = agent._get_provider("merge")
    rewrite_provider = agent._get_provider("rewrite")
    print(f" -> 'merge' task routed to: {merge_provider}")
    print(f" -> 'rewrite' task routed to: {rewrite_provider}")
    
    if merge_provider != 'groq' and agent.groq_available:
        print("X FAIL: Merge should go to Groq if available")
    if rewrite_provider != 'gemini':
         print("X FAIL: Rewrite should go to Gemini")

    # 3. Verify Model Rotation Logic (Mocking)
    print("\n[Check 2] Gemini Model Rotation on Quota Error:")
    
    # Mock the gemini_model object on the agent
    mock_model = AsyncMock()
    agent.gemini_model = mock_model
    
    # Setup side_effect to fail first 2 times with Quota error, then succeed
    error_429 = Exception("429 Resource has been exhausted (e.g. check quota).")
    mock_model.generate_content_async.side_effect = [
        error_429, # Fail 1 (gemini-3-flash)
        error_429, # Fail 2 (gemini-2.5-flash)
        MagicMock(text="Success Response from Model 3") # Success (gemini-2.5-flash-lite)
    ]
    
    # We need to patch genai.GenerativeModel to return our mock when re-instantiated
    with patch('google.generativeai.GenerativeModel', return_value=mock_model) as mock_constructor:
        try:
            # Force using Gemini for this call
            agent.gemini_available = True
            
            print(" -> Sending request (expecting 2 failures causing rotation)...")
            response_text = await agent._call_gemini("Test Prompt")
            
            print(f" -> Response received: {response_text}")
            print(f" -> Final Model Index: {agent.current_model_index}")
            print(f" -> Final Model Name: {agent.gemini_model_list[agent.current_model_index]}")
            
            # Verify rotation happened
            # Initial index was 0.
            # Fail 0 -> switch to 1.
            # Fail 1 -> switch to 2.
            # Success at 2.
            if agent.current_model_index == 2:
                print("✅ PASSED: Automatically rotated 2 times to 3rd model.")
            else:
                 print(f"X FAILED: Expected index 2, got {agent.current_model_index}")
                 
        except Exception as e:
            print(f"X FAILED with Exception: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_verification())
