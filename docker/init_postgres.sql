-- PostgreSQL 동적 메뉴 시스템 추가 스크립트
-- FireMarkets 프로젝트용 - 기존 테이블은 건드리지 않고 메뉴 시스템만 추가

-- 기본 확장 기능 활성화 (이미 존재할 수 있음)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- >> START: Dynamic Menu System Setup
-- ------------------------------------------------------------------
-- 1. 메뉴 구조를 저장할 테이블
CREATE TABLE IF NOT EXISTS menus (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    path VARCHAR(255),
    icon VARCHAR(100),
    parent_id INTEGER REFERENCES menus(id) ON DELETE CASCADE,
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    -- 'static' 또는 'dynamic'으로 메뉴 항목의 출처를 구분
    source_type VARCHAR(20) DEFAULT 'static' NOT NULL,
    -- JSON 컬럼: 메뉴의 추가 정보 (설명, 권한, 설정 등)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. 메뉴 업데이트 시각을 기록할 트리거 함수
CREATE OR REPLACE FUNCTION update_menus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. 트리거 적용
DROP TRIGGER IF EXISTS trg_update_menus_updated_at ON menus;
CREATE TRIGGER trg_update_menus_updated_at
    BEFORE UPDATE ON menus
    FOR EACH ROW
    EXECUTE FUNCTION update_menus_updated_at();

-- 4. 동적 메뉴를 업데이트하는 저장 프로시저
CREATE OR REPLACE FUNCTION refresh_dynamic_menus()
RETURNS void AS $$
DECLARE
    assets_menu_id INT;
    onchain_menu_id INT;
    map_menu_id INT;
    asset_type_record RECORD;
    onchain_category_record RECORD;
    onchain_metric_record RECORD;
    onchain_category_menu_id INT;
BEGIN
    -- 1. 기존 동적 메뉴 항목 삭제
    DELETE FROM menus WHERE source_type = 'dynamic';

    -- 2. 정적 메인 메뉴 ID 확인 및 없으면 생성
    -- Assets
    SELECT id INTO assets_menu_id FROM menus WHERE name = 'Assets' AND parent_id IS NULL;
    IF assets_menu_id IS NULL THEN
        INSERT INTO menus (name, icon, "order", source_type, metadata) 
        VALUES ('Assets', 'cibGoldenline', 20, 'static', '{"description": "자산 분석 및 관리", "permissions": ["user", "admin"], "badge": null}') 
        RETURNING id INTO assets_menu_id;
    END IF;

    -- OnChain
    SELECT id INTO onchain_menu_id FROM menus WHERE name = 'OnChain' AND parent_id IS NULL;
    IF onchain_menu_id IS NULL THEN
        INSERT INTO menus (name, icon, "order", source_type, metadata) 
        VALUES ('OnChain', 'cibBitcoin', 30, 'static', '{"description": "온체인 데이터 분석", "permissions": ["user", "admin"], "badge": "NEW"}') 
        RETURNING id INTO onchain_menu_id;
    END IF;

    -- Map
    SELECT id INTO map_menu_id FROM menus WHERE name = 'Map' AND parent_id IS NULL;
    IF map_menu_id IS NULL THEN
        INSERT INTO menus (name, icon, "order", source_type, metadata) 
        VALUES ('Map', 'cilChartPie', 40, 'static', '{"description": "지도 및 시각화", "permissions": ["user", "admin"], "badge": null}') 
        RETURNING id INTO map_menu_id;
    END IF;

    -- 3. 'Assets' 하위 메뉴 동적 생성 (asset_types 테이블 기반)
    FOR asset_type_record IN SELECT type_name FROM asset_types ORDER BY asset_type_id LOOP
        INSERT INTO menus (name, path, parent_id, "order", source_type, metadata)
        VALUES (
            asset_type_record.type_name,
            '/assets?type_name=' || asset_type_record.type_name,
            assets_menu_id,
            (SELECT COALESCE(MAX("order"), 0) + 10 FROM menus WHERE parent_id = assets_menu_id),
            'dynamic',
            '{"description": "' || asset_type_record.type_name || ' 자산 분석", "permissions": ["user", "admin"], "badge": null}'
        );
    END LOOP;

    -- 4. 'OnChain' 하위 메뉴 동적 생성 (onchain_metrics_info 테이블 기반)
    FOR onchain_category_record IN 
        SELECT DISTINCT category FROM onchain_metrics_info WHERE is_enabled = TRUE ORDER BY category 
    LOOP
        -- 카테고리 그룹 메뉴 생성
        INSERT INTO menus (name, icon, parent_id, "order", source_type, metadata)
        VALUES (
            REPLACE(INITCAP(REPLACE(onchain_category_record.category, '_', ' ')), 'Btc', 'BTC'), -- 'market_metrics' -> 'Market Metrics'
            'cibMatrix',
            onchain_menu_id,
            (SELECT COALESCE(MAX("order"), 0) + 10 FROM menus WHERE parent_id = onchain_menu_id),
            'dynamic',
            '{"description": "' || onchain_category_record.category || ' 메트릭 분석", "permissions": ["user", "admin"], "badge": null}'
        ) RETURNING id INTO onchain_category_menu_id;

        -- 카테고리별 개별 메트릭 메뉴 생성
        FOR onchain_metric_record IN 
            SELECT metric_id, name FROM onchain_metrics_info 
            WHERE category = onchain_category_record.category AND is_enabled = TRUE 
            ORDER BY name 
        LOOP
            INSERT INTO menus (name, path, parent_id, "order", source_type, metadata)
            VALUES (
                onchain_metric_record.name,
                '/onchain/overviews?metric=' || onchain_metric_record.metric_id,
                onchain_category_menu_id,
                (SELECT COALESCE(MAX("order"), 0) + 10 FROM menus WHERE parent_id = onchain_category_menu_id),
                'dynamic',
                '{"description": "' || onchain_metric_record.name || ' 분석", "permissions": ["user", "admin"], "badge": null}'
            );
        END LOOP;
    END LOOP;

    -- 5. 'Map' 하위 메뉴 정적으로 생성 (필요시 동적으로 변경 가능)
    -- 이미 있는 경우 중복 방지
    IF NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Performance Map' AND parent_id = map_menu_id) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, metadata)
        VALUES ('Performance Map', '/overviews/treemap', map_menu_id, 10, 'static', '{"description": "성과 지도 시각화", "permissions": ["user", "admin"], "badge": null}');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM menus WHERE name = 'World Assets TreeMap' AND parent_id = map_menu_id) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, metadata)
        VALUES ('World Assets TreeMap', '/world-assets-treemap', map_menu_id, 20, 'static', '{"description": "전 세계 자산 트리맵", "permissions": ["user", "admin"], "badge": null}');
    END IF;

END;
$$ LANGUAGE plpgsql;

-- 6. 초기 정적 메뉴 데이터 삽입 (중복 방지)
INSERT INTO menus (name, path, icon, "order", source_type, metadata) 
SELECT 'Dashboard', '/dashboard', 'cilSpeedometer', 10, 'static', '{"description": "대시보드 메인 페이지", "permissions": ["user", "admin"], "badge": "NEW"}'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Dashboard' AND path = '/dashboard');

-- 7. 저장 프로시저 최초 실행 (오류 발생 시 무시)
DO $$
BEGIN
    PERFORM refresh_dynamic_menus();
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Dynamic menu refresh failed: %', SQLERRM;
END $$;

-- ------------------------------------------------------------------
-- << END: Dynamic Menu System Setup

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'Dynamic Menu System 추가 완료: menu_info 테이블 및 저장 프로시저 생성됨';
    RAISE NOTICE '기존 테이블들은 건드리지 않았습니다.';
END $$;