-- 데이터베이스 경로를 기존 페이지에 맞게 수정하는 SQL

-- 1. Dashboard 경로 수정 (루트 페이지로)
UPDATE menus 
SET path = '/' 
WHERE name = 'Dashboard' AND path = '/dashboard';

-- 2. Charts 관련 경로들을 기존 페이지로 리다이렉트
-- Line Chart -> assets 페이지로
UPDATE menus 
SET path = '/assets' 
WHERE name = 'Line Chart' AND path = '/line-chart';

-- Bar Chart -> assets 페이지로  
UPDATE menus 
SET path = '/assets' 
WHERE name = 'Bar Chart' AND path = '/bar-chart';

-- OHLCV Chart -> assets 페이지로
UPDATE menus 
SET path = '/assets' 
WHERE name = 'OHLCV Chart' AND path = '/ohlcv-chart';

-- Halving Chart -> onchain/halving 페이지로
UPDATE menus 
SET path = '/onchain/halving' 
WHERE name = 'Halving Chart' AND path = '/halving-chart';

-- On-Chain Chart -> onchain 페이지로
UPDATE menus 
SET path = '/onchain' 
WHERE name = 'On-Chain Chart' AND path = '/onchain-chart';

-- Mini Chart -> assets 페이지로
UPDATE menus 
SET path = '/assets' 
WHERE name = 'Mini Chart' AND path = '/minichart';

-- TreeMap Chart -> assets 페이지로
UPDATE menus 
SET path = '/assets' 
WHERE name = 'TreeMap Chart' AND path = '/treemap-chart';

-- 3. Tables 관련 경로들을 기존 페이지로 리다이렉트
-- Basic Tables -> assets 페이지로
UPDATE menus 
SET path = '/assets' 
WHERE name = 'Basic Tables' AND path = '/basic-tables';

-- Assets List -> assets 페이지로
UPDATE menus 
SET path = '/assets' 
WHERE name = 'Assets List' AND path = '/assets-list';

-- History Table -> assets 페이지로
UPDATE menus 
SET path = '/assets' 
WHERE name = 'History Table' AND path = '/history-table';

-- 4. Widgets -> assets 페이지로
UPDATE menus 
SET path = '/assets' 
WHERE name = 'Widgets' AND path = '/widgets';

-- 5. Performance Map -> assets 페이지로
UPDATE menus 
SET path = '/assets' 
WHERE name = 'Performance Map' AND path = '/overviews/treemap';

-- 6. World Assets TreeMap -> assets 페이지로
UPDATE menus 
SET path = '/assets' 
WHERE name = 'World Assets TreeMap' AND path = '/world-assets-treemap';

-- 7. Test2 -> test 페이지로
UPDATE menus 
SET path = '/test' 
WHERE name = 'Test2' AND path = '/test/test02';

-- 8. OnChain 메트릭 경로들을 올바른 형식으로 수정
-- MVRV Z-Score
UPDATE menus 
SET path = '/onchain/mvrv_z_score' 
WHERE name = 'MVRV Z-Score' AND path = '/onchain/overviews?metric=mvrv_z_score';

-- NUPL
UPDATE menus 
SET path = '/onchain/nupl' 
WHERE name = 'NUPL' AND path = '/onchain/overviews?metric=nupl';

-- Realized Cap
UPDATE menus 
SET path = '/onchain/realized_cap' 
WHERE name = 'Realized Cap' AND path = '/onchain/overviews?metric=realized_cap';

-- Thermo Cap
UPDATE menus 
SET path = '/onchain/thermo_cap' 
WHERE name = 'Thermo Cap' AND path = '/onchain/overviews?metric=thermo_cap';

-- Realized Price
UPDATE menus 
SET path = '/onchain/realized_price' 
WHERE name = 'Realized Price' AND path = '/onchain/overviews?metric=realized_price';

-- True Market Mean
UPDATE menus 
SET path = '/onchain/true_market_mean' 
WHERE name = 'True Market Mean' AND path = '/onchain/overviews?metric=true_market_mean';

-- AVIV
UPDATE menus 
SET path = '/onchain/aviv' 
WHERE name = 'AVIV' AND path = '/onchain/overviews?metric=aviv';

-- SOPR
UPDATE menus 
SET path = '/onchain/sopr' 
WHERE name = 'SOPR' AND path = '/onchain/overviews?metric=sopr';

-- CDD 90DMA
UPDATE menus 
SET path = '/onchain/cdd_90dma' 
WHERE name = 'CDD 90DMA' AND path = '/onchain/overviews?metric=cdd_90dma';

-- HODL Waves Supply
UPDATE menus 
SET path = '/onchain/hodl_waves_supply' 
WHERE name = 'HODL Waves Supply' AND path = '/onchain/overviews?metric=hodl_waves_supply';

-- NRPL BTC
UPDATE menus 
SET path = '/onchain/nrpl_btc' 
WHERE name = 'NRPL BTC' AND path = '/onchain/overviews?metric=nrpl_btc';

-- Hash Rate
UPDATE menus 
SET path = '/onchain/hashrate' 
WHERE name = 'Hash Rate' AND path = '/onchain/overviews?metric=hashrate';

-- Difficulty
UPDATE menus 
SET path = '/onchain/difficulty' 
WHERE name = 'Difficulty' AND path = '/onchain/overviews?metric=difficulty';

-- Miner Reserves
UPDATE menus 
SET path = '/onchain/miner_reserves' 
WHERE name = 'Miner Reserves' AND path = '/onchain/overviews?metric=miner_reserves';

-- Open Interest Futures
UPDATE menus 
SET path = '/onchain/open_interest_futures' 
WHERE name = 'Open Interest Futures' AND path = '/onchain/overviews?metric=open_interest_futures';

-- ETF BTC Total
UPDATE menus 
SET path = '/onchain/etf_btc_total' 
WHERE name = 'ETF BTC Total' AND path = '/onchain/overviews?metric=etf_btc_total';

-- 9. Halving 관련 경로들을 올바른 형식으로 수정
-- Halving Bull Chart
UPDATE menus 
SET path = '/onchain/halving/halving-bull-chart' 
WHERE name = 'Halving Bull Chart' AND path = '/onchain/halving/halving-bull-chart';

-- Halving Spiral -> halving 페이지로
UPDATE menus 
SET path = '/onchain/halving' 
WHERE name = 'Halving Spiral' AND path = '/onchain/halving/halving-spiral';

-- Halving Progress -> halving 페이지로
UPDATE menus 
SET path = '/onchain/halving' 
WHERE name = 'Halving Progress' AND path = '/onchain/halving/halving-progress';

-- Halving Seasons -> halving 페이지로
UPDATE menus 
SET path = '/onchain/halving' 
WHERE name = 'Halving Seasons' AND path = '/onchain/halving/halving-seasons';

-- 10. Assets 타입별 경로들을 올바른 형식으로 수정
-- Stocks
UPDATE menus 
SET path = '/assets?type_name=Stocks' 
WHERE name = 'Stocks' AND path = '/assets?type_name=Stocks';

-- Commodities
UPDATE menus 
SET path = '/assets?type_name=Commodities' 
WHERE name = 'Commodities' AND path = '/assets?type_name=Commodities';

-- ETFs
UPDATE menus 
SET path = '/assets?type_name=ETFs' 
WHERE name = 'ETFs' AND path = '/assets?type_name=ETFs';

-- Funds
UPDATE menus 
SET path = '/assets?type_name=Funds' 
WHERE name = 'Funds' AND path = '/assets?type_name=Funds';

-- Crypto
UPDATE menus 
SET path = '/assets?type_name=Crypto' 
WHERE name = 'Crypto' AND path = '/assets?type_name=Crypto';

-- All Assets
UPDATE menus 
SET path = '/assets' 
WHERE name = 'All Assets' AND path = '/assets';

-- 11. 기타 페이지들은 그대로 유지 (이미 올바른 경로)
-- Test01 - WebSocket 실시간 데이터: /test
-- Admin Login: /signin  
-- Admin Manage: /admin
-- Alerts: /alerts
-- Avatar: /avatars
-- Badge: /badge
-- Buttons: /buttons
-- Images: /images
-- Videos: /videos
-- Calendar: /calendar
-- User Profile: /profile
-- Form Elements: /form-elements
-- Blank Page: /blank
-- 404 Error: /error-404

-- 수정 결과 확인
SELECT id, name, path FROM menus WHERE path IS NOT NULL ORDER BY id;
