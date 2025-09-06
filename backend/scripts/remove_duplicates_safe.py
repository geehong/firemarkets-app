#!/usr/bin/env python3
"""
안전한 중복 데이터 제거 스크립트
배치 단위로 처리하여 메모리 효율성과 안정성 확보
"""

import sys
import os
sys.path.append('/app')

import logging
from sqlalchemy import text
from app.core.database import get_db

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def remove_duplicates_safe():
    """안전하게 중복 데이터 제거"""
    db = next(get_db())
    
    try:
        logger.info("안전한 중복 데이터 제거 시작")
        
        # 1. 중복 그룹 수 확인
        logger.info("중복 그룹 수 확인 중...")
        result = db.execute(text("""
            SELECT COUNT(*) as duplicate_groups
            FROM (
                SELECT asset_id, DATE(timestamp_utc) as date, COUNT(*) as count 
                FROM ohlcv_day_data 
                GROUP BY asset_id, DATE(timestamp_utc) 
                HAVING COUNT(*) > 1
            ) as duplicates
        """)).fetchone()
        
        total_duplicates = result.duplicate_groups
        logger.info(f"총 중복 그룹 수: {total_duplicates}")
        
        if total_duplicates == 0:
            logger.info("중복 데이터가 없습니다.")
            return
        
        # 2. 배치 단위로 중복 그룹 처리
        batch_size = 100  # 한 번에 처리할 그룹 수
        processed_groups = 0
        total_deleted = 0
        
        while processed_groups < total_duplicates:
            logger.info(f"배치 처리 중... ({processed_groups}/{total_duplicates})")
            
            # 배치 단위로 중복 그룹 가져오기
            duplicate_groups = db.execute(text(f"""
                SELECT asset_id, DATE(timestamp_utc) as date, COUNT(*) as count
                FROM ohlcv_day_data 
                GROUP BY asset_id, DATE(timestamp_utc) 
                HAVING COUNT(*) > 1
                ORDER BY asset_id, DATE(timestamp_utc)
                LIMIT {batch_size}
            """)).fetchall()
            
            if not duplicate_groups:
                break
            
            # 각 그룹별로 중복 제거
            for i, group in enumerate(duplicate_groups, 1):
                asset_id = group.asset_id
                date = group.date
                count = group.count
                
                print(f"[{processed_groups + i}/{total_duplicates}] Asset {asset_id}, Date {date}, 중복 {count}개 → ", end="", flush=True)
                
                # 해당 그룹에서 가장 낮은 ohlcv_id를 제외하고 나머지 삭제
                # MySQL에서는 같은 테이블을 DELETE와 서브쿼리에서 동시에 참조할 수 없으므로
                # 먼저 삭제할 ID들을 구한 후 삭제
                ids_to_delete = db.execute(text("""
                    SELECT ohlcv_id
                    FROM ohlcv_day_data 
                    WHERE asset_id = :asset_id 
                    AND DATE(timestamp_utc) = :date
                    AND ohlcv_id NOT IN (
                        SELECT * FROM (
                            SELECT MIN(ohlcv_id)
                            FROM ohlcv_day_data 
                            WHERE asset_id = :asset_id 
                            AND DATE(timestamp_utc) = :date
                        ) as temp
                    )
                """), {
                    'asset_id': asset_id,
                    'date': date
                }).fetchall()
                
                if ids_to_delete:
                    # 삭제할 ID들을 리스트로 변환
                    delete_ids = [row.ohlcv_id for row in ids_to_delete]
                    delete_result = db.execute(text("""
                        DELETE FROM ohlcv_day_data 
                        WHERE ohlcv_id IN :delete_ids
                    """), {
                        'delete_ids': tuple(delete_ids)
                    })
                else:
                    delete_result = None
                
                deleted_count = delete_result.rowcount if delete_result else 0
                total_deleted += deleted_count
                print(f"{deleted_count}개 삭제 완료")
            
            # 배치 커밋
            db.commit()
            processed_groups += len(duplicate_groups)
            logger.info(f"배치 완료. 총 삭제된 레코드: {total_deleted}개")
        
        # 3. 최종 확인
        logger.info("최종 확인 중...")
        final_check = db.execute(text("""
            SELECT COUNT(*) as remaining_duplicates
            FROM (
                SELECT asset_id, DATE(timestamp_utc) as date, COUNT(*) as count 
                FROM ohlcv_day_data 
                GROUP BY asset_id, DATE(timestamp_utc) 
                HAVING COUNT(*) > 1
            ) as duplicates
        """)).fetchone()
        
        if final_check.remaining_duplicates == 0:
            logger.info("✅ 모든 중복 데이터가 성공적으로 제거되었습니다.")
        else:
            logger.warning(f"⚠️ 여전히 {final_check.remaining_duplicates}개의 중복 그룹이 남아있습니다.")
        
        logger.info(f"총 삭제된 레코드 수: {total_deleted}개")
        
        # 4. UNIQUE 제약조건 추가
        logger.info("UNIQUE 제약조건 추가 중...")
        try:
            db.execute(text("""
                ALTER TABLE ohlcv_day_data 
                ADD CONSTRAINT unique_asset_date 
                UNIQUE (asset_id, DATE(timestamp_utc))
            """))
            logger.info("✅ UNIQUE 제약조건이 성공적으로 추가되었습니다.")
        except Exception as e:
            if "Duplicate key name" in str(e):
                logger.info("UNIQUE 제약조건이 이미 존재합니다.")
            else:
                logger.error(f"UNIQUE 제약조건 추가 실패: {e}")
                raise
        
        db.commit()
        logger.info("데이터베이스 정리 완료")
        
    except Exception as e:
        logger.error(f"데이터 정리 중 오류 발생: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    remove_duplicates_safe()
