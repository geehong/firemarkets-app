# backend/app/services/news_ai_agent.py
import os
import google.generativeai as genai
from groq import Groq, AsyncGroq
from typing import List, Dict, Optional, Any
from app.models.blog import Post
from app.models.asset import AppConfiguration
from app.core.config import GOOGLE_API_KEY, GROQ_API_KEY, GLOBAL_APP_CONFIGS
from app.core.database import SessionLocal
import logging
import json
import asyncio
import markdown

import logging
import json
import asyncio
import re

logger = logging.getLogger(__name__)

class NewsAIEditorAgent:
    """Gemini 및 Groq를 이용한 뉴스 분석 및 리포트 생성 에이전트 with Multi-Provider Support"""
    
    def __init__(self):
        # Initialize Gemini
        self.gemini_available = False
        # Gemini models for high-quality tasks (rewrite/merge)
        # Using models confirmed from user's quota dashboard
        self.gemini_model_list = [
            'gemini-3-flash-preview',  # Newest & available
            'gemini-2.5-flash',
            'gemini-2.0-flash',        # Very fast
            'gemini-2.5-flash-lite',
            'gemini-flash-latest',     # General alias
        ]
        self.current_model_index = 0
        
        # Gemma models for news collection
        self.gemma_collection_models = [
            'gemma-3-27b-it',
            'gemma-3-12b-it',
            'gemma-3-4b-it',
            'gemma-3-1b-it',
        ]
        self.gemma_collection_index = 0
        
        if GOOGLE_API_KEY:
            try:
                genai.configure(api_key=GOOGLE_API_KEY)
                # Init with the first model
                self.gemini_model = genai.GenerativeModel(self.gemini_model_list[0])
                self.gemini_available = True
                logger.info(f"Gemini init with primary model: {self.gemini_model_list[0]}")
            except Exception as e:
                logger.error(f"Failed to init Gemini: {e}")

        # Initialize Groq
        self.groq_available = False
        if GROQ_API_KEY:
            try:
                self.groq_client = AsyncGroq(api_key=GROQ_API_KEY)
                # Updated to latest supported model
                self.groq_model = "llama-3.3-70b-versatile" 
                self.groq_available = True
            except Exception as e:
                logger.error(f"Failed to init Groq: {e}")
        
        if not self.gemini_available and not self.groq_available:
            logger.error("No AI providers available (neither Gemini nor Groq keys set)")
            
    def _get_provider(self, task_type: str = "general") -> str:
        """
        Get provider based on task type.
        'collection' -> Gemma (parallel processing with 4 models)
        'merge' -> Groq (fast)
        'general' / 'rewrite' -> Gemini (high quality)
        """
        if task_type == "collection":
            return "gemma" if self.gemini_available else "groq"
        elif task_type == "merge":
            return "groq" if self.groq_available else "gemini"
        else:  # general, rewrite
            return "gemini" if self.gemini_available else "groq"

    async def _call_gemini(self, prompt: str, **kwargs) -> str:
        """Call Gemini API with Model Rotation on Quota Errors"""
        if not self.gemini_available:
            raise Exception("Gemini not available")

        # Strip args that are meant for the wrapper but not for the Google API
        kwargs.pop('max_retries', None)
        kwargs.pop('base_delay', None)
        kwargs.pop('utils', None) # Safety

        last_error = None
        
        # rotation retry loop
        # We try until we run out of models in the list
        start_index = self.current_model_index
        attempts = 0
        total_models = len(self.gemini_model_list)
        
        while attempts < total_models:
            current_model_name = self.gemini_model_list[self.current_model_index]
            
            try:
                # Update model instance if needed (though we just hold the object, it's lightweight)
                # Re-instantiating ensures we use the correct model string
                self.gemini_model = genai.GenerativeModel(current_model_name)
                
                logger.info(f"Calling Gemini Model: {current_model_name}")
                
                response = await self.gemini_model.generate_content_async(prompt, **kwargs)
                return response.text
                
            except Exception as e:
                err_str = str(e).lower()
                is_quota_error = "429" in err_str or "quota" in err_str or "resource" in err_str or "exhausted" in err_str
                is_not_found = "404" in err_str or "not found" in err_str or "not supported" in err_str
                
                if is_quota_error or is_not_found:
                    logger.warning(f"Gemini Error ({'Quota' if is_quota_error else 'Not Found'}) for {current_model_name}. Switching model...")
                    self.current_model_index = (self.current_model_index + 1) % total_models
                    attempts += 1
                    last_error = e
                    continue
                else:
                    # Non-quota error, re-raise immediately (e.g. content policy)
                    raise e
        
        # If we exited loop, we tried all models and failed
        logger.error("All Gemini models exhausted/failed.")
        raise last_error if last_error else Exception("All Gemini models failed")

    async def _call_groq(self, prompt: str, **kwargs) -> str:
        """Call Groq API"""
        if not self.groq_available:
            raise Exception("Groq not available")

        # Reuse retry logic
        async def _groq_req():
            chat_completion = await self.groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model=self.groq_model,
                temperature=0.5,
                max_tokens=4096, # Adjust as needed
                top_p=1,
                stop=None,
                stream=False,
            )
            return chat_completion.choices[0].message.content

        return await self._retry_request(_groq_req, **kwargs)

    async def _call_gemma(self, prompt: str, **kwargs) -> str:
        """Call Gemma API with round-robin model selection for parallel processing"""
        if not self.gemini_available:
            raise Exception("Gemma not available (requires Gemini API)")

        # Strip args that are meant for the wrapper
        kwargs.pop('max_retries', None)
        kwargs.pop('base_delay', None)
        kwargs.pop('utils', None)

        # Round-robin model selection
        model_name = self.gemma_collection_models[self.gemma_collection_index]
        self.gemma_collection_index = (self.gemma_collection_index + 1) % len(self.gemma_collection_models)
        
        logger.info(f"Calling Gemma Model: {model_name} (index: {self.gemma_collection_index})")
        
        try:
            gemma_model = genai.GenerativeModel(model_name)
            response = await gemma_model.generate_content_async(prompt, **kwargs)
            return response.text
        except Exception as e:
            err_str = str(e).lower()
            is_quota_error = "429" in err_str or "quota" in err_str
            is_not_found = "404" in err_str or "not found" in err_str
            
            if is_quota_error or is_not_found:
                # Try next model
                logger.warning(f"Gemma Error for {model_name}: {e}. Trying next model...")
                next_model = self.gemma_collection_models[self.gemma_collection_index]
                self.gemma_collection_index = (self.gemma_collection_index + 1) % len(self.gemma_collection_models)
                
                try:
                    gemma_model = genai.GenerativeModel(next_model)
                    logger.info(f"Retrying with Gemma Model: {next_model}")
                    response = await gemma_model.generate_content_async(prompt, **kwargs)
                    return response.text
                except Exception as e2:
                    logger.error(f"Gemma fallback also failed: {e2}")
                    raise e2
            else:
                raise e

    async def _generate_content(self, prompt: str, task_type: str = "general", **kwargs) -> str:
        """Unified generation interface routing to configured provider with fallback"""
        provider = self._get_provider(task_type)
        
        # Override if selected provider is not available
        if provider == 'gemini' and not self.gemini_available:
            provider = 'groq'
        if provider == 'gemma' and not self.gemini_available:
            provider = 'groq'
        if provider == 'groq' and not self.groq_available:
            provider = 'gemini'
            
        logger.info(f"Using AI Provider: {provider.upper()} for task: {task_type}")
        
        try:
            if provider == 'groq':
                return await asyncio.wait_for(self._call_groq(prompt, **kwargs), timeout=60)
            elif provider == 'gemma':
                return await asyncio.wait_for(self._call_gemma(prompt, **kwargs), timeout=60)
            else:
                return await asyncio.wait_for(self._call_gemini(prompt, **kwargs), timeout=60)
        except asyncio.TimeoutError:
            logger.error(f"Provider {provider} timed out after 60s")
            # If timeout, try fallback or re-raise
            raise Exception(f"AI Provider {provider} timeout")
        except Exception as e:
            logger.error(f"Primary provider {provider} failed: {e}")
            
            # Simple Fallback Logic
            if provider in ['gemini', 'gemma'] and self.groq_available:
                logger.info("Falling back to GROQ...")
                return await self._call_groq(prompt, **kwargs)
            elif provider == 'groq' and self.gemini_available:
                logger.info("Falling back to GEMINI...")
                return await self._call_gemini(prompt, **kwargs)
            else:
                raise e

    def _ensure_html_content(self, result: Dict) -> Dict:
        """
        Ensure content fields are HTML, not Markdown.
        Converts Markdown to HTML if Markdown patterns are detected.
        """
        if not result:
            return result
            
        # Markdown patterns to detect
        md_patterns = ['# ', '## ', '### ', '**', '* ', '- ', '```', '> ']
        
        content_fields = ['content_en', 'content_ko']
        
        for field in content_fields:
            content = result.get(field, '')
            if not content:
                continue
                
            # Check if content appears to be Markdown
            is_markdown = any(pattern in content for pattern in md_patterns)
            
            if is_markdown:
                logger.info(f"Converting Markdown to HTML for field: {field}")
                # Convert Markdown to HTML
                html_content = markdown.markdown(
                    content, 
                    extensions=['extra', 'nl2br', 'sane_lists']
                )
                result[field] = html_content
                
        return result

    
    async def _retry_request(self, func, *args, max_retries=3, base_delay=5, **kwargs):
        """Exponential backoff for Rate Limits"""
        
        for attempt in range(max_retries + 1):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                err_str = str(e).lower()
                # If it's a DAILY quota limit (FreeTier), retrying won't help today.
                if "freetier" in err_str and ("quota" in err_str or "limit" in err_str):
                     logger.error("Gemini Free Tier Quota Exceeded (Daily). Stopping retries.")
                     raise e

                if "429" in str(e) or "quota" in str(e).lower():
                    if attempt < max_retries:
                        delay = base_delay * (2 ** attempt)
                        logger.warning(f"Rate Limit hit. Retrying in {delay}s...")
                        import asyncio
                        await asyncio.sleep(delay)
                        continue
                raise e

    async def analyze_cluster(self, cluster: List[Post]) -> Dict:
        """
        뉴스 클러스터(관련 기사 묶음)를 분석하여 종합 리포트 생성
        """
        if not cluster:
            return None
            
        # 프롬프트 구성
        articles_text = ""
        for i, p in enumerate(cluster):
            title = p.title.get('en') if isinstance(p.title, dict) else str(p.title)
            source = p.post_info.get('source', 'Unknown')
            date = p.published_at.strftime('%Y-%m-%d %H:%M') if p.published_at else 'Unknown'
            articles_text += f"[{i+1}] {title} (Source: {source}, Time: {date})\n"
            
        dataset = {
            "articles": articles_text,
            "count": len(cluster)
        }
        
        # 프롬프트 구성
        config = GLOBAL_APP_CONFIGS.get("ai_agent_prompts", {})
        prompt_template = config.get("analyze_cluster_prompt", {}).get("value", "")

        if not prompt_template:
             # Fallback
             prompt_template = """
You are a top-tier financial columnist and lead investigative journalist. Your mission is to transform the provided raw news articles into a single, high-quality, professional journalistic essay.

[News Articles]
{articles_text}

[Instructions]
1. **Writing Style**: Use a sophisticated, literary, and deeply analytical narrative style (완전한 문장 형태의 문어체 서술형). 
2. **Strict Prohibition**: NEVER use bullet points, numbered lists, or the '-' character for summarizing. Do not use a dry "Reporting" format.
3. **Structure**: 
   - **Title**: Create a thought-provoking, high-impact headline.
   - **Lead (Summary)**: Write a compelling introductory paragraph that seamlessly blends key facts with a hook. This must be a single cohesive paragraph of flowing prose.
   - **Content Structure**: Use `<h3>` tags to break down the analysis into 2-3 logical sections for readability and SEO. 
   - **Layout**: Do NOT include the main title `<h1>` or `<h2>` at the beginning. Start directly with the narrative text or an `<h3>` subheading if appropriate for the flow.
5. **Tone**: Authoritative, insightful, and professional. The output should read like a featured article in a prestigious financial magazine (e.g., Bloomberg, The Economist).

[Additional Instructions for FireMarkets Identity]
1. **Connection to Data**: If the news mentions a specific asset (e.g., Bitcoin, Tesla), include a sentence like: "You can check the real-time on-chain signals and technical charts for this asset on the <a href='/dashboard' style='color: #3b82f6; text-decoration: underline;'>FireMarkets Dashboard</a>."
2. **Expert Tone**: Maintain the tone of a professional analyst who uses FireMarkets' proprietary tools to interpret the news.

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
    "sentiment": "Positive/Negative/Neutral",
    "tickers": ["BTC", "ETH" ...],
    "keywords": ["ETF", "Regulation" ...],
    "tags": ["Bitcoin", "SEC", "Approval" ...]
}}"""

        prompt = prompt_template.replace("{articles_text}", articles_text)
        try:
            # Gemini API 호출 (비동기 지원 여부 확인 필요, synchronous wrap or async if lib supports)
            # google-generativeai current lib is mostly sync references usually, but has async generate_content_async?
            # Let's check or use run_in_executor if needed. assuming sync for simplicity or check docs.
            # verify_step1 checks import, version 0.8.6 supports async.
            
            # Unified Call
            text_response = await self._generate_content(prompt, task_type="collection")
            
            # Use robust JSON parsing
            result = self._parse_json_response(text_response)
            return result
            
        except Exception as e:
            logger.error(f"AI Analysis failed: {e}")
            return None

    async def translate_batch(self, items: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """
        Batch translate news titles and descriptions to Korean.
        items: [{"id": "...", "title": "...", "description": "..."}]
        Returns: Same list with added "title_ko" and "description_ko" keys.
        """
        if not items:
            return items

        # Limit batch size to avoid huge prompts (e.g., 20 items max)
        # For significantly larger lists, caller should chunk.
        
        # Prepare valid JSON-friendly string or simple indexed list
        prompt_text = ""
        for item in items:
            t = item.get("title", "")
            d = item.get("description", "")
            prompt_text += f"ID: {item.get('id')}\nTitle: {t}\nDesc: {d}\n---\n"

        # Dynamic Prompt
        config = GLOBAL_APP_CONFIGS.get("ai_agent_prompts", {})
        prompt_template = config.get("translate_batch_prompt", {}).get("value", "")

        if not prompt_template:
            prompt_template = """
You are an expert financial news editor and SEO specialist. Your task is to transform short news snippets into rich, engaging, and simplified news storage optimized for search engines (SEO).

[Input Data]
{prompt_text}

[Instructions]
For each news item, generate the following fields in both English and Korean:
1. **Title**: An engaging, click-worthy, SEO-optimized title (keep it professional).
2. **Description**: A concise meta-description (1-2 sentences) summarizing the key point.
3. **Content**: A rich, expanded body text (2-3 paragraphs). 
   - Supplement the short input with context, definitions of terms, or potential market implications based on your knowledge.
   - Use clear, professional, yet accessible language (explain difficult terms).
   - Format with HTML tags (e.g., <strong> for bold, <p> for paragraphs, <ul>/<li> for lists, <h3> for subheadings).
   - **Layout**: Do NOT include the main title or any <h2>/<h3> headings at the beginning of the 'content'. However, you MUST use `<h3>` tags within the body to structure the narrative if it exceeds two paragraphs.

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
    "content_ko": "Expanded Body Content (Korean) - Use HTML formatting",
    "tickers": ["BTC", "AAPL"...],
    "keywords": ["Crypto", "Stock", "Economy"...],
    "tags": ["Bitcoin", "Apple", "Tech"...]
}}

RETURN ONLY JSON. NO MARKDOWN WRAPPERS."""

        prompt = prompt_template.replace("{prompt_text}", prompt_text)
        try:
            text_response = await self._generate_content(prompt, task_type="collection")
            
            # Use robust JSON parsing
            translated_list = self._parse_json_response(text_response)
            
            if not isinstance(translated_list, list):
                if isinstance(translated_list, dict):
                    # Sometimes AI returns a single object instead of a list
                    translated_list = [translated_list]
                else:
                    logger.error(f"AI response is not a list: {type(translated_list)}")
                    return items
            
            # Create a map for O(1) lookup
            trans_map = {str(t['id']): t for t in translated_list}
            
            # Merge back - extract ALL fields from AI response
            results = []
            for item in items:
                tid = str(item.get('id'))
                if tid in trans_map:
                    t_data = trans_map[tid]
                    # Title fields
                    item['title_en'] = t_data.get('title_en', item.get('title', ''))
                    item['title_ko'] = t_data.get('title_ko', item.get('title', ''))
                    # Description fields
                    item['description_en'] = t_data.get('description_en', item.get('description', ''))
                    item['description_ko'] = t_data.get('description_ko', '')
                    # Content fields (expanded body text)
                    item['content_en'] = t_data.get('content_en', '')
                    item['content_ko'] = t_data.get('content_ko', '')
                else:
                    # Fallback - use English as Korean fallback (better than empty)
                    title = item.get('title', '')
                    desc = item.get('description', '')
                    item['title_en'] = title
                    item['title_ko'] = title
                    item['description_en'] = desc
                    item['description_ko'] = desc
                    item['content_en'] = desc
                    item['content_ko'] = desc
                results.append(item)
                
            return results

        except Exception as e:
            logger.error(f"Batch translation failed: {e}")
            # Fallback for all - use English content as fallback (better than empty)
            for item in items:
                title = item.get('title', '')
                desc = item.get('description', '')
                item['title_en'] = title
                item['title_ko'] = title  # English as fallback
                item['description_en'] = desc
                item['description_ko'] = desc  # English as fallback
                item['content_en'] = desc
                item['content_ko'] = desc  # English as fallback (better than empty)
            return items

    def _parse_json_response(self, text: str) -> Optional[Dict]:
        """Robust JSON parsing"""
        try:
            text = text.strip()
            # Remove Markdown code blocks
            if "```json" in text:
                # Find first ```json and last ```
                pattern = r"```json(.*?)```"
                match = re.search(pattern, text, re.DOTALL)
                if match:
                    text = match.group(1).strip()
            elif "```" in text:
                pattern = r"```(.*?)```"
                match = re.search(pattern, text, re.DOTALL)
                if match:
                    text = match.group(1).strip()
            
            # Find JSON object boundaries (simple heuristic)
            start = text.find('{')
            end = text.rfind('}')
            if start != -1 and end != -1:
                text = text[start:end+1]
            else:
                logger.error(f"Could not find JSON object boundaries in response: {text[:200]}...")
                return None
                
            return json.loads(text, strict=False)
        except json.JSONDecodeError as je:
            logger.error(f"JSON Decode Error: {je}")
            # Attempt to fix common JSON issues from AI
            try:
                # Replace unescaped newlines within strings
                # This is a very rough fix
                fixed_text = re.sub(r'(?<=: ")(.*?)(?=",)', lambda m: m.group(1).replace('\n', '\\n'), text, flags=re.DOTALL)
                return json.loads(fixed_text, strict=False)
            except:
                logger.error(f"Failed to fix JSON: {text[:500]}...")
                return None
        except Exception as e:
            logger.error(f"JSON Parse Error: {e}")
            logger.debug(f"Failed Text: {text}")
            return None

    async def merge_posts(self, posts: List[Post]) -> Dict:
        """
        Merge multiple posts into a single comprehensive article.
        """
        if not posts:
            return None

        # Prepare input text
        articles_text = ""
        for i, p in enumerate(posts):
            title = p.title.get('en') if isinstance(p.title, dict) else str(p.title)
            content = p.content or p.description or ""
            source = p.post_info.get('source', 'Unknown') if p.post_info else 'Unknown'
            date = p.published_at.strftime('%Y-%m-%d %H:%M') if p.published_at else 'Unknown'
            articles_text += f"\n[Article {i+1}] Title: {title}\nSource: {source} (Time: {date})\nContent: {content[:1000]}...\n"

        # Dynamic Prompt
        config = GLOBAL_APP_CONFIGS.get("ai_agent_prompts", {})
        prompt_template = config.get("merge_posts_prompt", {}).get("value", "")

        if not prompt_template:
            prompt_template = """
You are a top-tier financial columnist and lead investigative journalist. Your task is to synthesize the following group of related news articles into ONE single, high-quality, professional journalistic essay.

[Input Articles]
{articles_text}

[Instructions]
1. **Writing Style**: Use a sophisticated, literary, and deeply analytical narrative style (완전한 문장 형태의 문어체 서술형). 
2. **Strict Prohibition**: NEVER use bullet points, numbered lists, or the '-' character. Every section must be composed of flowing, connected sentences.
3. **Synthesis**: Blend the facts from all sources into a single, cohesive story that reads like a featured magazine piece.
4. **Structure**: 
   - **Title**: A thought-provoking, high-impact headline (English & Korean).
   - **Description**: A compelling, narrative-style lead paragraph (English & Korean).
   - **Content**: A detailed body text (4-6 paragraphs) using HTML tags. You MUST use logic-based `<h3>` subheadings to break down the narrative into 2-3 distinct sections for readability.
   - **Layout**: Do NOT include the main title `<h1>` or `<h2>` at the beginning.
5. **Language**: Provide output in both English and Korean.

[Additional Instructions for FireMarkets Identity]
1. **Connection to Data**: If the news mentions a specific asset (e.g., Bitcoin, Tesla), include a sentence like: "You can check the real-time on-chain signals and technical charts for this asset on the <a href='/dashboard' style='color: #3b82f6; text-decoration: underline;'>FireMarkets Dashboard</a>."
2. **Expert Tone**: Maintain the tone of a professional analyst who uses FireMarkets' proprietary tools to interpret the news.

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
}}"""

        prompt = prompt_template.replace("{articles_text}", articles_text)
        try:
            text_response = await self._generate_content(prompt, task_type="merge", max_retries=1, base_delay=3)
            result = self._parse_json_response(text_response)
            return self._ensure_html_content(result)
        except Exception as e:
            logger.error(f"Merge posts failed: {e}")
            return None

    async def rewrite_post(self, post_data: Dict) -> Dict:
        """
        Rewrite and improve an existing post's content.
        post_data: {'title': ..., 'content': ...}
        """
        title = post_data.get('title', '')
        content = post_data.get('content', '')
        
        config = GLOBAL_APP_CONFIGS.get("ai_agent_prompts", {})
        
        if not content:
            # If no content, try to generate from title alone
            # If no content, try to generate from title alone
            prompt_template = config.get("rewrite_post_prompt_title_only", {}).get("value", "")
            
            if not prompt_template:
                prompt_template = """
You are a top-tier financial columnist and lead investigative journalist. Write a comprehensive and cohesive journalistic essay based on the following title.

Title: {title}

[Instructions]
1. **Writing Style**: Use a sophisticated, literary, and deeply analytical narrative style (완전한 문장 형태의 문어체 서술형). 
2. **Strict Prohibition**: NEVER use bullet points, numbered lists, or the '-' character for list-making. The entire piece must be flowing prose.
3. **Format**: Use HTML tags (e.g., `<p>`, `<strong>`, `<h3>`). Do NOT use Markdown.
4. **Layout**: Do NOT include the main title `<h1>` or `<h2>` at the beginning. You MUST use `<h3>` tags to create 2-3 logical subheadings within the narrative for structure and readability.
5. **Language**: Provide output in both English and Korean.

[Additional Instructions for FireMarkets Identity]
1. **Connection to Data**: If the news mentions a specific asset (e.g., Bitcoin, Tesla), include a sentence like: "You can check the real-time on-chain signals and technical charts for this asset on the <a href='/dashboard' style='color: #3b82f6; text-decoration: underline;'>FireMarkets Dashboard</a>."
2. **Expert Tone**: Maintain the tone of a professional analyst who uses FireMarkets' proprietary tools to interpret the news.
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
}}"""
            prompt = prompt_template.replace("{title}", title)
        else:
            # Rewrite existing content
            prompt_template = config.get("rewrite_post_prompt_content", {}).get("value", "")
            
            if not prompt_template:
                prompt_template = """
You are a top-tier financial columnist and lead investigative journalist. Rewrite the following post into a sophisticated, cohesive, and high-quality journalistic essay, adhering strictly to Google's high-quality content guidelines.

[Input Post]
Title: {title}
Content: {content}

[Instructions]
1.  **Writing Style & Depth (Avoid Thin Content)**:
    -   Do NOT just summarize facts. Expand on the "why" and "how".
    -   The final content MUST be substantial (at least 3-5 detailed paragraphs).
    -   Use a sophisticated, literary, and deeply analytical narrative style (complete sentences, no bullet points).

2.  **Originality & Value-Add (Avoid Scraped/Low-Value Content)**:
    -   Do NOT simply copy-paste or slightly reword the input.
    -   **Crucial**: Add unique insights, future implications, or expert analysis that provides value beyond the raw news.
    -   Connect this news to broader market trends, historical context, or specific on-chain metrics if relevant (e.g., "This aligns with recent whale movements...").
    -   Make the reader feel they gained a new perspective, not just a fact.

3.  **Human-Like Flow (Avoid Spam/AI Patterns)**:
    -   Avoid repetitive sentence structures or generic templates (e.g., do NOT start every article with "Today we discuss..." or end with "DYOR").
    -   Ensure a natural, engaging flow from introduction to analysis to conclusion.
    -   Vary sentence length and vocabulary to sound authentic and professional.

4.  **Trust & Credibility (E-E-A-T)**:
    -   Write with authority and expertise.
    -   If referencing specific data (prices, percentages), ensure it sounds credible and, if possible, mention the source (e.g., "according to recent SEC filings...", "as reported by Bloomberg...").
    -   Maintain a neutral, objective, yet insightful tone.

5.  **Format**: Use HTML tags (e.g., `<p>`, `<strong>`, `<h3>`). Do NOT use Markdown.
6.  **Layout**: Do NOT include the main title `<h1>` or `<h2>` at the beginning. **High Priority**: You MUST use `<h3>` tags to create 2-3 logical subheadings within the content for SEO and readability.
7.  **Language**: Provide refined narrative versions in both English and Korean.

[Additional Instructions for FireMarkets Identity]
1. **Connection to Data**: If the news mentions a specific asset (e.g., Bitcoin, Tesla), include a sentence like: "You can check the real-time on-chain signals and technical charts for this asset on the <a href='/dashboard' style='color: #3b82f6; text-decoration: underline;'>FireMarkets Dashboard</a>."
2. **Expert Tone**: Maintain the tone of a professional analyst who uses FireMarkets' proprietary tools to interpret the news.

[Output Format]
Return ONLY a valid JSON object:
{{
    "title_en": "...",
    "title_ko": "...",
    "description_en": "...",
    "description_ko": "...",
    "content_en": "...",
    "content_ko": "..."
}}"""
            # Truncate content for prompt safety if needed, though template replacement is raw
            truncated_content = content[:2000]
            prompt = prompt_template.replace("{title}", title).replace("{content}", truncated_content)
        try:
            # Change task_type to 'general' to use Gemini provider logic
            text_response = await self._generate_content(prompt, task_type="general", max_retries=1, base_delay=3)
            logger.info(f"Raw AI Response for Rewrite: {text_response[:500]}...") 
            result = self._parse_json_response(text_response)
            if not result:
                logger.error(f"Failed to parse AI response. Raw: {text_response}")
            return self._ensure_html_content(result)
        except Exception as e:
            logger.error(f"Rewrite post failed: {e}")
            return None

    async def assist_editor(self, prompt: str, context: Optional[str] = None) -> str:
        """
        Assist the editor with direct prompts, maintaining the 'Financial Columnist' persona.
        Used by the 'Ask AI' feature in TinyMCE.
        
        Args:
            prompt: User's command (e.g., "Make this more professional", "Summarize this")
            context: The selected text or current content of the editor
        """
        
        # Persona & Rules System
        system_rules = """
You are a top-tier financial columnist and lead investigative journalist. 
Your task is to assist the editor based on their request, adhering strictly to the following rules:

1. **Writing Style**: Use a sophisticated, literary, and deeply analytical narrative style (완전한 문장 형태의 문어체 서술형).
2. **Strict Prohibition**: NEVER use bullet points, numbered lists, or the '-' character. 
3. **Format**: Return ONLY HTML content (e.g., `<p>`, `<strong>`, `<h3>`). Do NOT use Markdown code blocks.
4. **Structure**: You MUST use `<h3>` subheadings to organize the content into logical sections if the response is longer than two paragraphs.
5. **Tone**: Authoritative, insightful, and professional.
6. **Language**: If the input is Korean, output Korean. If English, output English.

[Additional Instructions]
- If asked to "Make it longer" or "Improve", add qualitative depth and market context.
- If asked to "Fix grammar", only correct errors while maintaining the professional tone.
"""

        full_prompt = f"{system_rules}\n\n[Context/Content]\n{context or ''}\n\n[User Request]\n{prompt}\n\n[Output]\n"
        
        try:
            # Determine task type (rewrite/edit is 'general' high quality)
            # We use 'general' to map to Gemini (or Groq fallback)
            response = await self._generate_content(full_prompt, task_type="general")
            
            # Clean up response (remove markdown wrappers if any)
            cleaned_response = response.strip()
            if cleaned_response.startswith("```html"):
                cleaned_response = cleaned_response[7:]
            elif cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]
            
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]
                
            return cleaned_response.strip()
            
        except Exception as e:
            logger.error(f"Editor assistance failed: {e}")
            raise e
