import { useEffect } from 'react'
import useWebSocketStore from '../store/websocketStore'

// WebSocket 연결 관리 훅 (Zustand 스토어 기반)
export const useWebSocket = () => {
  const socket = useWebSocketStore((state) => state.socket)
  const connected = useWebSocketStore((state) => state.connected)
  const error = useWebSocketStore((state) => state.error)

  return { socket, connected, error }
}

// 실시간 가격 데이터 WebSocket 훅 (Zustand 스토어 기반)
export const useRealtimePricesWebSocket = (symbols = []) => {
  // 개별 상태를 선택하여 무한 루프 방지
  const prices = useWebSocketStore((state) => state.prices)
  const connected = useWebSocketStore((state) => state.connected)
  const loading = useWebSocketStore((state) => state.loading)
  const error = useWebSocketStore((state) => state.error)
  const backupMode = useWebSocketStore((state) => state.backupMode)
  const dataSource = useWebSocketStore((state) => state.dataSource)
  const lastUpdate = useWebSocketStore((state) => state.lastUpdate)
  const subscribeSymbols = useWebSocketStore((state) => state.subscribeSymbols)
  const unsubscribeSymbols = useWebSocketStore((state) => state.unsubscribeSymbols)
  const requestBackupData = useWebSocketStore((state) => state.requestBackupData)

  useEffect(() => {
    if (symbols && symbols.length > 0) {
      // 컴포넌트가 마운트될 때 심볼 구독을 요청합니다.
      subscribeSymbols(symbols)
    }

    return () => {
      if (symbols && symbols.length > 0) {
        // 컴포넌트가 언마운트될 때 구독 해제를 요청합니다.
        unsubscribeSymbols(symbols)
      }
    }
  }, [JSON.stringify(symbols), subscribeSymbols, unsubscribeSymbols])

  return {
    prices,
    loading,
    connected,
    error,
    backupMode,
    dataSource,
    lastUpdate,
    requestBackupData
  }
}

// 지연 가격 데이터 WebSocket 훅 (Zustand 스토어 기반)
export const useDelaySparklineWebSocket = (symbols = [], interval = '15m') => {
  const socket = useWebSocketStore((state) => state.socket)
  const connected = useWebSocketStore((state) => state.connected)

  // 이 훅은 기존 로직을 유지하되, Zustand 스토어의 연결 상태를 사용합니다.
  // 필요에 따라 나중에 완전히 리팩토링할 수 있습니다.
  
  return { 
    data: {}, // 기존 로직 유지
    loading: !connected, 
    connected 
  }
}

export default useWebSocket