-- Open Interest Futures 필드를 JSON 타입으로 변경하는 마이그레이션 스크립트

-- 기존 데이터 백업 (선택사항)
-- CREATE TABLE crypto_metrics_backup AS SELECT * FROM crypto_metrics;

-- 기존 DECIMAL 컬럼을 JSON 컬럼으로 변경
ALTER TABLE crypto_metrics 
MODIFY COLUMN open_interest_futures JSON;

-- 인덱스 재생성 (필요한 경우)
-- ALTER TABLE crypto_metrics ADD INDEX idx_open_interest_futures ((CAST(open_interest_futures->>'$.total' AS DECIMAL(24,10))));

-- 마이그레이션 완료
-- migration_logs 테이블이 없으므로 주석 처리
-- INSERT INTO migration_logs (migration_name, applied_at, status) 
-- VALUES ('open_interest_futures_to_json', NOW(), 'completed');
