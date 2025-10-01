-- refresh_dynamic_menus 프로시저 업데이트
-- 실제 데이터 존재 조건으로 동적 메뉴 생성

CREATE OR REPLACE FUNCTION refresh_dynamic_menus()
RETURNS void AS $$
DECLARE
    onchain_menu_id INT;
    map_menu_id INT;
    asset_type_record RECORD;
    metric_column TEXT;
    metric_columns TEXT[] := ARRAY[
        'mvrv_z_score', 'realized_price', 'hashrate', 'difficulty', 
        'miner_reserves', 'etf_btc_total', 'sopr', 'nupl', 
        'open_interest_futures', 'realized_cap', 'cdd_90dma', 
        'true_market_mean', 'nrpl_btc', 'aviv', 'thermo_cap', 
        'hodl_waves_supply', 'etf_btc_flow', 'hodl_age_distribution'
    ];
    category_name TEXT;
    category_order INT := 10;
BEGIN
    -- 1. 기존 동적 메뉴 항목 삭제
    DELETE FROM menus WHERE source_type = 'dynamic';

    -- 2. 정적 메인 메뉴 ID 확인 및 없으면 생성

    -- OnChain
    SELECT id INTO onchain_menu_id FROM menus WHERE name = 'OnChain' AND parent_id IS NULL;
    IF onchain_menu_id IS NULL THEN
        INSERT INTO menus (name, icon, "order", source_type, menu_metadata) 
        VALUES ('OnChain', 'cibBitcoin', 30, 'static', 
                '{"description": {"en": "On-chain data analysis and metrics", "ko": "온체인 데이터 분석 및 메트릭"}, "permissions": ["user", "admin"]}'::jsonb) 
        RETURNING id INTO onchain_menu_id;
    END IF;

    -- Map
    SELECT id INTO map_menu_id FROM menus WHERE name = 'Map' AND parent_id IS NULL;
    IF map_menu_id IS NULL THEN
        INSERT INTO menus (name, icon, "order", source_type, menu_metadata) 
        VALUES ('Map', 'cilChartPie', 40, 'static', 
                '{"description": {"en": "Interactive maps and visualizations", "ko": "인터랙티브 지도 및 시각화"}, "permissions": ["user", "admin"]}'::jsonb) 
        RETURNING id INTO map_menu_id;
    END IF;

    -- 3. 'Assets' 하위 메뉴 동적 생성
    -- 3-1. "All Assets" 메뉴 추가 (전체 자산)
    -- Assets 메뉴가 없으면 먼저 생성
    INSERT INTO menus (name, icon, "order", source_type, menu_metadata) 
    SELECT 'Assets', 'cibGoldenline', 20, 'static', 
           '{"description": {"en": "Asset analysis and management tools", "ko": "자산 분석 및 관리 도구"}, "permissions": ["user", "admin"]}'::jsonb
    WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Assets' AND parent_id IS NULL);
    
    -- All Assets 메뉴 추가
    INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
    VALUES (
        'All Assets',
        '/assets',
        (SELECT id FROM menus WHERE name = 'Assets' AND parent_id IS NULL),
        5,
        'dynamic',
        '{"description": {"en": "View all assets", "ko": "전체 자산 보기"}, "permissions": ["user", "admin"]}'::jsonb
    );

    -- 3-2. 자산 유형별 메뉴 생성 (실제 데이터가 있는 asset_types만)
        FOR asset_type_record IN 
        SELECT DISTINCT at.type_name, at.asset_type_id
        FROM asset_types at
        WHERE EXISTS (
            -- stock_profiles에 데이터가 있는 경우 (assets 테이블을 통해 연결)
            SELECT 1 FROM stock_profiles sp 
            JOIN assets a ON sp.asset_id = a.asset_id
            WHERE a.asset_type_id = at.asset_type_id
            UNION ALL
            -- crypto_data에 데이터가 있는 경우 (assets 테이블을 통해 연결)
            SELECT 1 FROM crypto_data cd 
            JOIN assets a ON cd.asset_id = a.asset_id
            WHERE a.asset_type_id = at.asset_type_id
            UNION ALL
            -- etf_info에 데이터가 있는 경우 (assets 테이블을 통해 연결)
            SELECT 1 FROM etf_info ei 
            JOIN assets a ON ei.asset_id = a.asset_id
            WHERE a.asset_type_id = at.asset_type_id
            UNION ALL
            -- ohlcv_day_data에 데이터가 있는 경우 (assets 테이블을 통해 연결)
            SELECT 1 FROM ohlcv_day_data od 
            JOIN assets a ON od.asset_id = a.asset_id
            WHERE a.asset_type_id = at.asset_type_id
            UNION ALL
            -- ohlcv_intraday_data에 데이터가 있는 경우 (assets 테이블을 통해 연결)
            SELECT 1 FROM ohlcv_intraday_data oi 
            JOIN assets a ON oi.asset_id = a.asset_id
            WHERE a.asset_type_id = at.asset_type_id
            UNION ALL
            -- world_assets_ranking에 데이터가 있는 경우 (assets 테이블을 통해 연결)
            SELECT 1 FROM world_assets_ranking war 
            JOIN assets a ON war.asset_id = a.asset_id
            WHERE a.asset_type_id = at.asset_type_id
        )
        ORDER BY at.asset_type_id
    LOOP
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            asset_type_record.type_name,
            '/assets?type_name=' || asset_type_record.type_name,
            (SELECT id FROM menus WHERE name = 'Assets' AND parent_id IS NULL),
            (SELECT COALESCE(MAX("order"), 0) + 10 FROM menus WHERE parent_id = (SELECT id FROM menus WHERE name = 'Assets' AND parent_id IS NULL)),
            'dynamic',
            '{"description": {"en": "Asset analysis for ' || asset_type_record.type_name || '", "ko": "' || asset_type_record.type_name || ' 자산 분석"}, "permissions": ["user", "admin"]}'::jsonb
        );
    END LOOP;

    -- 4. 'OnChain' 하위 메뉴 동적 생성 (crypto_metrics에 실제 데이터가 있는 컬럼들만)
    -- Market Metrics 카테고리
    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE mvrv_z_score IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'MVRV Z-Score (Market Value to Realized Value Z-Score)',
            '/onchain/overviews?metric=mvrv_z_score',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Market Value to Realized Value Z-Score - identifies market tops and bottoms", "ko": "시장 가치 대 실현 가치 Z-점수 - 시장 고점과 저점 식별"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE realized_price IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'Realized Price',
            '/onchain/overviews?metric=realized_price',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Average price when coins were last moved - long-term investor cost basis", "ko": "코인이 마지막으로 이동된 평균 가격 - 장기 투자자 비용 기준"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE sopr IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'SOPR (Spent Output Profit Ratio)',
            '/onchain/overviews?metric=sopr',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Whether sold coins were profitable or at loss - gauges profit-taking sentiment", "ko": "판매된 코인이 수익 또는 손실인지 - 수익 실현 심리 측정"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE nupl IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'NUPL (Net Unrealized Profit/Loss)',
            '/onchain/overviews?metric=nupl',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Total unrealized profit/loss of unsold coins - measures market greed and fear", "ko": "미판매 코인의 총 미실현 손익 - 시장 탐욕과 공포 측정"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE realized_cap IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'Realized Cap',
            '/onchain/overviews?metric=realized_cap',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Value of all bitcoins at last moved price - actual capital inflow indicator", "ko": "마지막 이동 가격의 모든 비트코인 가치 - 실제 자본 유입 지표"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE cdd_90dma IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'CDD (90-Day Moving Average)',
            '/onchain/overviews?metric=cdd_90dma',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "90-day moving average of Coin Days Destroyed - tracks long-term holder behavior", "ko": "코인 일수 소멸 90일 이동평균 - 장기 보유자 행동 추적"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE nrpl_btc IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'NRPL (Net Realized Profit/Loss)',
            '/onchain/overviews?metric=nrpl_btc',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Net value of all on-chain transactions - shows actual profit/loss scale", "ko": "모든 온체인 거래의 순 가치 - 실제 손익 규모 표시"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE aviv IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'AVIV Ratio (Active Value to Investor Value)',
            '/onchain/overviews?metric=aviv',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Active Value to Investor Value ratio - compares short-term traders vs long-term holders", "ko": "활성 가치 대 투자자 가치 비율 - 단기 거래자와 장기 보유자 비교"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE hodl_waves_supply IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'HODL Waves',
            '/onchain/overviews?metric=hodl_waves_supply',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Bitcoin age distribution visualization - shows long-term vs short-term holder ratio", "ko": "비트코인 연령 분포 시각화 - 장기 vs 단기 보유자 비율 표시"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    -- Mining Metrics 카테고리
    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE hashrate IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'Hash Rate',
            '/onchain/overviews?metric=hashrate',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Total computational power securing Bitcoin network - key security indicator", "ko": "비트코인 네트워크 보안 총 연산력 - 핵심 보안 지표"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE difficulty IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'Difficulty',
            '/onchain/overviews?metric=difficulty',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Mining difficulty - measures how hard it is to find new blocks", "ko": "채굴 난이도 - 새로운 블록을 찾는 어려움 측정"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE miner_reserves IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'Miner Reserves',
            '/onchain/overviews?metric=miner_reserves',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Total Bitcoin held by known miner wallets - potential selling pressure gauge", "ko": "알려진 채굴자 지갑 총 비트코인 보유량 - 잠재적 매도 압력 측정"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE thermo_cap IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'Thermo Cap',
            '/onchain/overviews?metric=thermo_cap',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Cumulative security spend by miners - network economic foundation", "ko": "채굴자의 누적 보안 지출 - 네트워크 경제적 기반"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    -- Institutional Metrics 카테고리
    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE etf_btc_total IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'ETF BTC Total',
            '/onchain/overviews?metric=etf_btc_total',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Total Bitcoin held by all spot ETFs worldwide - institutional demand indicator", "ko": "전 세계 스팟 ETF 총 비트코인 보유량 - 기관 수요 지표"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE etf_btc_flow IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'ETF BTC Flow',
            '/onchain/overviews?metric=etf_btc_flow',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Daily net Bitcoin flow in/out of spot ETFs - shows institutional buying/selling pressure", "ko": "스팟 ETF 일일 순 비트코인 흐름 - 기관 매수/매도 압력 표시"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    -- Derivatives Metrics 카테고리
    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE open_interest_futures IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'Open Interest (Futures)',
            '/onchain/overviews?metric=open_interest_futures',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Total outstanding futures contracts - gauges leverage and volatility potential", "ko": "총 미결제 선물 계약 - 레버리지와 변동성 잠재력 측정"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    -- Price Metrics 카테고리
    IF EXISTS (SELECT 1 FROM crypto_metrics WHERE true_market_mean IS NOT NULL LIMIT 1) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES (
            'True Market Mean',
            '/onchain/overviews?metric=true_market_mean',
            onchain_menu_id,
            category_order,
            'dynamic',
            '{"description": {"en": "Average price from various Bitcoin valuation models - intrinsic value estimate", "ko": "다양한 비트코인 가치 평가 모델의 평균 가격 - 내재 가치 추정"}, "permissions": ["user", "admin"]}'::jsonb
        );
        category_order := category_order + 10;
    END IF;

    -- 5. 'Map' 하위 메뉴 정적으로 생성
    IF NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Performance Map' AND parent_id = map_menu_id) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES ('Performance Map', '/overviews/treemap', map_menu_id, 10, 'static',
                '{"description": {"en": "Performance visualization map", "ko": "성과 시각화 지도"}, "permissions": ["user", "admin"]}'::jsonb);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM menus WHERE name = 'World Assets TreeMap' AND parent_id = map_menu_id) THEN
        INSERT INTO menus (name, path, parent_id, "order", source_type, menu_metadata)
        VALUES ('World Assets TreeMap', '/world-assets-treemap', map_menu_id, 20, 'static',
                '{"description": {"en": "Global assets treemap visualization", "ko": "전 세계 자산 트리맵 시각화"}, "permissions": ["user", "admin"]}'::jsonb);
    END IF;

END;
$$ LANGUAGE plpgsql;

-- 6. 자동 트리거 추가 (asset_types, crypto_metrics 테이블 변경 시 자동 실행)
-- 동적 메뉴 새로고침 트리거 함수
CREATE OR REPLACE FUNCTION trigger_refresh_menus()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM refresh_dynamic_menus();
    RETURN NULL; -- AFTER 트리거이므로 NULL 반환
END;
$$ LANGUAGE plpgsql;

-- asset_types 테이블 변경 시 트리거
DROP TRIGGER IF EXISTS trg_asset_types_changed ON asset_types;
CREATE TRIGGER trg_asset_types_changed
    AFTER INSERT OR UPDATE OR DELETE ON asset_types
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_menus();

-- crypto_metrics 테이블 변경 시 트리거  
DROP TRIGGER IF EXISTS trg_crypto_metrics_changed ON crypto_metrics;
CREATE TRIGGER trg_crypto_metrics_changed
    AFTER INSERT OR UPDATE OR DELETE ON crypto_metrics
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_menus();

-- 7. 기존 데이터 중복 방지 및 메뉴 새로고침 실행
DO $$
BEGIN
    -- 기존 동적 메뉴 새로고침
    PERFORM refresh_dynamic_menus();
    
    RAISE NOTICE 'refresh_dynamic_menus 프로시저가 업데이트되었습니다.';
    RAISE NOTICE 'Assets: 실제 데이터가 있는 asset_types만 메뉴에 표시';
    RAISE NOTICE 'OnChain: crypto_metrics에 데이터가 있는 컬럼들만 메뉴에 표시';
    RAISE NOTICE '자동 트리거가 asset_types 및 crypto_metrics 테이블에 추가되었습니다.';
END $$;
