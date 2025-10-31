'use client'

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
    return 'https://backend.firemarkets.net'
  }

  const hostname = window.location.hostname
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
  
  // 모든 환경에서 프로덕션 백엔드 사용
  return 'https://backend.firemarkets.net'
}

// 전역 Socket 인스턴스 관리 (클라이언트 측에서만)
let globalSocket: Socket | null = null
let connectionCount = 0
let globalSubscriptions: Set<string> | null = null

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [transport, setTransport] = useState<string>('unknown')

  // 동적 URL 가져오기 (메모이제이션) - 클라이언트에서만 실행
  const socketURL = useMemo(() => {
    if (typeof window === 'undefined') return 'http://localhost:8001'
    return getSocketURL()
  }, [])
  
  // 모바일 감지 (메모이제이션) - 클라이언트에서만 실행
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }, [])

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') {
      return
    }

    // 전역 Socket 인스턴스 사용
    if (!globalSocket) {
      
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
      setIsConnected(true)
      setConnectionError(null)
      setTransport(socket.io.engine.transport.name)
      // 연결(재연결) 시 기존 구독 복원
      if (globalSubscriptions && globalSubscriptions.size > 0) {
        try {
          const symbols = Array.from(globalSubscriptions)
          socket.emit('subscribe_prices', { symbols })
        } catch (e) {
          // 재구독 중 예외 발생 시 무시
        }
      }
    })

    // 연결 실패
    socket.on('connect_error', (error) => {
      // WebSocket 연결 실패시 polling으로 강제 전환
      if (socket.io.engine.transport.name === 'websocket') {
        socket.io.engine.close()
      }
      
      setConnectionError(error.message)
      setIsConnected(false)
    })

    // 연결 해제
    socket.on('disconnect', (reason) => {
      setIsConnected(false)
    })

    // 재연결 시도
    socket.on('reconnect_attempt', (attemptNumber) => {
      // 재연결 시도 중
    })

    // 재연결 성공
    socket.on('reconnect', (attemptNumber) => {
      setIsConnected(true)
      setConnectionError(null)
      // 재연결 시 기존 구독 복원
      if (globalSubscriptions && globalSubscriptions.size > 0) {
        try {
          const symbols = Array.from(globalSubscriptions)
          socket.emit('subscribe_prices', { symbols })
        } catch (e) {
          // 재구독 중 예외 발생 시 무시
        }
      }
    })

    // 재연결 실패
    socket.on('reconnect_failed', () => {
      setConnectionError('연결 실패 - 페이지를 새로고침해주세요')
      setIsConnected(false)
    })

    // Transport 변경 감지
    socket.io.engine.on('upgrade', () => {
      setTransport(socket.io.engine.transport.name)
    })

    socket.io.engine.on('upgradeError', (error) => {
      setTransport('polling') // fallback으로 polling 사용
    })

    // 정리 함수
    return () => {
      connectionCount--
      // 마지막 연결이 해제될 때만 Socket 연결 종료
      if (connectionCount <= 0 && globalSocket) {
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
  const [isUsingDummyData, setIsUsingDummyData] = useState<boolean>(false)
  
  // 구독 상태를 관리하기 위한 Ref
  const subscriptionsRef = useRef<Set<string>>(new Set())
  
  // 컴포넌트별 연결 카운트를 위한 Ref
  const connectionCountRef = useRef(0)
  
  // 전역 구독 관리 초기화 (클라이언트에서만)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (!globalSubscriptions) {
      globalSubscriptions = new Set<string>()
    }
  }, [])

  // 연결 상태 체크 및 더미 데이터 모드 감지
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // 연결되지 않았고 소켓이 존재하지 않거나 연결 실패 시 더미 데이터 모드
    if (!socket || (!isConnected && !(socket && socket.connected))) {
      setIsUsingDummyData(true)
    } else {
      setIsUsingDummyData(false)
    }
  }, [socket, isConnected])

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') {
      return
    }

    if (!socket || !assetIdentifier) {
      return
    }

    // 전역 구독 세트 초기화
    if (!globalSubscriptions) globalSubscriptions = new Set<string>()
    if (!subscriptionsRef.current) subscriptionsRef.current = new Set<string>()

    // 구독 확인 수신
    const handleSubscriptionConfirmed = (data: any) => {
      // 구독 확인 처리
    }

    // 실시간 가격 데이터 수신
    const handleRealtimeQuote = (data: any) => {
      // 티커 매칭 (대소문자 무시, 공백 제거)
      const receivedTicker = String(data.ticker || '').trim().toUpperCase()
      const targetTicker = String(assetIdentifier || '').trim().toUpperCase()
      
      if (receivedTicker === targetTicker) {
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

    // 이벤트 리스너 등록 (연결 상태와 무관하게 항상 등록)
    socket.on('subscription_confirmed', handleSubscriptionConfirmed)
    socket.on('realtime_quote', handleRealtimeQuote)

    // 연결된 경우에만 구독 요청
    if (isConnected && socket && socket.connected) {
      socket.emit('subscribe_prices', { symbols: [assetIdentifier] })
      globalSubscriptions.add(assetIdentifier)
      subscriptionsRef.current.add(assetIdentifier)
    } else {
      // 연결이 안 되어 있으면 전역 구독에만 추가 (연결되면 자동으로 구독됨)
      globalSubscriptions.add(assetIdentifier)
      subscriptionsRef.current.add(assetIdentifier)
    }

    // 정리 함수
    return () => {
      socket.off('subscription_confirmed', handleSubscriptionConfirmed)
      socket.off('realtime_quote', handleRealtimeQuote)
    }
  }, [socket, assetIdentifier, isConnected])

  return {
    latestPrice,
    priceHistory,
    isConnected,
    isUsingDummyData,
  }
}

// 브로드캐스트 데이터 수신 훅
export const useBroadcastData = () => {
  const { socket, isConnected } = useSocket()
  const [broadcastData, setBroadcastData] = useState<BroadcastData[]>([])
  const [isUsingDummyData, setIsUsingDummyData] = useState<boolean>(false)

  // 연결 상태 체크 및 더미 데이터 모드 감지
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // 연결되지 않았고 소켓이 존재하지 않거나 연결 실패 시 더미 데이터 모드
    if (!socket || (!isConnected && !(socket && socket.connected))) {
      setIsUsingDummyData(true)
    } else {
      setIsUsingDummyData(false)
    }
  }, [socket, isConnected])

  useEffect(() => {
    if (!socket) {
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

    // 이벤트 리스너 등록 (연결 상태와 무관하게 항상 등록)
    socket.on('broadcast_quote', handleBroadcastQuote)

    // 정리 함수
    return () => {
      socket.off('broadcast_quote', handleBroadcastQuote)
    }
  }, [socket, isConnected])

  return {
    broadcastData,
    isConnected,
    isUsingDummyData,
  }
}

