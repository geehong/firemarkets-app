/**
 * usePeriodicAPI.js
 * 
 * 필요성:
 * - 실시간 데이터가 필요한 컴포넌트에서 주기적으로 API를 호출해야 할 때 사용
 * - WebSocket이 없거나 적절하지 않은 경우의 대안
 * - 기존 useAPI 훅은 한 번만 호출되므로 주기적 업데이트가 불가능
 * 
 * 목적:
 * - 지정된 간격으로 API를 자동 호출하는 재사용 가능한 훅 제공
 * - 로딩 상태, 에러 처리, 메모리 누수 방지를 자동으로 관리
 * - 컴포넌트 언마운트시 자동으로 interval 정리
 * 
 * 사용 사례:
 * - 상품(Commodities) 차트: 5분마다 최신 가격 업데이트
 * - 실시간 위젯: 30초마다 시장 상태 확인
 * - 알림 시스템: 1분마다 새로운 알림 확인
 * - 대시보드 통계: 5분마다 통계 데이터 업데이트
 * 
 * 장점:
 * - 일관된 패턴으로 모든 주기적 API 호출 처리
 * - 자동 에러 처리 및 로딩 상태 관리
 * - 메모리 누수 방지 (isMountedRef 사용)
 * - 유연한 간격 설정 (0: 한 번만, -1: 호출 안함)
 */

import { useState, useEffect, useRef } from 'react';
import { useAPI } from './useAPI';

// 주기적으로 API를 호출하는 커스텀 훅
export const usePeriodicAPI = (apiFunction, interval = 5000) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!isMountedRef.current) return;
            
            setLoading(true);
            try {
                const result = await apiFunction();
                if (isMountedRef.current) {
                    setData(result);
                    setError(null);
                }
            } catch (err) {
                if (isMountedRef.current) {
                    setError(err);
                }
            } finally {
                if (isMountedRef.current) {
                    setLoading(false);
                }
            }
        };

        // 초기 호출
        fetchData();

        // 주기적 호출
        if (interval > 0) {
            intervalRef.current = setInterval(fetchData, interval);
        }

        return () => {
            isMountedRef.current = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [apiFunction, interval]);

    return { data, loading, error };
};

export default usePeriodicAPI;
