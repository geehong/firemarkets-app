-- 온체인 메트릭 정보 테이블 생성
CREATE TABLE IF NOT EXISTS `onchain_metrics_info` (
  `metric_id` varchar(50) NOT NULL COMMENT '메트릭 ID (예: mvrv-zscore)',
  `name` varchar(100) NOT NULL COMMENT '메트릭 이름 (예: MVRV Z-Score)',
  `description` text COMMENT '메트릭 설명',
  `category` varchar(50) NOT NULL COMMENT '카테고리 (market_metrics, price_metrics, mining_metrics, institutional_metrics, derivatives_metrics)',
  
  -- 차트 표출 정보 (JSON 형태로 저장)
  `interpretations` json DEFAULT NULL COMMENT '해석 정보 JSON',
  `chart_title` varchar(200) DEFAULT NULL COMMENT '차트 제목',
  `loading_text` varchar(100) DEFAULT NULL COMMENT '로딩 텍스트',
  
  -- 상태 및 데이터 정보
  `status` varchar(20) NOT NULL DEFAULT 'active' COMMENT '상태 (active, inactive)',
  `data_count` int DEFAULT 0 COMMENT '데이터 개수',
  `current_range` varchar(100) DEFAULT NULL COMMENT '현재 데이터 범위 (예: 2009/01/03 - 2025/07/01)',
  `last_update` datetime DEFAULT NULL COMMENT '마지막 업데이트 시간',
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1 COMMENT '활성화 여부',
  
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`metric_id`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`),
  KEY `idx_is_enabled` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='온체인 메트릭 정보 테이블';

-- 초기 데이터 삽입
INSERT INTO `onchain_metrics_info` (
  `metric_id`, `name`, `description`, `category`, 
  `interpretations`, `chart_title`, `loading_text`,
  `status`, `data_count`, `current_range`, `last_update`, `is_enabled`
) VALUES
('mvrv-zscore', 'MVRV Z-Score', 'Bitcoin market value to realized value ratio', 'market_metrics',
 '{"strong": "Above 7: Extremely overvalued (potential sell signal)", "moderate": "3-7: Overvalued territory", "weak": "0-3: Neutral to slightly overvalued", "neutral": "-1-0: Neutral to slightly undervalued", "low": "Below -1: Undervalued territory (potential buy signal)"}',
 'Bitcoin Price vs MVRV Z-Score Correlation', 'Loading MVRV Z-Score data...',
 'active', 6024, '2009/01/03 - 2025/07/01', '2025-07-01 00:00:00', 1),

('sopr', 'SOPR', 'Spent Output Profit Ratio - measures realized profit/loss', 'market_metrics',
 '{"strong": "Above 1.05: Strong profit taking", "moderate": "1.02-1.05: Moderate profit taking", "weak": "1.0-1.02: Slight profit taking", "neutral": "0.98-1.0: Neutral", "low": "Below 0.98: Loss taking"}',
 'Bitcoin Price vs SOPR Correlation', 'Loading SOPR data...',
 'active', 0, NULL, NULL, 1),

('nupl', 'NUPL', 'Net Unrealized Profit/Loss - measures unrealized profit/loss', 'market_metrics',
 '{"strong": "Above 0.75: Extreme greed (potential sell signal)", "moderate": "0.5-0.75: Greed", "weak": "0.25-0.5: Neutral to greed", "neutral": "0-0.25: Neutral", "low": "Below 0: Fear (potential buy signal)"}',
 'Bitcoin Price vs NUPL Correlation', 'Loading NUPL data...',
 'active', 0, NULL, NULL, 1),

('realized-price', 'Realized Price', 'Average price at which coins last moved', 'price_metrics',
 '{"strong": "Price > Realized: Strong buying pressure", "moderate": "Price ≈ Realized: Balanced market", "weak": "Price < Realized: Selling pressure", "neutral": "Similar levels: Neutral market", "low": "Large gap: Market stress"}',
 'Bitcoin Price vs Realized Price Correlation', 'Loading Realized Price data...',
 'active', 0, NULL, NULL, 1),

('hashrate', 'Hash Rate', 'Total computational power securing the Bitcoin network', 'mining_metrics',
 '{"strong": "High correlation: Network security drives price", "moderate": "Moderate correlation: Some relationship", "weak": "Low correlation: Independent movements", "neutral": "No correlation: Separate factors", "low": "Negative correlation: Inverse relationship"}',
 'Bitcoin Price vs Hash Rate Correlation', 'Loading Hash Rate data...',
 'active', 0, NULL, NULL, 1),

('difficulty-BTC', 'Difficulty', 'Mining difficulty - how hard it is to find a block', 'mining_metrics',
 '{"strong": "High correlation: Mining economics drive price", "moderate": "Moderate correlation: Some relationship", "weak": "Low correlation: Independent movements", "neutral": "No correlation: Separate factors", "low": "Negative correlation: Inverse relationship"}',
 'Bitcoin Price vs Difficulty Correlation', 'Loading Difficulty data...',
 'active', 0, NULL, NULL, 1),

('miner-reserves', 'Miner Reserves', 'Bitcoin holdings of mining entities', 'mining_metrics',
 '{"strong": "High correlation: Miner behavior affects price", "moderate": "Moderate correlation: Some influence", "weak": "Low correlation: Limited impact", "neutral": "No correlation: Independent", "low": "Negative correlation: Inverse relationship"}',
 'Bitcoin Price vs Miner Reserves Correlation', 'Loading Miner Reserves data...',
 'active', 0, NULL, NULL, 1),

('etf-btc-total', 'ETF BTC Total', 'Total Bitcoin holdings in ETF products', 'institutional_metrics',
 '{"strong": "High correlation: Institutional demand drives price", "moderate": "Moderate correlation: Some influence", "weak": "Low correlation: Limited impact", "neutral": "No correlation: Independent", "low": "Negative correlation: Inverse relationship"}',
 'Bitcoin Price vs ETF BTC Total Correlation', 'Loading ETF BTC Total data...',
 'active', 0, NULL, NULL, 1),

('etf-btc-flow', 'ETF BTC Flow', 'Daily net flow of Bitcoin in/out of ETFs', 'institutional_metrics',
 '{"strong": "High correlation: ETF flows drive price", "moderate": "Moderate correlation: Some influence", "weak": "Low correlation: Limited impact", "neutral": "No correlation: Independent", "low": "Negative correlation: Inverse relationship"}',
 'Bitcoin Price vs ETF BTC Flow Correlation', 'Loading ETF BTC Flow data...',
 'active', 0, NULL, NULL, 1),

('open-interest-futures', 'Open Interest Futures', 'Total open interest in Bitcoin futures contracts', 'derivatives_metrics',
 '{"strong": "High correlation: Derivatives activity drives price", "moderate": "Moderate correlation: Some influence", "weak": "Low correlation: Limited impact", "neutral": "No correlation: Independent", "low": "Negative correlation: Inverse relationship"}',
 'Bitcoin Price vs Open Interest Futures Correlation', 'Loading Open Interest Futures data...',
 'active', 0, NULL, NULL, 1),

('cap-real-usd', 'Realized Cap', 'Realized capitalization - sum of all coins at their last moved price', 'market_metrics',
 '{"strong": "High correlation: Market value drives realized cap", "moderate": "Moderate correlation: Some relationship", "weak": "Low correlation: Independent movements", "neutral": "No correlation: Separate factors", "low": "Negative correlation: Inverse relationship"}',
 'Bitcoin Price vs Realized Cap Correlation', 'Loading Realized Cap data...',
 'active', 0, NULL, NULL, 1),

('cdd-90dma', 'CDD 90DMA', 'Coins Days Destroyed 90-day moving average', 'market_metrics',
 '{"strong": "High correlation: Long-term holder behavior affects price", "moderate": "Moderate correlation: Some influence", "weak": "Low correlation: Limited impact", "neutral": "No correlation: Independent", "low": "Negative correlation: Inverse relationship"}',
 'Bitcoin Price vs CDD 90DMA Correlation', 'Loading CDD 90DMA data...',
 'active', 0, NULL, NULL, 1),

('true-market-mean', 'True Market Mean', 'Bitcoin True Market Mean Price', 'price_metrics',
 '{"strong": "High correlation: True market value drives price", "moderate": "Moderate correlation: Some relationship", "weak": "Low correlation: Independent movements", "neutral": "No correlation: Separate factors", "low": "Negative correlation: Inverse relationship"}',
 'Bitcoin Price vs True Market Mean Correlation', 'Loading True Market Mean data...',
 'active', 0, NULL, NULL, 1),

('nrpl-btc', 'NRPL BTC', 'Bitcoin NRPL (Net Realized Profit Loss)', 'market_metrics',
 '{"strong": "High correlation: Profit/loss realization affects price", "moderate": "Moderate correlation: Some influence", "weak": "Low correlation: Limited impact", "neutral": "No correlation: Independent", "low": "Negative correlation: Inverse relationship"}',
 'Bitcoin Price vs NRPL BTC Correlation', 'Loading NRPL BTC data...',
 'active', 0, NULL, NULL, 1),

('aviv', 'AVIV', 'Active Value to Investor Value', 'market_metrics',
 '{"strong": "High correlation: Active vs investor value drives price", "moderate": "Moderate correlation: Some relationship", "weak": "Low correlation: Independent movements", "neutral": "No correlation: Separate factors", "low": "Negative correlation: Inverse relationship"}',
 'Bitcoin Price vs AVIV Correlation', 'Loading AVIV data...',
 'active', 0, NULL, NULL, 1),

('thermo-cap', 'Thermo Cap', 'Thermo Cap - cumulative revenue earned by Bitcoin miners', 'mining_metrics',
 '{"strong": "High correlation: Mining revenue affects price", "moderate": "Moderate correlation: Some influence", "weak": "Low correlation: Limited impact", "neutral": "No correlation: Independent", "low": "Negative correlation: Inverse relationship"}',
 'Bitcoin Price vs Thermo Cap Correlation', 'Loading Thermo Cap data...',
 'active', 0, NULL, NULL, 1),

('hodl-waves-supply', 'HODL Waves Supply', 'HODL waves supply - age distribution of coins', 'market_metrics',
 '{"strong": "High correlation: Coin age distribution affects price", "moderate": "Moderate correlation: Some influence", "weak": "Low correlation: Limited impact", "neutral": "No correlation: Independent", "low": "Negative correlation: Inverse relationship"}',
 'Bitcoin Price vs HODL Waves Supply Correlation', 'Loading HODL Waves Supply data...',
 'active', 0, NULL, NULL, 1); 