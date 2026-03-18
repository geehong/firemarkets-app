# 실시간 OHLCV 데이터 이상치 정리 스크립트 (`cleanup_strange_ohlcv.py`)

이 스크립트는 `realtime_quotes_time_bar` 테이블에서 데이터 소스 혼선이나 통신 오류로 인해 발생하는 비정상적인 가격 급등락(스파이크) 및 박스형 노이즈를 정리하기 위한 도구입니다.

## 📋 주요 기능

스크립트는 총 5단계의 검증 및 보정 로직을 수행합니다:

1.  **논리적 오류 수정**: 고가가 시가/종가보다 낮거나, 저가가 시가/종가보다 높은 행 조정.
2.  **꼬리 스파이크 억제**: 시가 대비 임계값 이상인 윗꼬리/아랫꼬리 억제.
3.  **고립된 바 제거**: 앞뒤 봉과 비교해 혼자만 튀어 있는 단발성 노이즈 제거.
4.  **빗 패턴 제거 (Teeth Pattern)**: 가격대가 다른 두 데이터 소스가 뒤섞여 발생하는 진동 노이즈 제거.
5.  **박스형 점프 제거 (Shifted Candle)**: 봉 전체가 통째로 튀어 있는 계단식 노이즈 제거.

## 🚀 실행 방법

백엔드 컨테이너 내에서 실행하는 것을 권장합니다.

```bash
# 🌟 [5분봉 추천] 모든 자산의 5분봉 정밀 정리 (0.2%)
docker exec -it fire_markets_backend python scripts/cleanup_strange_ohlcv.py --interval 5m --threshold 0.002

# 🌟 [1분봉 추천] 모든 자산의 1분봉 아주 정밀하게 정리 (0.1%)
docker exec -it fire_markets_backend python scripts/cleanup_strange_ohlcv.py --interval 1m --threshold 0.001

# 특정 자산의 특정 시간봉만 정리할 경우
docker exec -it fire_markets_backend python scripts/cleanup_strange_ohlcv.py --asset_id 1 --interval 5m --threshold 0.002
```

## ⚙️ 파라미터 설명

| 파라미터 | 설명 | 기본값 | 비고 |
| :--- | :--- | :--- | :--- |
| `asset_id` | 정리할 자산의 ID | `None` | `None` 시 모든 자산 대상 |
| `interval` | 정리할 시간봉 간격 | `None` | `1m`, `5m` 등 지정 가능 (None 시 모든 간격) |
| `threshold` | 이상치 감지 기준 | `0.03` (3%) | 0.001은 0.1%, 0.002는 0.2%를 의미 |

## ⚠️ 주의사항

*   **권장 임계값**: 5분봉은 `0.002`(0.2%), 1분봉은 `0.001`(0.1%)이 적절합니다.
*   **영구 반영**: DB 값을 직접 `UPDATE` 하므로 주의하세요. 반영 전 `--dry_run`으로 확인 가능합니다.
*   **새로고침**: 실행 후 차트에 반영되지 않으면 브라우저(F5)를 새로고침하세요.
