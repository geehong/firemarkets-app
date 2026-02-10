#!/usr/bin/env python3
"""
Bulk Generate Asset SEO Content (v2)
- Identifies posts with placeholder Korean description OR old generic template.
- Fills them using a tiered/category-specific approach.
"""

import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

from app.core.database import SessionLocal
from app.models.blog import Post
from app.models.asset import Asset, StockProfile
from sqlalchemy import or_

def generate_bulk_content(dry_run=True, force=False):
    db = SessionLocal()
    try:
        # Configuration
        placeholders = [None, "지금현재 한글설명은 작성중입니다.", "This page is currently under construction."]
        
        # Identify Target Posts
        targets = db.query(Post).filter(Post.post_type == 'assets').all()
        
        print(f"🔍 Found {len(targets)} total asset posts.")
        
        updated_count = 0
        
        for post in targets:
            asset = post.asset
            if not asset:
                continue
            
            content_ko = post.content_ko
            
            # Check if we should process this post
            is_placeholder = (content_ko in placeholders)
            is_old_template = content_ko and "파이어마켓에서" in content_ko and "자산입니다" in content_ko
            
            if not (is_placeholder or is_old_template or force):
                continue
                
            # Fetch StockProfile for description_ko
            profile = db.query(StockProfile).filter(StockProfile.asset_id == asset.asset_id).first()
            
            new_content = None
            
            # Tier 1: StockProfile description_ko (only use if not a placeholder)
            if profile and profile.description_ko and len(profile.description_ko.strip()) > 20:
                new_content = profile.description_ko
            
            # Tier 2: Category-Specific Template Fallback
            if not new_content:
                asset_type_id = post.asset_type_id or (asset.asset_type_id if asset else None)
                exchange_str = f"({asset.exchange}) " if asset and asset.exchange else ""
                
                # 8: Crypto
                if asset_type_id == 8:
                    new_content = (
                        f"{asset.name}({asset.ticker})은 주요 암호화폐 자산입니다. "
                        f"파이어마켓에서 {asset.name}의 실시간 가격, 차트 분석 및 주요 상세지표를 확인하고 스마트한 투자 결정을 내려보세요."
                    )
                # 5: ETF, 7: Fund
                elif asset_type_id in [5, 7]:
                    new_content = (
                        f"{asset.name}({asset.ticker})은(는) {exchange_str}주요 펀드(인덱스)입니다. "
                        f"파이어마켓에서 {asset.name}의 실시간 가격, 차트 분석 및 주요 지표를 확인하고 스마트한 투자 결정 내려보세요."
                    )
                # 2: Stock
                elif asset_type_id == 2:
                    new_content = (
                        f"{asset.name}({asset.ticker})은(는) {exchange_str}주요 주식 자산입니다. "
                        f"파이어마켓에서 {asset.name}의 실시간 가격, 차트 분석 및 주요 재무 지표를 확인하고 스마트한 투자 결정을 내려보세요."
                    )
                # 1: Indices
                elif asset_type_id == 1:
                    new_content = (
                        f"{asset.name}({asset.ticker})은(는) {exchange_str}주요 지수 자산입니다. "
                        f"파이어마켓에서 {asset.name}의 실시간 가격, 차트 분석 및 주요 지수 지표를 확인하고 스마트한 투자 결정을 내려보세요."
                    )
                # 3: Commodities
                elif asset_type_id == 3:
                    new_content = (
                        f"{asset.name}({asset.ticker})은(는) {exchange_str}주요 원자재 자산입니다. "
                        f"파이어마켓에서 {asset.name}의 실시간 가격, 차트 분석 및 주요 시장 지표를 확인하고 스마트한 투자 결정을 내려보세요."
                    )
                # 4: Currencies
                elif asset_type_id == 4:
                    new_content = (
                        f"{asset.name}({asset.ticker})은(는) 주요 외환 자산입니다. "
                        f"파이어마켓에서 {asset.name}의 실시간 환율, 차트 분석 및 주요 경제 지표를 확인하고 스마트한 투자 결정을 내려보세요."
                    )
                # Fallback
                else:
                    new_content = (
                        f"{asset.name}({asset.ticker})은(는) {exchange_str}주요 자산입니다. "
                        f"파이어마켓에서 {asset.name}의 실시간 가격, 차트 분석 및 주요 시장 데이터를 확인하고 스마트한 투자 결정을 내려보세요."
                    )
            
            # Update content if changed
            if new_content and new_content != content_ko:
                if not dry_run:
                    post.content_ko = new_content
                updated_count += 1
                # print(f"✅ [{asset.ticker}] -> Prepared update.")

        if not dry_run:
            db.commit()
            print(f"🎉 Successfully updated {updated_count} posts.")
        else:
            print(f"🧪 Dry run completed. Would update {updated_count} posts.")
            
    except Exception as e:
        print(f"❌ Error during generation: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    is_dry = "--commit" not in sys.argv
    is_force = "--force" in sys.argv
    generate_bulk_content(dry_run=is_dry, force=is_force)
