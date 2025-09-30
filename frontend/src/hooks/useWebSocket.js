import { useEffect, useRef, useState, useCallback } from 'react'
import io from 'socket.io-client'

// --- WebSocket Singleton ---
// 애플리케이션 전체에서 단 하나의 소켓 인스턴스만 유지하도록 수정
let socketInstance = null

const getSocket = (url) => {
  if (!socketInstance) {
    socketInstance = io(url, {
      transports: ['websocket'],
      path: '/socket.io',
      // Disable per-message deflate to reduce CPU for high-frequency small msgs
      perMessageDeflate: false,
      // forceNew: true 옵션 제거. 불필요한 재연결 방지
      // 라이브러리의 자동 재연결 기능 활용
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
    console.log('[WebSocket] New socket instance created.')
  }
  return socketInstance
}

// WebSocket 연결 관리 훅 (싱글턴 인스턴스 사용)
export const useWebSocket = (url = 'http://localhost:8001') => {
  const [socket] = useState(() => getSocket(url))
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const onConnect = () => {
      console.log('[WebSocket] Connected:', socket.id)
      setConnected(true)
      setError(null)
    }

    const onDisconnect = (reason) => {
      console.log('[WebSocket] Disconnected:', reason)
      setConnected(false)
    }

    const onConnectError = (err) => {
      console.error('[WebSocket] Connection Error:', err.message)
      setError(err.message)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    return () => {
      // 컴포넌트 언마운트 시 리스너만 제거. 연결은 유지.
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
    }
  }, [url])

  return { socket, connected, error }
}

// 실시간 가격 데이터 WebSocket 훅 (오류 대응 강화)
export const useRealtimePricesWebSocket = (symbols = []) => {
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [backupMode, setBackupMode] = useState(false)
  const [dataSource, setDataSource] = useState('websocket')
  const [lastUpdate, setLastUpdate] = useState(null)
  const { socket, connected } = useWebSocket()
  const symbolsRef = useRef(symbols)
  const healthCheckInterval = useRef(null)
  const backupRequestTimeout = useRef(null)
  // rAF 배치 업데이트용
  const latestMapRef = useRef({})
  const rafIdRef = useRef(null)
  const flushTimeoutRef = useRef(null)

  // 심볼 변경 시 구독 업데이트
  useEffect(() => {
    symbolsRef.current = symbols
  }, [symbols])

  // 백업 데이터 요청 함수
  const requestBackupData = useCallback(() => {
    if (socket && symbols.length > 0) {
      socket.emit('request_backup_data', { symbols })
      
      // 5초 후에도 응답이 없으면 API 폴백
      backupRequestTimeout.current = setTimeout(() => {
        setBackupMode(true)
        setDataSource('api_fallback')
      }, 5000)
    }
  }, [socket, symbols])

  // 연결 상태 모니터링
  useEffect(() => {
    if (connected && socket) {
      // 30초마다 헬스체크
      healthCheckInterval.current = setInterval(() => {
        socket.emit('check_connection_health', { timestamp: Date.now() })
      }, 30000)

      const handleHealthResponse = (data) => {
        setLastUpdate(Date.now())
      }

      const handleDataSourceChanged = (data) => {
        setDataSource(data.new_source)
        setBackupMode(true)
      }

      const handleBackupData = (data) => {
        setPrices(data.data)
        setDataSource(data.source)
        setBackupMode(true)
      }

      const handleBackupError = (error) => {
        setBackupMode(true)
        setDataSource('api_fallback')
      }

      socket.on('health_check_response', handleHealthResponse)
      socket.on('data_source_changed', handleDataSourceChanged)
      socket.on('backup_data_response', handleBackupData)
      socket.on('backup_data_error', handleBackupError)

      return () => {
        if (healthCheckInterval.current) {
          clearInterval(healthCheckInterval.current)
        }
        socket.off('health_check_response', handleHealthResponse)
        socket.off('data_source_changed', handleDataSourceChanged)
        socket.off('backup_data_response', handleBackupData)
        socket.off('backup_data_error', handleBackupError)
      }
    }
  }, [connected, socket])

  useEffect(() => {
    if (!socket || !connected) return

    // --- 구독 및 구독 해제 로직 ---
    // 이 로직은 연결 상태가 아닌, 구독 심볼이 변경될 때만 실행되어야 합니다.
    // 따라서 이 useEffect는 symbols 배열에만 의존하도록 합니다.
    const subscribe = () => {
      if (symbols.length > 0) {
        console.log('[WebSocket] Subscribing to symbols:', symbols)
        socket.emit('subscribe_prices', { symbols })
      }
    }

    const unsubscribe = () => {
      if (symbols.length > 0) {
        console.log('[WebSocket] Unsubscribing from symbols:', symbols)
        socket.emit('unsubscribe_prices', { symbols })
      }
    }

    const flushBatched = () => {
      const latest = latestMapRef.current
      if (!latest || Object.keys(latest).length === 0) return
      setPrices(prev => {
        const next = { ...prev }
        for (const [k, v] of Object.entries(latest)) {
          next[k] = v
        }
        return next
      })
      latestMapRef.current = {}
      setLoading(false)
      setLastUpdate(Date.now())
      setBackupMode(false)
      rafIdRef.current = null
    }

    // rAF와 setTimeout을 결합한 하이브리드 플러시 스케줄러
    const scheduleFlush = () => {
      // 이미 rAF가 예약되어 있으면 추가 작업 불필요
      if (rafIdRef.current !== null) return

      // rAF 예약
      rafIdRef.current = requestAnimationFrame(flushBatched)

      // 백그라운드 탭 등에서 rAF가 지연될 경우를 대비한 안전장치
      // 100ms 후에도 flush가 안됐다면 강제 실행
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current)
      flushTimeoutRef.current = setTimeout(() => {
        if (rafIdRef.current !== null) flushBatched()
      }, 100) // 100ms의 상한선 설정
    }

    const handlePriceUpdate = (data) => {
      const payload = {
        price: data.price,
        change_amount: data.change_amount,
        change_percent: data.change_percent,
        timestamp_utc: data.timestamp_utc,
        data_source: data.data_source
      }
      if (data.symbol) {
        // Log only BTCUSDT updates
        if (data.symbol === 'BTCUSDT') {
          console.log('[WebSocket] BTCUSDT price_update:', payload)
        }
        latestMapRef.current[data.symbol] = payload
      }
      scheduleFlush()
    }

  const handleRealtimeQuote = (data) => {
    // 구독 중인 심볼(ticker)인지 확인하여 데이터 처리
    if (data.ticker && symbolsRef.current.includes(data.ticker)) {
      const payload = {
        price: data.price,
        change_amount: data.change_amount,
        change_percent: data.change_percent,
        timestamp_utc: data.timestamp_utc,
        data_source: data.data_source
      }
      // Log only BTCUSDT realtime quotes
      if (data.ticker === 'BTCUSDT') {
        console.log('[WebSocket] BTCUSDT realtime_quote:', payload)
      }
      latestMapRef.current[data.ticker] = payload
      scheduleFlush()
    }
  }

    // --- 이벤트 리스너 등록 ---
    // 이벤트 리스너 등록
    socket.on('price_update', handlePriceUpdate)
    socket.on('realtime_quote', handleRealtimeQuote)

    // 컴포넌트 마운트 시 구독
    subscribe()

    return () => {
      // 컴포넌트 언마운트 시 리스너만 제거합니다.
      // 구독 해제 로직을 제거하여 페이지 이동 시 연결이 끊기지 않도록 합니다.
      // 사용자가 앱을 나갈 때 소켓 연결은 자동으로 끊어집니다.
      socket.off('price_update', handlePriceUpdate)
      socket.off('realtime_quote', handleRealtimeQuote)
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
      // unsubscribe() // 이 줄을 주석 처리하거나 삭제합니다.
    }
  }, [socket, connected, JSON.stringify(symbols)]) // symbols가 실제로 변경될 때만 재구독하도록 의존성 배열을 강화합니다.

  // 연결 끊김 감지 시 백업 모드 활성화
  useEffect(() => {
    if (!connected && symbols.length > 0) {
      setBackupMode(true)
      setDataSource('api_fallback')
    } else if (connected) {
      setBackupMode(false)
      setDataSource('websocket')
    }
  }, [connected, symbols.length])

  return {
    prices,
    loading,
    connected,
    backupMode,
    dataSource,
    lastUpdate,
    requestBackupData
  }
}

// 지연 가격 데이터 WebSocket 훅
export const useDelaySparklineWebSocket = (symbols = [], interval = '15m') => {
  const [sparklineData, setSparklineData] = useState({})
  const [loading, setLoading] = useState(true)
  const { socket, connected } = useWebSocket()

  useEffect(() => {
    if (!socket || !connected) return

    const handleSparklineUpdate = (data) => {
      setSparklineData(prev => ({
        ...prev,
        [data.symbol]: data.quotes || []
      }))
      setLoading(false)
    }

    socket.on('sparkline_update', handleSparklineUpdate)

    // 구독 요청
    if (symbols.length > 0) {
      socket.emit('subscribe_sparkline', { symbols, interval })
    }

    return () => {
      socket.off('sparkline_update', handleSparklineUpdate)
      if (symbols.length > 0) {
        socket.emit('unsubscribe_sparkline', { symbols })
      }
    }
  }, [socket, connected, symbols, interval])

  return { data: sparklineData, loading, connected }
}

export default useWebSocket
