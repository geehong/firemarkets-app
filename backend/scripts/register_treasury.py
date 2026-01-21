import os
import json
from sqlalchemy import create_engine, text
from datetime import datetime

# DB Connection
DATABASE_URL = os.getenv("POSTGRES_DATABASE_URL", "postgresql://geehong:Power6100@db_postgres:5432/markets")
engine = create_engine(DATABASE_URL)

def register_assets():
    assets = [
        {"ticker": "US10Y", "name": "US Treasury Yield 10 Year", "type_id": 6, "titles": {"en": "US 10 Year Treasury Yield", "ko": "미국 10년물 국채 금리"}},
        {"ticker": "US02Y", "name": "US Treasury Yield 2 Year", "type_id": 6, "titles": {"en": "US 2 Year Treasury Yield", "ko": "미국 2년물 국채 금리"}},
        {"ticker": "US01Y", "name": "US Treasury Yield 1 Year", "type_id": 6, "titles": {"en": "US 1 Year Treasury Yield", "ko": "미국 1년물 국채 금리"}},
        {"ticker": "US03M", "name": "US Treasury Yield 3 Month", "type_id": 6, "titles": {"en": "US 3 Month Treasury Yield", "ko": "미국 3개월물 국채 금리"}}
    ]

    with engine.connect() as conn:
        for asset in assets:
            print(f"Processing {asset['ticker']}...")
            
            # 1. Insert/Get Asset
            asset_id = None
            check_asset = text("SELECT asset_id FROM assets WHERE ticker=:ticker")
            res_asset = conn.execute(check_asset, {"ticker": asset['ticker']}).fetchone()
            
            if res_asset:
                asset_id = res_asset.asset_id
                print(f"  - Asset exists: ID {asset_id}")
            else:
                ins_asset = text("""
                    INSERT INTO assets (ticker, asset_type_id, name, exchange, currency, data_source, is_active, created_at, updated_at)
                    VALUES (:ticker, :type_id, :name, 'US Gov', 'USD', 'db', true, NOW(), NOW())
                    RETURNING asset_id
                """)
                asset_id = conn.execute(ins_asset, {
                    "ticker": asset['ticker'],
                    "type_id": asset['type_id'],
                    "name": asset['name']
                }).scalar()
                print(f"  - Created Asset: ID {asset_id}")

            # 2. Insert/Get Post
            slug = asset['ticker'].lower()
            check_post = text("SELECT id FROM posts WHERE slug=:slug")
            res_post = conn.execute(check_post, {"slug": slug}).fetchone()
            
            if res_post:
                print(f"  - Post exists: ID {res_post.id}")
            else:
                titles_json = json.dumps(asset['titles'])
                desc_json = json.dumps({"en": f"Market data for {asset['name']}", "ko": f"{asset['titles']['ko']} 시장 데이터"})
                content_html = f"<p>{asset['name']} (Ticker: {asset['ticker']}) market data provided by FireMarkets.</p>"
                
                ins_post = text("""
                    INSERT INTO posts (
                        asset_id, slug, title, description, content, status, post_type, 
                        sync_with_asset, auto_sync_content, visibility, 
                        created_at, updated_at, asset_type_id
                    )
                    VALUES (
                        :asset_id, :slug, :title, :desc, :content, 'published', 'asset', 
                        true, true, 'public', 
                        NOW(), NOW(), :type_id
                    )
                    RETURNING id
                """)
                post_id = conn.execute(ins_post, {
                    "asset_id": asset_id,
                    "slug": slug,
                    "title": titles_json,
                    "desc": desc_json,
                    "content": content_html,
                    "type_id": asset['type_id']
                }).scalar()
                print(f"  - Created Post: ID {post_id}")
            
        conn.commit()
    print("Registration Complete.")

if __name__ == "__main__":
    register_assets()
