# 실시간 OHLCV 데이터 이상치 정리 스크립트 (`cleanup_strange_ohlcv.py`)

이 스크립트는 `realtime_quotes_time_bar` 테이블에서 데이터 소스 혼선이나 통신 오류로 인해 발생하는 비정상적인 가격 급등락(스파이크) 및 논리적 오류를 정리하기 위한 도구입니다.

## 📋 주요 기능

스크립트는 총 4단계의 검증 및 보정 로직을 수행합니다:

1.  **논리적 오류 수정 (Logical Consistency)**:
    *   고가(High)가 시가/종가보다 낮거나, 저가(Low)가 시가/종가보다 높은 행을 찾아 정상 범위로 조정합니다.
2.  **꼬리 스파이크 억제 (Tail Spike Suppression)**:
    *   시가(Open) 대비 임계값(Threshold) 이상으로 길게 형성된 윗꼬리/아랫꼬리를 몸통 범위(시가~종가)로 억제합니다.
3.  **고립된 바 제거 (Isolated Outlier Removal)**:
    *   특정 봉 하나만 앞뒤 봉과 비교해 가격이 튀어 있는 경우(단발성 노이즈), 이를 가짜 데이터로 간주하고 앞 봉의 종가로 대체합니다.
4.  **빗 패턴 제거 (Teeth/Square Wave Pattern Removal)**:
    *   가격대가 다른 두 데이터 소스가 뒤섞여 발생하는 사각형 파동(몸통 자체가 들쭉날쭉한 위아래 튐)을 감지하여 다음 봉의 시가와 동기화시킵니다.

## 🚀 실행 방법

백엔드 컨테이너 내에서 실행하는 것을 권장합니다.

```bash
# 기본 사용법: python scripts/cleanup_strange_ohlcv.py [자산ID] [임계값]

# 예시 1: 비트코인(ID: 1) 데이터에서 1% 이상 튀는 값들을 세밀하게 정리
docker exec -it fire_markets_backend python scripts/cleanup_strange_ohlcv.py 1 0.01

# 예시 2: 이더리움(ID: 2) 데이터에서 3%(기본값) 이상 튀는 값들을 정리
docker exec -it fire_markets_backend python scripts/cleanup_strange_ohlcv.py 2

# 예시 3: 모든 자산에 대해 5% 이상 튀는 극단적인 값들만 정리
docker exec -it fire_markets_backend python scripts/cleanup_strange_ohlcv.py None 0.05
```

## ⚙️ 파라미터 설명

| 파라미터 | 설명 | 기본값 | 비고 |
| :--- | :--- | :--- | :--- |
| `asset_id` | 정리할 자산의 ID | `None` | `None` 입력 시 모든 자산 대상 |
| `threshold` | 이상치 감지 기준 (비율) | `0.03` (3%) | 예: 0.01은 1%, 0.05는 5%를 의미 |

## ⚠️ 주의사항

*   **임계값(Threshold) 설정**: 임계값을 너무 낮게 설정(예: 0.001)하면 정상적인 시장의 변동성까지 삭제될 위험이 있습니다. 비트코인 등 우량 자산의 경우 `0.01`~`0.03` 범위를 추천합니다.
*   **영구 반영**: 이 스크립트는 DB 값을 직접 `UPDATE` 합니다. 실행 전 대상 데이터를 확인하고 싶다면 SQL로 먼저 조회해 보는 것이 안전합니다.
