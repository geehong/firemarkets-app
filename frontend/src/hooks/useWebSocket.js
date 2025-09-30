import { useEffect, useRef, useState, useCallback } from 'react'
import io from 'socket.io-client'

// WebSocket 연결 관리 훅
export const useWebSocket = (url = 'ws://localhost:8001') => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const reconnectTimeoutRef = useRef(null)

  useEffect(() => {
    const newSocket = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })

    newSocket.on('connect', () => {
      console.log('WebSocket connected:', newSocket.id)
      setConnected(true)
      setError(null)
      
      // 전역 window 객체에 socket 저장
      window.socket = newSocket
    })

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      setConnected(false)
      
      // 자동 재연결 (5초 후)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...')
        newSocket.connect()
      }, 5000)
    })

    newSocket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err)
      setError(err.message)
    })

    setSocket(newSocket)

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      window.socket = null
      newSocket.disconnect()
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

  // 심볼 변경 시 구독 업데이트
  useEffect(() => {
    symbolsRef.current = symbols
  }, [symbols])

  // 백업 데이터 요청 함수
  const requestBackupData = useCallback(() => {
    if (socket && symbols.length > 0) {
      console.log('🆘 백업 데이터 요청:', symbols)
      socket.emit('request_backup_data', { symbols })
      
      // 5초 후에도 응답이 없으면 API 폴백
      backupRequestTimeout.current = setTimeout(() => {
        console.warn('⏰ 백업 데이터 요청 타임아웃, API 폴백으로 전환')
        setBackupMode(true)
        setDataSource('api_fallback')
      }, 5000)
    }
  }, [socket, symbols])

  // 연결 상태 모니터링
  useEffect(() => {
    if (connected && socket) {
      console.log('🔗 WebSocket 연결됨, 헬스체크 시작')
      // 30초마다 헬스체크
      healthCheckInterval.current = setInterval(() => {
        console.log('🏥 헬스체크 요청')
        socket.emit('check_connection_health', { timestamp: Date.now() })
      }, 30000)

      const handleHealthResponse = (data) => {
        console.log('✅ 헬스체크 응답:', data)
        setLastUpdate(Date.now())
      }

      const handleDataSourceChanged = (data) => {
        console.log('🔄 데이터 소스 변경:', data)
        setDataSource(data.new_source)
        setBackupMode(true)
      }

      const handleBackupData = (data) => {
        console.log('📦 백업 데이터 수신:', data)
        setPrices(data.data)
        setDataSource(data.source)
        setBackupMode(true)
      }

      const handleBackupError = (error) => {
        console.warn('❌ 백업 데이터 오류:', error)
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

  // 연결 끊김 감지 시 백업 모드 활성화
  useEffect(() => {
    if (!connected && symbols.length > 0) {
      console.warn('🔌 WebSocket 연결 끊김, 백업 모드 활성화')
      setBackupMode(true)
      setDataSource('api_fallback')
      requestBackupData()
    } else if (connected && backupMode) {
      console.log('🔄 WebSocket 재연결됨, 백업 모드 해제')
      setBackupMode(false)
      setDataSource('websocket')
    }
  }, [connected, symbols.length, requestBackupData, backupMode])

  useEffect(() => {
    if (!socket || !connected) return

    const handlePriceUpdate = (data) => {
      console.log('💰 가격 업데이트 수신:', data.symbol, `$${data.price}`)
      setPrices(prev => ({
        ...prev,
        [data.symbol]: {
          price: data.price,
          change_amount: data.change_amount,
          change_percent: data.change_percent,
          timestamp_utc: data.timestamp_utc,
          data_source: data.data_source
        }
      }))
      setLoading(false)
      setLastUpdate(Date.now())
      setBackupMode(false) // 정상 데이터 수신 시 백업 모드 해제
    }

            const handleRealtimeQuote = (data) => {
              console.log('📊 실시간 인용 수신:', data)
              console.log('🔍 수신된 데이터 상세:', {
                asset_id: data.asset_id,
                ticker: data.ticker,
                price: data.price,
                change_percent: data.change_percent,
                data_source: data.data_source
              })
              
              // 구독 중인 심볼만 필터링
              const subscribedSymbols = symbolsRef.current || []
              console.log('🔍 구독 중인 심볼 목록:', subscribedSymbols)
              console.log('🔍 수신된 티커:', data.ticker)
              console.log('🔍 티커 매칭 여부:', data.ticker && subscribedSymbols.includes(data.ticker))
              
              if (data.ticker && subscribedSymbols.includes(data.ticker)) {
                console.log('✅ 구독 중인 심볼 데이터 수신:', data.ticker)
                setPrices(prev => ({
                  ...prev,
                  [data.ticker]: {
                    price: data.price,
                    change_amount: data.change_amount,
                    change_percent: data.change_percent,
                    timestamp_utc: data.timestamp_utc,
                    data_source: data.data_source
                  }
                }))
                setLoading(false)
                setLastUpdate(Date.now())
              } else {
                console.log('⏭️ 구독하지 않는 심볼:', data.ticker, '구독 목록:', subscribedSymbols)
              }
            }

    // 이벤트 리스너 등록
    socket.on('price_update', handlePriceUpdate)
    socket.on('realtime_quote', handleRealtimeQuote)

    // 구독 요청
    if (symbols.length > 0) {
      console.log(`📡 가격 구독 요청: ${symbols.join(', ')}`)
      socket.emit('subscribe_prices', { symbols })
    }

    return () => {
      console.log(`🔌 가격 구독 해제: ${symbols.join(', ')}`)
      socket.off('price_update', handlePriceUpdate)
      socket.off('realtime_quote', handleRealtimeQuote)
      if (symbols.length > 0) {
        socket.emit('unsubscribe_prices', { symbols })
      }
    }
  }, [socket, connected, symbols])

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
      console.log('Sparkline update received:', data)
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
