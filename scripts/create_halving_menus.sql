-- OnChain > Halving 메뉴 구조 생성
-- 기존 OnChain 메뉴 ID를 확인하고 하위 메뉴들을 추가

-- 1. OnChain 메뉴가 있는지 확인 (name이 'OnChain'인 메뉴)
-- 만약 없다면 먼저 OnChain 메뉴를 생성해야 함

-- OnChain 메뉴 ID 확인 (일반적으로 ID 3이 OnChain일 것으로 예상)
-- 실제 환경에서는 확인 후 조정 필요

-- 2. Halving 메인 메뉴 생성
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata)
VALUES (
  'Halving', 
  'cibBitcoin', 
  3,  -- OnChain 메뉴의 ID (실제 환경에서 확인 필요)
  1, 
  'dynamic', 
  '{"description": {"en": "Bitcoin halving analysis and cycle indicators", "ko": "비트코인 반감기 분석 및 사이클 지표"}, "permissions": ["user", "admin"]}'::jsonb
);

-- Halving 메뉴의 ID를 가져와서 하위 메뉴들 생성
-- (실제로는 위 INSERT 후 반환된 ID를 사용해야 하지만, 여기서는 변수로 처리)

-- 3. Halving Bull Chart 메뉴 (OnchainDataOverviews.js + HalvingChart.js 사용)
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata, path)
VALUES (
  'Halving Bull Chart', 
  'cibChartLine', 
  (SELECT id FROM menus WHERE name = 'Halving' AND parent_id = 3 ORDER BY id DESC LIMIT 1), 
  1, 
  'dynamic', 
  '{"description": {"en": "Bitcoin halving bull market cycle analysis", "ko": "비트코인 반감기 불마켓 사이클 분석"}, "permissions": ["user", "admin"], "component": "OnchainDataOverviews", "chartComponent": "HalvingChart"}'::jsonb,
  '/onchain/halving-bull-chart'
);

-- 4. Halving Spiral 메뉴 (예비)
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata, path)
VALUES (
  'Halving Spiral', 
  'cibSpiral', 
  (SELECT id FROM menus WHERE name = 'Halving' AND parent_id = 3 ORDER BY id DESC LIMIT 1), 
  2, 
  'dynamic', 
  '{"description": {"en": "Bitcoin halving spiral analysis", "ko": "비트코인 반감기 스파이럴 분석"}, "permissions": ["user", "admin"], "component": "HalvingSpiral", "status": "planned"}'::jsonb,
  '/onchain/halving/spiral'
);

-- 5. Halving Progress 메뉴 (예비)
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata, path)
VALUES (
  'Halving Progress', 
  'cibProgress', 
  (SELECT id FROM menus WHERE name = 'Halving' AND parent_id = 3 ORDER BY id DESC LIMIT 1), 
  3, 
  'dynamic', 
  '{"description": {"en": "Bitcoin halving progress tracking", "ko": "비트코인 반감기 진행률 추적"}, "permissions": ["user", "admin"], "component": "HalvingProgress", "status": "planned"}'::jsonb,
  '/onchain/halving/progress'
);

-- 6. Halving Seasons 메뉴 (예비)
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata, path)
VALUES (
  'Halving Seasons', 
  'cibCalendar', 
  (SELECT id FROM menus WHERE name = 'Halving' AND parent_id = 3 ORDER BY id DESC LIMIT 1), 
  4, 
  'dynamic', 
  '{"description": {"en": "Bitcoin halving seasonal analysis", "ko": "비트코인 반감기 계절성 분석"}, "permissions": ["user", "admin"], "component": "HalvingSeasons", "status": "planned"}'::jsonb,
  '/onchain/halving/seasons'
);

-- 메뉴 생성 확인 쿼리
SELECT 
  m1.id as halving_id,
  m1.name as halving_name,
  m2.id as submenu_id,
  m2.name as submenu_name,
  m2.path,
  m2.menu_metadata->>'status' as status
FROM menus m1
LEFT JOIN menus m2 ON m2.parent_id = m1.id
WHERE m1.name = 'Halving' AND m1.parent_id = 3
ORDER BY m2."order";
