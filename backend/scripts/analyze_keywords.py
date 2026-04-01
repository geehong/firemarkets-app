import os
import re
import json
from collections import Counter
from sqlalchemy import create_engine, text

# DB Connection
DATABASE_URL = os.getenv("POSTGRES_DATABASE_URL", "postgresql://geehong:Power6100@db_postgres:5432/markets")
engine = create_engine(DATABASE_URL)

def analyze_keywords():
    print("Connecting to DB and fetching post titles...")
    try:
        with engine.connect() as conn:
            # Fetch titles of all posts (all statuses)
            result = conn.execute(text("SELECT title FROM posts"))
            rows = result.fetchall()
            
        doc_count = len(rows)
        print(f"Total posts (all statuses) to analyze: {doc_count}")
        
        if doc_count == 0:
            print("No published posts found to analyze.")
            return

        word_total_counts = Counter()
        word_document_counts = Counter()
        
        for row in rows:
            title = row[0]
            if isinstance(title, str):
                try:
                    title = json.loads(title)
                except:
                    continue
                    
            ko = title.get('ko', '') if title else ''
            en = title.get('en', '') if title else ''
            text_content = (ko + " " + en).lower()
            
            # Simple tokenization: Korean (2+ chars), English (2+ chars)
            tokens = re.findall(r'[가-힣]{2,}|[a-z]{2,}', text_content)
            
            word_total_counts.update(tokens)
            word_document_counts.update(set(tokens))
            
        # Get top keywords
        print(f"\n{'Keyword':<20} | {'TotalCount':<10} | {'DocRatio':<10}")
        print("-" * 45)
        
        # Load existing stop words
        # Path inside container
        STOP_WORDS_PATH = "/app/app/utils/stop_words.json" 
        existing_stop_words = set()
        if os.path.exists(STOP_WORDS_PATH):
            try:
                with open(STOP_WORDS_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    existing_stop_words = set(data.get("stop_words", []))
            except Exception as e:
                print(f"Warning: Could not load existing stop_words.json: {e}")

        general_candidates = []
        newly_identified_noise = []
        
        for word, count in word_total_counts.most_common(200):
            doc_ratio = word_document_counts[word] / doc_count
            
            # Very aggressive filtering (1.5%) to catch entities like Iran, Trump, US, AI
            if doc_ratio > 0.015:
                general_candidates.append(word)
                if word not in existing_stop_words:
                    newly_identified_noise.append(word)
                    status = " [!] NEW STOP"
                else:
                    status = " [X] ALREADY STOP"
            else:
                status = ""
                
            print(f"{word:<20} | {count:<10} | {doc_ratio:.2%}{status}")
            
        print("\n[Analysis Report]")
        print(f"Total unique words found: {len(word_total_counts)}")
        
        if newly_identified_noise:
            print(f"\nFound {len(newly_identified_noise)} NEW stop word(s) to add.")
            for word in newly_identified_noise:
                existing_stop_words.add(word)
            
            # Save back to JSON
            try:
                with open(STOP_WORDS_PATH, 'w', encoding='utf-8') as f:
                    json.dump({"stop_words": sorted(list(existing_stop_words))}, f, ensure_ascii=False, indent=2)
                print(f"Successfully updated {STOP_WORDS_PATH}")
            except Exception as e:
                print(f"Error saving updated stop_words.json: {e}")
        else:
            print("\nNo new stop words identified.")

    except Exception as e:
        print(f"Error during analysis: {e}")

if __name__ == "__main__":
    analyze_keywords()
