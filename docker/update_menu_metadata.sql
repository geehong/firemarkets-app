-- 기존 menus 테이블에 metadata 컬럼 추가 및 설명 업데이트 스크립트
-- FireMarkets 프로젝트용

-- 1. metadata 컬럼 추가 (이미 존재하는 경우 무시)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'menus' AND column_name = 'metadata') THEN
        ALTER TABLE menus ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- 2. 기존 메뉴들에 설명 추가 (영문, 한글)
UPDATE menus SET metadata = '{"description": {"en": "Main dashboard with key metrics and charts", "ko": "주요 지표와 차트가 포함된 메인 대시보드"}, "permissions": ["user", "admin"], "badge": "NEW"}' WHERE name = 'Dashboard';

UPDATE menus SET metadata = '{"description": {"en": "Asset analysis and management tools", "ko": "자산 분석 및 관리 도구"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Assets';

UPDATE menus SET metadata = '{"description": {"en": "On-chain data analysis and metrics", "ko": "온체인 데이터 분석 및 메트릭"}, "permissions": ["user", "admin"], "badge": "NEW"}' WHERE name = 'OnChain';

UPDATE menus SET metadata = '{"description": {"en": "Interactive maps and visualizations", "ko": "인터랙티브 지도 및 시각화"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Map';

-- 3. Assets 하위 메뉴들 설명 추가
UPDATE menus SET metadata = '{"description": {"en": "Stock market indices analysis", "ko": "주식 시장 지수 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Indices';

UPDATE menus SET metadata = '{"description": {"en": "Individual stock analysis", "ko": "개별 주식 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Stocks';

UPDATE menus SET metadata = '{"description": {"en": "Commodities market analysis", "ko": "상품 시장 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Commodities';

UPDATE menus SET metadata = '{"description": {"en": "Foreign exchange analysis", "ko": "외환 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Currencies';

UPDATE menus SET metadata = '{"description": {"en": "Exchange-traded funds analysis", "ko": "상장지수펀드 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'ETFs';

UPDATE menus SET metadata = '{"description": {"en": "Bond market analysis", "ko": "채권 시장 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Bonds';

UPDATE menus SET metadata = '{"description": {"en": "Investment funds analysis", "ko": "투자 펀드 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Funds';

UPDATE menus SET metadata = '{"description": {"en": "Cryptocurrency analysis", "ko": "암호화폐 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Crypto';

-- 4. OnChain 하위 메뉴들 설명 추가
UPDATE menus SET metadata = '{"description": {"en": "Derivatives market analysis", "ko": "파생상품 시장 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Derivatives';

UPDATE menus SET metadata = '{"description": {"en": "Futures open interest analysis", "ko": "선물 미결제약정 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Open Interest (Futures)';

UPDATE menus SET metadata = '{"description": {"en": "Institutional investment analysis", "ko": "기관 투자 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Institutional';

UPDATE menus SET metadata = '{"description": {"en": "ETF Bitcoin flow analysis", "ko": "ETF 비트코인 흐름 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'ETF BTC Flow';

UPDATE menus SET metadata = '{"description": {"en": "ETF Bitcoin total holdings", "ko": "ETF 비트코인 총 보유량"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'ETF BTC Total';

UPDATE menus SET metadata = '{"description": {"en": "Market sentiment analysis", "ko": "시장 심리 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Market';

-- 5. Market 하위 메뉴들 설명 추가
UPDATE menus SET metadata = '{"description": {"en": "Active Value to Investor Value ratio", "ko": "활성 가치 대 투자자 가치 비율"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'AVIV Ratio (Active Value to Investor Value)';

UPDATE menus SET metadata = '{"description": {"en": "Coin Days Destroyed 90-day moving average", "ko": "코인 일수 소멸 90일 이동평균"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'CDD (90-Day Moving Average)';

UPDATE menus SET metadata = '{"description": {"en": "HODL waves supply analysis", "ko": "HODL 웨이브 공급량 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'HODL Waves';

UPDATE menus SET metadata = '{"description": {"en": "Market Value to Realized Value Z-Score", "ko": "시장 가치 대 실현 가치 Z-점수"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'MVRV Z-Score (Market Value to Realized Value Z-Score)';

UPDATE menus SET metadata = '{"description": {"en": "Net Realized Profit/Loss analysis", "ko": "순 실현 손익 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'NRPL (Net Realized Profit/Loss)';

UPDATE menus SET metadata = '{"description": {"en": "Net Unrealized Profit/Loss analysis", "ko": "순 미실현 손익 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'NUPL (Net Unrealized Profit/Loss)';

UPDATE menus SET metadata = '{"description": {"en": "Realized capitalization analysis", "ko": "실현 시가총액 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Realized Cap';

UPDATE menus SET metadata = '{"description": {"en": "Spent Output Profit Ratio analysis", "ko": "지출 출력 수익률 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'SOPR (Spent Output Profit Ratio)';

-- 6. Mining 하위 메뉴들 설명 추가
UPDATE menus SET metadata = '{"description": {"en": "Bitcoin mining difficulty analysis", "ko": "비트코인 채굴 난이도 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Difficulty';

UPDATE menus SET metadata = '{"description": {"en": "Bitcoin network hash rate analysis", "ko": "비트코인 네트워크 해시레이트 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Hash Rate';

UPDATE menus SET metadata = '{"description": {"en": "Miner reserves analysis", "ko": "채굴자 보유량 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Miner Reserves';

UPDATE menus SET metadata = '{"description": {"en": "Thermal capitalization analysis", "ko": "열적 시가총액 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Thermo Cap';

-- 7. Price 하위 메뉴들 설명 추가
UPDATE menus SET metadata = '{"description": {"en": "Price analysis and metrics", "ko": "가격 분석 및 메트릭"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Price';

UPDATE menus SET metadata = '{"description": {"en": "Realized price analysis", "ko": "실현 가격 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Realized Price';

UPDATE menus SET metadata = '{"description": {"en": "True market mean analysis", "ko": "진정한 시장 평균 분석"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'True Market Mean';

-- 8. Map 하위 메뉴들 설명 추가
UPDATE menus SET metadata = '{"description": {"en": "Performance visualization map", "ko": "성과 시각화 지도"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'Performance Map';

UPDATE menus SET metadata = '{"description": {"en": "Global assets treemap visualization", "ko": "전 세계 자산 트리맵 시각화"}, "permissions": ["user", "admin"], "badge": null}' WHERE name = 'World Assets TreeMap';

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'Menu metadata 업데이트 완료: 모든 메뉴에 영문/한글 설명이 추가되었습니다.';
END $$;
