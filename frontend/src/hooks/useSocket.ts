import { useEffect, useRef, useState, useMemo } from 'react'
import { io, Socket } from 'socket.io-client'

// 타입 정의
interface RealtimePrice {
  price: number
  volume?: number
  timestamp: string
  dataSource: string
}

interface BroadcastData {
  assetId: number
  ticker: string
  price: number
  volume?: number
  timestamp: string
  dataSource: string
}

// 동적 Socket URL 설정 - 환경에 따라 자동 선택
const getSocketURL = () => {
  // 브라우저 환경이 아닌 경우 (SSR 등)
  if (typeof window === 'undefined') {
    return 'http://localhost:8001'
  }

  const hostname = window.location.hostname
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
  
  // localhost 또는 127.0.0.1인 경우 (데스크탑 개발 환경)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8001'
  }
  
  // firemarkets.net 도메인인 경우
  if (hostname === 'firemarkets.net') {
    return 'https://backend.firemarkets.net'
  }
  
  // 실제 도메인인 경우 (프로덕션 또는 모바일 테스트)
  // 현재 프론트엔드와 같은 호스트의 8001 포트 사용
  return `${protocol}//${hostname}:8001`
}

// 환경에 따른 Socket URL 동적 설정
const SOCKET_URL = getSocketURL()

// 전역 Socket 인스턴스 관리
let globalSocket: Socket | null = null
let connectionCount = 0
let globalSubscriptions: Set<string> | null = null

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [transport, setTransport] = useState<string>('unknown')

  // 동적 URL 가져오기 (메모이제이션)
  const socketURL = useMemo(() => getSocketURL(), [])
  
  // 모바일 감지 (메모이제이션)
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }, [])

  useEffect(() => {
    // 전역 Socket 인스턴스 사용
    if (!globalSocket) {
      console.log('🔗 Socket 연결 시도:', socketURL, '모바일:', isMobile)
      
      globalSocket = io(socketURL, {
        // 모바일에서는 polling 우선, 데스크탑에서는 websocket 우선
        transports: isMobile ? ['polling', 'websocket'] : ['websocket', 'polling'],
        timeout: isMobile ? 30000 : 20000, // 모바일에서 더 긴 타임아웃
        forceNew: false, // 기존 연결 재사용
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: isMobile ? 3000 : 2000, // 모바일에서 더 긴 재연결 지연
        reconnectionDelayMax: isMobile ? 15000 : 10000, // 모바일에서 더 긴 최대 지연
        reconnectionAttempts: isMobile ? 5 : 3, // 모바일에서 더 많은 재연결 시도
        withCredentials: false,
        upgrade: true,
        // 폴링 최적화 설정
        polling: {
          extraHeaders: {},
          withCredentials: false,
        },
        // WebSocket 최적화 설정
        websocket: {
          extraHeaders: {},
        },
        // 연결 실패시 자동으로 polling으로 전환
        upgradeTimeout: isMobile ? 10000 : 5000, // 모바일에서 더 긴 업그레이드 타임아웃
        pingTimeout: 60000,
        pingInterval: 25000,
        // 추가 안정성 설정
        rememberUpgrade: false, // 업그레이드 실패시 기억하지 않음
        path: '/socket.io/', // 명시적 경로 설정
      })
    }

    connectionCount++
    const socket = globalSocket

    // 연결 성공
    socket.on('connect', () => {
      console.log('✅ Socket 연결됨 - Transport:', socket.io.engine.transport.name)
      console.log('🔗 Socket ID:', socket.id)
      console.log('🌐 연결 URL:', socketURL)
      console.log('📱 모바일 환경:', isMobile)
      setIsConnected(true)
      setConnectionError(null)
      setTransport(socket.io.engine.transport.name)
      // 연결(재연결) 시 기존 구독 복원
      if (globalSubscriptions && globalSubscriptions.size > 0) {
        try {
          const symbols = Array.from(globalSubscriptions)
          console.log('[useSocket] 재구독 실행 (connect):', symbols)
          socket.emit('subscribe_prices', { symbols })
        } catch (e) {
          console.warn('[useSocket] 재구독 중 예외 발생:', e)
        }
      }
    })

    // 연결 실패
    socket.on('connect_error', (error) => {
      console.error('❌ Socket 연결 실패:', error.message)
      console.error('🔍 연결 실패 상세:', {
        type: error.type,
        description: error.description,
        context: error.context,
        transport: socket.io.engine.transport.name,
        url: socketURL,
        isMobile: isMobile
      })
      
      // WebSocket 연결 실패시 polling으로 강제 전환
      if (socket.io.engine.transport.name === 'websocket') {
        console.log('🔄 WebSocket 실패, polling으로 전환 시도')
        socket.io.engine.close()
      }
      
      setConnectionError(error.message)
      setIsConnected(false)
    })

    // 연결 해제
    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket 연결 해제:', reason)
      console.log('🔍 연결 해제 상세:', {
        reason,
        transport: socket.io.engine.transport.name,
        wasConnected: socket.connected
      })
      setIsConnected(false)
    })

    // 재연결 시도
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 재연결 시도 ${attemptNumber}/3`)
    })

    // 재연결 성공
    socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ 재연결 성공 (${attemptNumber}번째 시도)`)
      setIsConnected(true)
      setConnectionError(null)
      // 재연결 시 기존 구독 복원
      if (globalSubscriptions && globalSubscriptions.size > 0) {
        try {
          const symbols = Array.from(globalSubscriptions)
          console.log('[useSocket] 재구독 실행 (reconnect):', symbols)
          socket.emit('subscribe_prices', { symbols })
        } catch (e) {
          console.warn('[useSocket] 재구독 중 예외 발생:', e)
        }
      }
    })

    // 재연결 실패
    socket.on('reconnect_failed', () => {
      console.error('❌ 재연결 실패 - 수동 재연결 필요')
      setConnectionError('연결 실패 - 페이지를 새로고침해주세요')
      setIsConnected(false)
    })

    // Transport 변경 감지
    socket.io.engine.on('upgrade', () => {
      console.log('⬆️ Transport 업그레이드:', socket.io.engine.transport.name)
      setTransport(socket.io.engine.transport.name)
    })

    socket.io.engine.on('upgradeError', (error) => {
      console.warn('⚠️ Transport 업그레이드 실패, polling으로 fallback:', error.message)
      setTransport('polling') // fallback으로 polling 사용
    })

    // 정리 함수
    return () => {
      connectionCount--
      // 마지막 연결이 해제될 때만 Socket 연결 종료
      if (connectionCount <= 0 && globalSocket) {
        console.log('🧹 마지막 Socket 연결 정리')
        globalSocket.disconnect()
        globalSocket = null
        connectionCount = 0
      }
    }
  }, [])

  return {
    socket: globalSocket,
    isConnected,
    connectionError,
    transport,
  }
}

// 실시간 가격 데이터 수신 훅
export const useRealtimePrices = (assetIdentifier: string) => {
  const { socket, isConnected } = useSocket()
  const [latestPrice, setLatestPrice] = useState<RealtimePrice | null>(null)
  const [priceHistory, setPriceHistory] = useState<RealtimePrice[]>([])
  
  // 전역 구독 관리 초기화
  if (!globalSubscriptions) {
    globalSubscriptions = new Set<string>()
  }

  useEffect(() => {
    if (!socket || !assetIdentifier) {
      return
    }

    // 전역 구독 세트 초기화
    if (!globalSubscriptions) globalSubscriptions = new Set<string>()

    // 항상 구독 요청 (idempotent 처리 가정)
    socket.emit('subscribe_prices', { symbols: [assetIdentifier] })
    globalSubscriptions.add(assetIdentifier)

    // 구독 확인 수신
    const handleSubscriptionConfirmed = (data: any) => {
      // console.log(`✅ ${assetIdentifier} 구독 확인`)
    }

    // 실시간 가격 데이터 수신
    const handleRealtimeQuote = (data: any) => {
      if (data.ticker === assetIdentifier) {
        setLatestPrice({
          price: data.price,
          volume: data.volume,
          timestamp: data.timestamp_utc,
          dataSource: data.data_source,
        })

        // 가격 히스토리 업데이트 (최근 100개만 유지)
        setPriceHistory(prev => {
          const newHistory = [...prev, {
            price: data.price,
            volume: data.volume,
            timestamp: data.timestamp_utc,
            dataSource: data.data_source,
          }]
          return newHistory.slice(-100)
        })
      }
    }

    // 이벤트 리스너 등록
    socket.on('subscription_confirmed', handleSubscriptionConfirmed)
    socket.on('realtime_quote', handleRealtimeQuote)

    // 정리 함수
    return () => {
      // 전역 구독 해제 (실제로는 다른 컴포넌트에서 사용 중일 수 있으므로 해제하지 않음)
      // socket.emit('unsubscribe_prices', { symbols: [assetIdentifier] })
      // globalSubscriptions?.delete(assetIdentifier)
      
      socket.off('subscription_confirmed', handleSubscriptionConfirmed)
      socket.off('realtime_quote', handleRealtimeQuote)
    }
  }, [socket, assetIdentifier])

  return {
    latestPrice,
    priceHistory,
    isConnected,
  }
}

// 브로드캐스트 데이터 수신 훅
export const useBroadcastData = () => {
  const { socket, isConnected } = useSocket()
  const [broadcastData, setBroadcastData] = useState<BroadcastData[]>([])

  useEffect(() => {
    if (!socket || !isConnected) {
      return
    }

    const handleBroadcastQuote = (data: any) => {
      setBroadcastData(prev => {
        const newData = [...prev, {
          assetId: data.asset_id,
          ticker: data.ticker,
          price: data.price,
          volume: data.volume,
          timestamp: data.timestamp_utc,
          dataSource: data.data_source,
        }]
        return newData.slice(-50) // 최근 50개만 유지
      })
    }

    // 이벤트 리스너 등록
    socket.on('broadcast_quote', handleBroadcastQuote)

    // 정리 함수
    return () => {
      socket.off('broadcast_quote', handleBroadcastQuote)
    }
  }, [socket, isConnected])

  return {
    broadcastData,
    isConnected,
  }
}
