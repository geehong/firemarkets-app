import asyncio
import os
import sys
from dotenv import load_dotenv

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env
load_dotenv(".env")

# Mock DB connection to avoid timeout
import glob
from unittest.mock import MagicMock, patch
import sqlalchemy

# Patch create_engine to return a mock
sqlalchemy.create_engine = MagicMock()

from app.services.news_ai_agent import NewsAIEditorAgent
# We need to define a Mock Post class because importing app.models.blog might still trigger DB stuff via Base
# But let's try importing, if app.core.database is used, the create_engine patch should save us IF it is called at module level.
# app.core.database calls create_engine at module level.
# So we must patch it BEFORE importing app.services.news_ai_agent which imports app.models.blog which imports app.core.database

from app.models.blog import Post
from datetime import datetime

async def main():
    print("Testing NewsAIEditorAgent initialization...")
    try:
        agent = NewsAIEditorAgent()
        print("Agent initialized successfully.")
    except Exception as e:
        print(f"Agent initialization FAILED: {e}")
        return

    print("Testing merge_posts with GROQ...")

    # Mock _get_provider to force 'groq'
    agent._get_provider = MagicMock(return_value="groq")
    
    # Create mock posts
    posts = [
        Post(
            id=1, 
            title={"en": "Groq Test Post 1", "ko": "그록 테스트 1"}, 
            content="Testing Groq speed and accuracy.", 
            post_info={"source": "Manual"},
            published_at=datetime.now()
        ),
        Post(
            id=2, 
            title={"en": "Groq Test Post 2", "ko": "그록 테스트 2"}, 
            content="Groq uses LPU for fast inference.", 
            post_info={"source": "Manual"},
            published_at=datetime.now()
        )
    ]

    try:
        result = await agent.merge_posts(posts)
        print("Merge result keys:", result.keys() if result else "None")
        print("Merge result:", result)
    except Exception as e:
        print(f"Merge execution FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(main())
