# API 클라이언트별 제한사항 및 요금제

## 📊 REST API 제한사항

| **클라이언트** | **무료 플랜** | **유료 플랜** | **분당** | **시간당** | **일일** | **월간** | **대역폭** |
|----------------|---------------|---------------|----------|------------|----------|----------|------------|
| **FMP** | 250 calls/day | $14.99/month | 5 calls | 250 calls | 250 calls | 7,500 calls | - |
| **Tiingo** | 1,000 calls/day | $10/month | 10,000 calls | 10,000 calls | 100,000 calls | 40GB | 40GB/월 |
| **Alpha Vantage** | 500 calls/day | $49.99/month | 5 calls | 500 calls | 500 calls | 15,000 calls | - |
| **Polygon** | 5 calls/min | $99/month | 5 calls | 300 calls | 7,200 calls | 216,000 calls | - |
| **TwelveData** | 800 calls/day | $29.99/month | 8 calls | 800 calls | 800 calls | 24,000 calls | - |
| **Binance** | 무제한 | 무제한 | 1,200 calls | 72,000 calls | 1,728,000 calls | 51,840,000 calls | - |
| **Coinbase** | 무제한 | 무제한 | 10,000 calls | 10,000 calls | 240,000 calls | 7,200,000 calls | - |
| **CoinMarketCap** | 10,000 calls/month | $29/month | 333 calls | 20,000 calls | 480,000 calls | 10,000 calls | - |
| **CoinGecko** | 10-30 calls/min | $129/month | 10-30 calls | 600-1,800 calls | 14,400-43,200 calls | 432,000-1,296,000 calls | - |
| **Finnhub** | 60 calls/min | $9/month | 60 calls | 3,600 calls | 86,400 calls | 2,592,000 calls | - |

## 🔌 WebSocket 제한사항

| **클라이언트** | **동시 연결** | **구독 티커 수** | **메시지/초** | **연결 지속시간** | **재연결** |
|----------------|---------------|------------------|---------------|-------------------|-------------|
| **Alpaca** | 1개 | 100개 | 100개 | 24시간 | 자동 |
| **Finnhub** | 50개 (무료) | 무제한 | 30개 | 24시간 | 자동 |
| **Binance** | 5개 | 1,024개/연결 | 5개 | 24시간 | 자동 |
| **Tiingo** | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 |
| **Polygon** | 1개 (유료) | 무제한 | 100개 | 24시간 | 자동 |
| **FMP** | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 |
| **Alpha Vantage** | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 |
| **TwelveData** | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 |
| **Coinbase** | 1개 | 100개 | 100개 | 24시간 | 자동 |
| **CoinMarketCap** | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 |
| **CoinGecko** | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 | ❌ 미지원 |

## 🎯 지원 자산 타입

| **클라이언트** | **주식** | **ETF** | **암호화폐** | **외환** | **커머디티** | **지수** | **옵션** |
|----------------|----------|---------|--------------|----------|--------------|----------|----------|
| **FMP** | ✅ 미국 | ✅ 미국 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Tiingo** | ✅ 미국/중국 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Alpha Vantage** | ✅ 글로벌 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Polygon** | ✅ 미국 | ✅ 미국 | ❌ | ✅ | ❌ | ✅ | ✅ |
| **TwelveData** | ✅ 글로벌 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Binance** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Coinbase** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CoinMarketCap** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CoinGecko** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Finnhub** | ✅ 글로벌 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |

## 💰 비용 비교 (월간)

| **클라이언트** | **무료 플랜** | **기본 유료** | **프로 플랜** | **엔터프라이즈** |
|----------------|---------------|---------------|---------------|------------------|
| **FMP** | 250 calls/day | $14.99/month | $29.99/month | $99.99/month |
| **Tiingo** | 1,000 calls/day | $10/month | $20/month | $50/month |
| **Alpha Vantage** | 500 calls/day | $49.99/month | $99.99/month | $199.99/month |
| **Polygon** | 5 calls/min | $99/month | $199/month | $499/month |
| **TwelveData** | 800 calls/day | $29.99/month | $59.99/month | $199.99/month |
| **Binance** | 무제한 | 무료 | 무료 | 무료 |
| **Coinbase** | 무제한 | 무료 | 무료 | 무료 |
| **CoinMarketCap** | 10,000 calls/month | $29/month | $79/month | $199/month |
| **CoinGecko** | 10-30 calls/min | $129/month | $399/month | $999/month |
| **Finnhub** | 60 calls/min | $9/month | $19/month | $39/month |

## 🚨 현재 시스템 상태

### ✅ 활성화된 클라이언트
- **Alpaca**: 미국 주식 실시간 데이터 (WebSocket)
- **Finnhub**: 주식 + 암호화폐 실시간 데이터 (WebSocket)
- **Binance**: 암호화폐 실시간 데이터 (WebSocket)
- **FMP**: 주식/ETF/커머디티 OHLCV 데이터 (REST)
- **Polygon**: 주식/ETF OHLCV 데이터 (REST)
- **TwelveData**: 글로벌 주식/암호화폐 OHLCV 데이터 (REST)

### ❌ 비활성화된 클라이언트
- **Tiingo**: 대역폭 한도 초과로 일시 중단
- **Alpha Vantage**: asyncio 오류로 임시 비활성화

## 📈 권장사항

### 실시간 데이터 수집
1. **주식**: Alpaca + Finnhub (이중화)
2. **암호화폐**: Binance + Finnhub (이중화)

### 히스토리컬 데이터 수집
1. **주식/ETF**: FMP (1순위) → Polygon (2순위) → TwelveData (3순위)
2. **암호화폐**: Binance (1순위) → Coinbase (2순위)
3. **커머디티**: FMP (유일)

### 비용 최적화
- **무료 플랜 우선 사용**: Binance, Coinbase, Finnhub
- **필요시 유료 업그레이드**: FMP ($14.99), Tiingo ($10), Polygon ($99)

## ⚠️ 주의사항

1. **Rate Limit 준수**: 각 API의 제한사항을 준수하여 IP 차단 방지
2. **대역폭 모니터링**: Tiingo는 월 40GB 대역폭 제한 있음
3. **WebSocket 연결 관리**: 24시간마다 재연결 필요
4. **백업 API 준비**: 주요 API 장애 시 대체 API 사용

---
*최종 업데이트: 2025-09-09*
*정보 출처: 각 API 공식 문서 및 웹 검색 결과*
