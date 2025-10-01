-- metadata 컬럼을 menu_metadata로 이름 변경
-- SQLAlchemy에서 metadata는 예약어이므로 변경 필요

-- 컬럼명 변경
ALTER TABLE menus RENAME COLUMN metadata TO menu_metadata;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '컬럼명 변경 완료: metadata -> menu_metadata';
END $$;
