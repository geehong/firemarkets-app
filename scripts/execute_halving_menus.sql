-- Halving 메뉴 생성 실행 스크립트
-- 이 스크립트는 create_halving_menus.sql의 내용을 실행합니다

-- 실행 전 확인사항:
-- 1. OnChain 메뉴가 존재하는지 확인
-- 2. 기존 Halving 메뉴가 있는지 확인 (중복 방지)

-- OnChain 메뉴 존재 확인
SELECT id, name, parent_id FROM menus WHERE name = 'OnChain' LIMIT 1;

-- 기존 Halving 메뉴 확인
SELECT id, name, parent_id FROM menus WHERE name = 'Halving' LIMIT 1;

-- OnChain 메뉴가 없으면 먼저 생성
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata)
SELECT 'OnChain', 'cibBitcoin', 1, 3, 'dynamic', '{"description": {"en": "On-chain data analysis", "ko": "온체인 데이터 분석"}, "permissions": ["user", "admin"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'OnChain');

-- Halving 메뉴 생성 (OnChain이 존재하는 경우에만)
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata)
SELECT 
  'Halving', 
  'cibBitcoin', 
  (SELECT id FROM menus WHERE name = 'OnChain' LIMIT 1), 
  1, 
  'dynamic', 
  '{"description": {"en": "Bitcoin halving analysis and cycle indicators", "ko": "비트코인 반감기 분석 및 사이클 지표"}, "permissions": ["user", "admin"]}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Halving');

-- Halving Bull Chart 메뉴 생성
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata, path)
SELECT 
  'Halving Bull Chart', 
  'cibChartLine', 
  (SELECT id FROM menus WHERE name = 'Halving' LIMIT 1), 
  1, 
  'dynamic', 
  '{"description": {"en": "Bitcoin halving bull market cycle analysis", "ko": "비트코인 반감기 불마켓 사이클 분석"}, "permissions": ["user", "admin"], "component": "OnchainDataOverviews", "chartComponent": "HalvingChart"}'::jsonb,
  '/onchain/halving-bull-chart'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Halving Bull Chart');

-- Halving Spiral 메뉴 생성
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata, path)
SELECT 
  'Halving Spiral', 
  'cibSpiral', 
  (SELECT id FROM menus WHERE name = 'Halving' LIMIT 1), 
  2, 
  'dynamic', 
  '{"description": {"en": "Bitcoin halving spiral analysis", "ko": "비트코인 반감기 스파이럴 분석"}, "permissions": ["user", "admin"], "component": "HalvingSpiral", "status": "planned"}'::jsonb,
  '/onchain/halving/spiral'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Halving Spiral');

-- Halving Progress 메뉴 생성
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata, path)
SELECT 
  'Halving Progress', 
  'cibProgress', 
  (SELECT id FROM menus WHERE name = 'Halving' LIMIT 1), 
  3, 
  'dynamic', 
  '{"description": {"en": "Bitcoin halving progress tracking", "ko": "비트코인 반감기 진행률 추적"}, "permissions": ["user", "admin"], "component": "HalvingProgress", "status": "planned"}'::jsonb,
  '/onchain/halving/progress'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Halving Progress');

-- Halving Seasons 메뉴 생성
INSERT INTO menus (name, icon, parent_id, "order", source_type, menu_metadata, path)
SELECT 
  'Halving Seasons', 
  'cibCalendar', 
  (SELECT id FROM menus WHERE name = 'Halving' LIMIT 1), 
  4, 
  'dynamic', 
  '{"description": {"en": "Bitcoin halving seasonal analysis", "ko": "비트코인 반감기 계절성 분석"}, "permissions": ["user", "admin"], "component": "HalvingSeasons", "status": "planned"}'::jsonb,
  '/onchain/halving/seasons'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = 'Halving Seasons');

-- 생성된 메뉴 구조 확인
SELECT 
  m1.id as halving_id,
  m1.name as halving_name,
  m1.path as halving_route,
  m2.id as submenu_id,
  m2.name as submenu_name,
  m2.path,
  m2.menu_metadata->>'status' as status,
  m2.menu_metadata->>'component' as component
FROM menus m1
LEFT JOIN menus m2 ON m2.parent_id = m1.id
WHERE m1.name = 'Halving'
ORDER BY m2."order";
