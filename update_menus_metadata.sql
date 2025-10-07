-- Update menus table with OnChain indicators metadata
-- This script updates the menu_metadata for each onchain indicator

-- Update MVRV Z-Score metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "Market Value to Realized Value Z-Score - identifies market tops and bottoms",
    "ko": "시장 가치 대 실현 가치 Z-점수 - 시장 고점과 저점 식별"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'mvrv_z_score' AND source_type = 'dynamic';

-- Update NUPL metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "Net Unrealized Profit/Loss - Shows the overall profit/loss state of the network to identify market sentiment",
    "ko": "순 미실현 손익 - 네트워크의 전반적인 손익 상태를 보여주어 시장 심리를 파악합니다"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'nupl' AND source_type = 'dynamic';

-- Update Realized Cap metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "Realized Cap - A fair value capitalization of Bitcoin based on last moved prices",
    "ko": "실현 시가총액 - 마지막 이동 가격을 기준으로 한 비트코인의 공정 가치 자본화"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'realized_cap' AND source_type = 'dynamic';

-- Update Thermo Cap metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "Thermo Cap - The total cumulative security expenditure of the network",
    "ko": "서모캡 - 네트워크의 총 누적 보안 비용"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'thermo_cap' AND source_type = 'dynamic';

-- Update Realized Price metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "Realized Price - The average price at which all coins in circulation were last moved",
    "ko": "실현 가격 - 유통 중인 모든 코인이 마지막으로 이동했을 때의 평균 가격"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'realized_price' AND source_type = 'dynamic';

-- Update True Market Mean metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "True Market Mean - The market long-term value centerline",
    "ko": "진정한 시장 평균가 - 시장의 장기적인 가치 중심선"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'true_market_mean' AND source_type = 'dynamic';

-- Update AVIV metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "AVIV Ratio - A market over/under-valuation oscillator",
    "ko": "AVIV 비율 - 시장 고평가/저평가 측정 오실레이터"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'aviv' AND source_type = 'dynamic';

-- Update SOPR metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "Spent Output Profit Ratio - Indicates whether holders are selling at a profit or loss",
    "ko": "소비된 출력물 수익 비율(SOPR) - 보유자들이 이익을 보고 파는지 손해를 보고 파는지 나타냅니다"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'sopr' AND source_type = 'dynamic';

-- Update CDD 90DMA metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "Coin Days Destroyed 90DMA - Tracking the activity of long-term holders",
    "ko": "코인 소멸 일수 (CDD-90DMA) - 장기 보유자의 활동 추적"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'cdd_90dma' AND source_type = 'dynamic';

-- Update HODL Waves Supply metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "HODL Waves Supply - Visualizing the age distribution of Bitcoin supply",
    "ko": "HODL 웨이브 - 비트코인 공급량의 연령 분포 시각화"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'hodl_waves_supply' AND source_type = 'dynamic';

-- Update NRPL BTC metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "Net Realized Profit/Loss - Measuring the market daily profitability",
    "ko": "순 실현 손익 (NRPL) - 시장의 일일 수익성 측정"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'nrpl_btc' AND source_type = 'dynamic';

-- Update Hash Rate metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "Hash Rate - The total combined computational power being used to mine and process transactions",
    "ko": "해시레이트 - 트랜잭션을 채굴하고 처리하는 데 사용되는 총 연산 능력"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'hashrate' AND source_type = 'dynamic';

-- Update Difficulty metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "Mining Difficulty - Moving averages of mining difficulty to signal potential miner capitulation",
    "ko": "채굴 난이도 - 채굴 난이도의 이동 평균으로, 채굴자 항복 가능성을 신호합니다"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'difficulty' AND source_type = 'dynamic';

-- Update Miner Reserves metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "Miner Reserves - Gauging selling pressure from key suppliers",
    "ko": "채굴자 보유량 - 주요 공급자의 매도 압력 측정"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'miner_reserves' AND source_type = 'dynamic';

-- Update Open Interest Futures metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "Futures Open Interest - The total number of outstanding futures contracts that have not been settled",
    "ko": "선물 미결제 약정 - 아직 결제되지 않은 총 미결제 선물 계약 수"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'open_interest_futures' AND source_type = 'dynamic';

-- Update ETF BTC Total metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "ETF Total Bitcoin Holdings - A barometer for institutional demand",
    "ko": "ETF 총 비트코인 보유량 - 기관 투자 수요의 바로미터"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'etf_btc_total' AND source_type = 'dynamic';

-- Update ETF BTC Flow metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "ETF Bitcoin Daily Flows - Daily net inflows/outflows to Bitcoin ETFs",
    "ko": "ETF 비트코인 일일 유입/유출 - 비트코인 ETF의 일일 순유입/유출"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'etf_btc_flow' AND source_type = 'dynamic';

-- Update HODL Age Distribution metadata
UPDATE menus 
SET menu_metadata = '{
  "description": {
    "en": "HODL Age Distribution - Detailed breakdown of Bitcoin supply by age cohorts",
    "ko": "HODL 연령 분포 - 연령대별 비트코인 공급량의 상세 분석"
  },
  "permissions": ["user", "admin"]
}'::jsonb
WHERE name = 'hodl_age_distribution' AND source_type = 'dynamic';

-- Verify updates
SELECT name, menu_metadata 
FROM menus 
WHERE source_type = 'dynamic' 
AND name IN (
  'mvrv_z_score', 'nupl', 'realized_cap', 'thermo_cap', 'realized_price', 
  'true_market_mean', 'aviv', 'sopr', 'cdd_90dma', 'hodl_waves_supply', 
  'nrpl_btc', 'hashrate', 'difficulty', 'miner_reserves', 'open_interest_futures', 
  'etf_btc_total', 'etf_btc_flow', 'hodl_age_distribution'
)
ORDER BY name;
