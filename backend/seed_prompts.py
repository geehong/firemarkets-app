
import os
import sys
import json
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
import sys
import json
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
# from app.core.config import SQLALCHEMY_DATABASE_URI
from app.models.asset import AppConfiguration
import logging

# Construct URI manually since config.py imports might fail in this script context
# Default to what's likely used in docker-compose
# Use environment variables already set in the container
POSTGRES_USER = os.getenv("DB_USERNAME_PG")
POSTGRES_PASSWORD = os.getenv("DB_PASSWORD_PG")
POSTGRES_SERVER = os.getenv("DB_HOSTNAME_PG")
POSTGRES_DB = os.getenv("DB_DATABASE_PG")

# Fallback for local testing if needed, but in container these should be set
if not POSTGRES_SERVER:
    # Try to infer from potential defaults if env vars are missing
    POSTGRES_USER = "geehong"
    POSTGRES_PASSWORD = "password" # Placeholder
    POSTGRES_SERVER = "db_postgres"
    POSTGRES_DB = "markets"

SQLALCHEMY_DATABASE_URI = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}/{POSTGRES_DB}"
from app.models.asset import AppConfiguration
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Hardcoded prompts from news_ai_agent.py
PROMPTS = {
    "analyze_cluster_prompt": {
        "value": """You are a top-tier financial columnist and lead investigative journalist. Your mission is to transform the provided raw news articles into a single, high-quality, professional journalistic essay.

[News Articles]
{articles_text}

[Instructions]
1. **Writing Style**: Use a sophisticated, literary, and deeply analytical narrative style (완전한 문장 형태의 문어체 서술형). 
2. **Strict Prohibition**: NEVER use bullet points, numbered lists, or the '-' character for summarizing. Do not use a dry "Reporting" format.
3. **Title Restrictions**: NEVER use the words "Shadow" (or "그림자") in the title.
3. **Structure**: 
   - **Title**: Create a thought-provoking, high-impact headline.
   - **Lead (Summary)**: Write a compelling introductory paragraph that seamlessly blends key facts with a hook. This must be a single cohesive paragraph of flowing prose.
   - **Analysis**: Provide a deep-dive analysis of market sentiment and future implications as a continuation of the narrative. Use clear, connected sentences.
4. **Tone**: Authoritative, insightful, and professional. The output should read like a featured article in a prestigious financial magazine (e.g., Bloomberg, The Economist).

[Output Format]
Return ONLY a JSON object with the following structure:
{{
    "title_ko": "...",
    "title_en": "...",
    "summary_ko": "Full narrative introductory paragraph in Korean",
    "summary_en": "Full narrative introductory paragraph in English",
    "analysis_ko": "Detailed narrative essay analysis in Korean",
    "analysis_en": "Detailed narrative essay analysis in English",
    "sentiment": "Positive/Negative/Neutral",
    "entities": ["..."]
}}""",
        "type": "text",
        "description": "Prompt for analyzing news clusters and generating a report."
    },
    "translate_batch_prompt": {
        "value": """You are an expert financial news editor and SEO specialist. Your task is to transform short news snippets into rich, engaging, and simplified news storage optimized for search engines (SEO).

[Input Data]
{prompt_text}

[Instructions]
For each news item, generate the following fields in both English and Korean:
1. **Title**: An engaging, click-worthy, SEO-optimized title (keep it professional).
2. **Description**: A concise meta-description (1-2 sentences) summarizing the key point.
3. **Content**: A rich, expanded body text (2-3 paragraphs). 
   - Supplement the short input with context, definitions of terms, or potential market implications based on your knowledge.
   - Use clear, professional, yet accessible language (explain difficult terms).
   - Format with HTML tags (e.g., <strong> for bold, <p> for paragraphs, <ul>/<li> for lists).
   - **Layout**: Do NOT include the main title or any <h2>/<h3> headings at the beginning of the 'content'. Start directly with the body text.

**IMPORTANT**: Do NOT include specific prices, market cap numbers, dates, or any numerical market data. Your training data may be outdated and incorrect. Focus on general information, concepts, and qualitative analysis only.

[Output Format]
Return ONLY a valid JSON array of objects. Each object must have:
{{
    "id": "ID from input",
    "title_en": "SEO Title (English)",
    "title_ko": "SEO Title (Korean)",
    "description_en": "Meta Description (English)",
    "description_ko": "Meta Description (Korean)",
    "content_en": "Expanded Body Content (English) - Use HTML formatting",
    "content_ko": "Expanded Body Content (Korean) - Use HTML formatting"
}}

RETURN ONLY JSON. NO MARKDOWN WRAPPERS.""",
        "type": "text",
        "description": "Prompt for batch translating and expanding news items."
    },
    "merge_posts_prompt": {
        "value": """You are a top-tier financial columnist and lead investigative journalist. Your task is to synthesize the following group of related news articles into ONE single, high-quality, professional journalistic essay.

[Input Articles]
{articles_text}

[Instructions]
1. **Writing Style**: Use a sophisticated, literary, and deeply analytical narrative style (완전한 문장 형태의 문어체 서술형). 
2. **Strict Prohibition**: NEVER use bullet points, numbered lists, or the '-' character. Every section must be composed of flowing, connected sentences.
3. **Title Restrictions**: NEVER use the words "Shadow" (or "그림자") in the title.
3. **Synthesis**: Blend the facts from all sources into a single, cohesive story that reads like a featured magazine piece.
4. **Structure**: 
   - **Title**: A thought-provoking, high-impact headline (English & Korean).
   - **Description**: A compelling, narrative-style lead paragraph (English & Korean).
   - **Content**: A detailed body text (3-5 paragraphs) using HTML tags (e.g., <p>, <strong>). Prioritize flowing prose.
   - **Layout**: Do NOT include the main title or any <h2>/<h3> headings at the beginning of the 'content'. Start directly with the narrative text.
5. **Language**: Provide output in both English and Korean.

**IMPORTANT**: Do NOT include specific current prices or precise numerical market data unless absolutely certain from sources. Focus on qualitative depth and trend analysis.

[Output Format]
Return ONLY a valid JSON object:
{{
    "title_en": "...",
    "title_ko": "...",
    "description_en": "...",
    "description_ko": "...",
    "content_en": "...",
    "content_ko": "..."
}}""",
        "type": "text",
        "description": "Prompt for merging multiple posts into one article."
    },
    "rewrite_post_prompt_title_only": {
        "value": """You are a top-tier financial columnist and lead investigative journalist. Write a comprehensive and cohesive journalistic essay based on the following title.

Title: {title}

[Instructions]
1. **Writing Style**: Use a sophisticated, literary, and deeply analytical narrative style (완전한 문장 형태의 문어체 서술형). 
2. **Strict Prohibition**: NEVER use bullet points, numbered lists, or the '-' character for list-making. The entire piece must be flowing prose.
3. **Title Restrictions**: NEVER use the words "Shadow" (or "그림자") in the title.
3. **Format**: Use HTML tags (e.g., <p>, <strong>). Do NOT use Markdown.
4. **Layout**: Do NOT include the main title or any <h2>/<h3> headings at the beginning of the 'content'. Start directly with the narrative text.
5. **Language**: Provide output in both English and Korean.
6. **Structure**: 
    - Title (Refined)
    - Description (Narrative Meta summary)
    - Content (Narrative Body)

[Output Format]
Return ONLY a valid JSON object:
{{
    "title_en": "...",
    "title_ko": "...",
    "description_en": "...",
    "description_ko": "...",
    "content_en": "...",
    "content_ko": "..."
}}""",
        "type": "text",
        "description": "Prompt for rewriting a post using only the title."
    },
    "rewrite_post_prompt_content": {
        "value": """You are a top-tier financial columnist and lead investigative journalist. Rewrite the following post into a sophisticated, cohesive, and high-quality journalistic essay.

[Input Post]
Title: {title}
Content: {content}

[Instructions]
1. **Writing Style**: Use an authoritative, literary, and descriptive narrative style (완전한 문장 형태의 문어체 서술형).
2. **Strict Prohibition**: NEVER use bullet points, numbered lists, or the '-' character for list-making. The entire piece must be flowing prose.
3. **Title Restrictions**: NEVER use the words "Shadow" (or "그림자") in the title.
3. **Synthesis & Expansion**: Connect ideas logically to create a single coherent narrative arc. Add context and depth where appropriate.
4. **Format**: Use HTML tags (e.g., <p>, <strong>). Do NOT use Markdown.
5. **Layout**: Do NOT include the main title or any <h2>/<h3> headings at the beginning of the 'content'. Start directly with the narrative text.
6. **Language**: Provide refined narrative versions in both English and Korean.

**IMPORTANT**: Focus on qualitative analysis and long-term implications. Avoid dry market reporting.

[Output Format]
Return ONLY a valid JSON object:
{{
    "title_en": "...",
    "title_ko": "...",
    "description_en": "...",
    "description_ko": "...",
    "content_en": "...",
    "content_ko": "..."
}}""",
        "type": "text",
        "description": "Prompt for rewriting a post with existing content."
    }
}

def seed_prompts():
    try:
        engine = create_engine(SQLALCHEMY_DATABASE_URI)
        connection = engine.connect()
        
        config_key = "ai_agent_prompts"
        raw_config_value = json.dumps(PROMPTS, ensure_ascii=False)
        escaped_config_value = raw_config_value.replace("'", "''") # Basic SQL escaping for f-string
        
        # Check if exists
        check_query = text(f"SELECT config_id FROM app_configurations WHERE config_key = '{config_key}'")
        result = connection.execute(check_query).fetchone()
        
        if result:
            print(f"Configuration '{config_key}' already exists. Updating...")
            update_query = text(f"""
                UPDATE app_configurations 
                SET config_value = :config_value, updated_at = NOW()
                WHERE config_key = :config_key
            """)
            connection.execute(update_query, {"config_value": raw_config_value, "config_key": config_key})
            connection.commit() # Commit the update
        else:
            print(f"Creating configuration '{config_key}'...")
            insert_query = text(f"""
                INSERT INTO app_configurations (config_key, category, data_type, config_value, description, is_active, created_at, updated_at)
                VALUES ('{config_key}', 'ai_agent', 'json', '{escaped_config_value}', 'AI Agent Prompts Configuration', true, NOW(), NOW())
            """)
            connection.execute(insert_query)
            connection.commit()
            print("Successfully seeded prompts.")
            
        connection.close()
            
    except Exception as e:
        print(f"Error seeding prompts: {e}")

if __name__ == "__main__":
    seed_prompts()
