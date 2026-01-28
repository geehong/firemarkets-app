"""fix_refresh_dynamic_menus_function

Revision ID: d8102f502733
Revises: d8f15d289531
Create Date: 2026-01-28 09:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd8102f502733'
down_revision = 'd8f15d289531'
branch_labels = None
depends_on = None


def upgrade():
    # Replace the problematic function with the correct version
    # This version removes references to missing columns like 'miner_reserves'
    # and correctly uses 'onchain_metrics_info'
    op.execute("""
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
            INSERT INTO menus (name, icon, "order", source_type, menu_metadata) 
            VALUES ('Assets', 'cibGoldenline', 20, 'static', '{"description": "자산 분석 및 관리", "permissions": ["user", "admin"], "badge": null}') 
            RETURNING id INTO assets_menu_id;
        ELSE
            -- 기존 Assets 메뉴에서 path 제거 (그룹으로만 표시)
            UPDATE menus SET path = NULL WHERE id = assets_menu_id;
        END IF;

        -- OnChain
        SELECT id INTO onchain_menu_id FROM menus WHERE name = 'OnChain' AND parent_id IS NULL;
        IF onchain_menu_id IS NULL THEN
            INSERT INTO menus (name, icon, "order", source_type, menu_metadata) 
            VALUES ('OnChain', 'cibBitcoin', 30, 'static', '{"description": "온체인 데이터 분석", "permissions": ["user", "admin"], "badge": "NEW"}') 
            RETURNING id INTO onchain_menu_id;
        END IF;

        -- Map
        SELECT id INTO map_menu_id FROM menus WHERE name = 'Map' AND parent_id IS NULL;
        IF map_menu_id IS NULL THEN
            INSERT INTO menus (name, icon, "order", source_type, menu_metadata) 
            VALUES ('Map', 'cilChartPie', 40, 'static', '{"description": "지도 및 시각화", "permissions": ["user", "admin"], "badge": null}') 
            RETURNING id INTO map_menu_id;
        END IF;

        -- 3. 'Assets' 하위 메뉴 동적 생성
        -- 3-1. "All Assets" 메뉴 추가 (전체 자산)
        -- Assets 메뉴가 존재하는 경우에만 All Assets 메뉴 추가
        IF assets_menu_id IS NOT NULL THEN
            INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
            VALUES (
                'All Assets',
                '/assets',
                assets_menu_id,
                5,
                'dynamic',
                '{"description": "전체 자산 보기", "permissions": ["user", "admin"], "badge": null}'
            );

            -- 3-2. 자산 유형별 메뉴 생성 (asset_types 테이블 기반)
            FOR asset_type_record IN SELECT type_name FROM asset_types ORDER BY asset_type_id LOOP
            INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
            VALUES (
                asset_type_record.type_name,
                '/assets?type_name=' || asset_type_record.type_name,
                assets_menu_id,
                (SELECT COALESCE(MAX("order"), 0) + 10 FROM menus WHERE parent_id = assets_menu_id),
                'dynamic',
                '{"description": "' || asset_type_record.type_name || ' 자산 분석", "permissions": ["user", "admin"], "badge": null}'
            );
        END LOOP;
        END IF;

        -- 4. 'OnChain' 하위 메뉴 동적 생성 (onchain_metrics_info 테이블 기반)
        FOR onchain_category_record IN 
            SELECT DISTINCT category FROM onchain_metrics_info WHERE is_enabled = TRUE ORDER BY category 
        LOOP
            -- 카테고리 그룹 메뉴 생성
            INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata)
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
                INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
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
            INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
            VALUES ('Performance Map', '/overviews/treemap', map_menu_id, 10, 'static', '{"description": "성과 지도 시각화", "permissions": ["user", "admin"], "badge": null}');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM menus WHERE name = 'World Assets TreeMap' AND parent_id = map_menu_id) THEN
            INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
            VALUES ('World Assets TreeMap', '/world-assets-treemap', map_menu_id, 20, 'static', '{"description": "전 세계 자산 트리맵", "permissions": ["user", "admin"], "badge": null}');
        END IF;

    END;
    $$ LANGUAGE plpgsql;
    """)


def downgrade():
    # We might not be able to fully restore the BROKEN state easily without references to missing columns
    # causing errors, but we can just leave it or try to put back a simpler version.
    # For now, let's just assume we don't want to revert to a broken state.
    pass
