-- menus 테이블의 metadata에 onchain_metrics_info 설명 추가 스크립트
-- FireMarkets 프로젝트용

-- 1. AVIV Ratio 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Active Value to Investor Value ratio - compares short-term traders vs long-term holders", "ko": "활성 가치 대 투자자 가치 비율 - 단기 거래자와 장기 보유자 비교"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'AVIV Ratio (Active Value to Investor Value)';

-- 2. CDD (90-Day Moving Average) 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "90-day moving average of Coin Days Destroyed - tracks long-term holder behavior", "ko": "코인 일수 소멸 90일 이동평균 - 장기 보유자 행동 추적"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'CDD (90-Day Moving Average)';

-- 3. Difficulty 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Mining difficulty - measures how hard it is to find new blocks", "ko": "채굴 난이도 - 새로운 블록을 찾는 어려움 측정"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'Difficulty';

-- 4. ETF BTC Flow 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Daily net Bitcoin flow in/out of spot ETFs - shows institutional buying/selling pressure", "ko": "스팟 ETF 일일 순 비트코인 흐름 - 기관 매수/매도 압력 표시"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'ETF BTC Flow';

-- 5. ETF BTC Total 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Total Bitcoin held by all spot ETFs worldwide - institutional demand indicator", "ko": "전 세계 스팟 ETF 총 비트코인 보유량 - 기관 수요 지표"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'ETF BTC Total';

-- 6. Hash Rate 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Total computational power securing Bitcoin network - key security indicator", "ko": "비트코인 네트워크 보안 총 연산력 - 핵심 보안 지표"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'Hash Rate';

-- 7. HODL Waves 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Bitcoin age distribution visualization - shows long-term vs short-term holder ratio", "ko": "비트코인 연령 분포 시각화 - 장기 vs 단기 보유자 비율 표시"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'HODL Waves';

-- 8. Miner Reserves 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Total Bitcoin held by known miner wallets - potential selling pressure gauge", "ko": "알려진 채굴자 지갑 총 비트코인 보유량 - 잠재적 매도 압력 측정"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'Miner Reserves';

-- 9. MVRV Z-Score 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Market Value to Realized Value Z-Score - identifies market tops and bottoms", "ko": "시장 가치 대 실현 가치 Z-점수 - 시장 고점과 저점 식별"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'MVRV Z-Score (Market Value to Realized Value Z-Score)';

-- 10. NRPL (Net Realized Profit/Loss) 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Net value of all on-chain transactions - shows actual profit/loss scale", "ko": "모든 온체인 거래의 순 가치 - 실제 손익 규모 표시"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'NRPL (Net Realized Profit/Loss)';

-- 11. NUPL (Net Unrealized Profit/Loss) 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Total unrealized profit/loss of unsold coins - measures market greed and fear", "ko": "미판매 코인의 총 미실현 손익 - 시장 탐욕과 공포 측정"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'NUPL (Net Unrealized Profit/Loss)';

-- 12. Open Interest (Futures) 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Total outstanding futures contracts - gauges leverage and volatility potential", "ko": "총 미결제 선물 계약 - 레버리지와 변동성 잠재력 측정"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'Open Interest (Futures)';

-- 13. Realized Cap 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Value of all bitcoins at last moved price - actual capital inflow indicator", "ko": "마지막 이동 가격의 모든 비트코인 가치 - 실제 자본 유입 지표"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'Realized Cap';

-- 14. Realized Price 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Average price when coins were last moved - long-term investor cost basis", "ko": "코인이 마지막으로 이동된 평균 가격 - 장기 투자자 비용 기준"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'Realized Price';

-- 15. SOPR (Spent Output Profit Ratio) 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Whether sold coins were profitable or at loss - gauges profit-taking sentiment", "ko": "판매된 코인이 수익 또는 손실인지 - 수익 실현 심리 측정"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'SOPR (Spent Output Profit Ratio)';

-- 16. Thermo Cap 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Cumulative security spend by miners - network economic foundation", "ko": "채굴자의 누적 보안 지출 - 네트워크 경제적 기반"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'Thermo Cap';

-- 17. True Market Mean 메뉴 업데이트
UPDATE menus SET metadata = '{"description": {"en": "Average price from various Bitcoin valuation models - intrinsic value estimate", "ko": "다양한 비트코인 가치 평가 모델의 평균 가격 - 내재 가치 추정"}, "permissions": ["user", "admin"], "badge": null}' 
WHERE name = 'True Market Mean';

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'Menus metadata 업데이트 완료: 모든 OnChain 메뉴에 영문/한글 설명이 추가되었습니다.';
END $$;
