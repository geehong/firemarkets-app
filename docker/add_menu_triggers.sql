-- 동적 메뉴 자동 새로고침을 위한 데이터베이스 트리거 추가
-- FireMarkets 프로젝트용

-- 1. 메뉴 새로고침 트리거 함수 생성
CREATE OR REPLACE FUNCTION trigger_refresh_menus()
RETURNS TRIGGER AS $$
BEGIN
    -- 동적 메뉴 새로고침 실행
    PERFORM refresh_dynamic_menus();
    
    -- 로그 기록
    RAISE NOTICE 'Dynamic menus refreshed due to % change in %', TG_OP, TG_TABLE_NAME;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. asset_types 테이블 변경 시 트리거 추가
DROP TRIGGER IF EXISTS trg_asset_types_changed ON asset_types;
CREATE TRIGGER trg_asset_types_changed
    AFTER INSERT OR UPDATE OR DELETE ON asset_types
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_menus();

-- 3. onchain_metrics_info 테이블 변경 시 트리거 추가
DROP TRIGGER IF EXISTS trg_onchain_metrics_changed ON onchain_metrics_info;
CREATE TRIGGER trg_onchain_metrics_changed
    AFTER INSERT OR UPDATE OR DELETE ON onchain_metrics_info
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_menus();

-- 4. 트리거 테스트를 위한 함수 (선택사항)
CREATE OR REPLACE FUNCTION test_menu_triggers()
RETURNS void AS $$
BEGIN
    -- asset_types 테이블에 테스트 데이터 삽입
    INSERT INTO asset_types (type_name) VALUES ('Test Asset Type');
    
    -- 잠시 대기
    PERFORM pg_sleep(1);
    
    -- 테스트 데이터 삭제
    DELETE FROM asset_types WHERE type_name = 'Test Asset Type';
    
    RAISE NOTICE 'Menu trigger test completed. Check if dynamic menus were refreshed.';
END;
$$ LANGUAGE plpgsql;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'Menu auto-refresh triggers added successfully!';
    RAISE NOTICE 'Triggers will automatically refresh dynamic menus when:';
    RAISE NOTICE '  - asset_types table is modified (INSERT/UPDATE/DELETE)';
    RAISE NOTICE '  - onchain_metrics_info table is modified (INSERT/UPDATE/DELETE)';
    RAISE NOTICE 'To test triggers, run: SELECT test_menu_triggers();';
END $$;
