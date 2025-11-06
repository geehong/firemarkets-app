'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { io, Socket } from 'socket.io-client'

// 타입 정의
interface RealtimePrice {
  price: number
  volume?: number
  timestamp: string
  dataSource: string
  changePercent?: number // 일일 증감율 (%)
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
        try {
          // 연결이 실제로 활성화되어 있는지 확인
          // socket.active는 연결이 활성화되어 있거나 연결 중인 상태를 의미
          // socket.connected는 연결이 완료된 상태를 의미
          if (globalSocket.connected || (globalSocket as any).active) {
            globalSocket.disconnect()
          }
        } catch (error) {
          // 연결이 완전히 설정되지 않았거나 이미 닫힌 경우 에러 무시
          // React Strict Mode에서 발생할 수 있는 정상적인 상황
          // 개발 모드에서만 디버그 로그 출력 (프로덕션에서는 무시)
          if (process.env.NODE_ENV === 'development') {
            console.debug('[useSocket] Cleanup: Socket already closed or not fully connected')
          }
        } finally {
          globalSocket = null
          connectionCount = 0
        }
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

/**
 * 전일 종가 가져오기 함수
 * 
 * /api/v1/assets/price/ API에서 가장 최근 날짜의 value를 전일 종가로 사용합니다.
 * 예: 오늘이 2025-11-06이면, 2025-11-05의 value(종가)를 반환합니다.
 */
const fetchLatestChangePercent = async (assetIdentifier: string): Promise<{ previousClose: number | null; changePercent: number | null }> => {
  try {
    const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'https://backend.firemarkets.net/api/v1'
    
    // 최근 2개 일봉 데이터 조회 (가장 최근 날짜의 change_percent와 전일 종가 확인용)
    const url = `${BACKEND_BASE}/assets/price/${assetIdentifier}?data_interval=1d&limit=2`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5초 타임아웃
    })
    
    if (!response.ok) {
      console.warn(`[useSocket] Failed to fetch latest change percent for ${assetIdentifier}: ${response.status}`)
      return { previousClose: null, changePercent: null }
    }
    
    const data = await response.json()
    
    if (!data?.data || !Array.isArray(data.data) || data.data.length === 0) {
      return { previousClose: null, changePercent: null }
    }
    
    // 가장 최근 데이터 (첫 번째) - 이것이 전일 종가 데이터
    const latestData = data.data[0]
    
    // API에서 계산된 change_percent는 무시하고, 전일 종가만 사용
    // 전일 종가는 가장 최근 데이터의 value (예: 2025-11-05의 종가)
    const previousClose = latestData?.value && latestData.value > 0
      ? latestData.value
      : null
    
    // change_percent는 사용하지 않음 (실시간 가격과 전일 종가로 직접 계산)
    return { previousClose, changePercent: null }
  } catch (error) {
    console.warn(`[useSocket] Error fetching latest change percent for ${assetIdentifier}:`, error)
    return { previousClose: null, changePercent: null }
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
  
  // 전일 종가 캐시 (최대 5분간 유지)
  const changePercentCacheRef = useRef<Map<string, { previousClose: number | null; timestamp: number }>>(new Map())
  const CACHE_DURATION = 5 * 60 * 1000 // 5분
  // 백그라운드 로딩 중인 assetIdentifier 추적 (중복 요청 방지)
  const loadingRef = useRef<Set<string>>(new Set())
  
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
        const currentPrice = data.price
        
        // 캐시에서 전일 종가 확인 (동기적으로 즉시 확인)
        const cacheKey = `${assetIdentifier}_previous_close`
        const cached = changePercentCacheRef.current.get(cacheKey)
        const now = Date.now()
        let changePercent: number | null = null
        
        // 캐시가 있고 유효한 경우 즉시 계산
        if (cached && (now - cached.timestamp) < CACHE_DURATION && cached.previousClose) {
          const previousClose = cached.previousClose
          if (previousClose > 0 && currentPrice > 0) {
            changePercent = ((currentPrice - previousClose) / previousClose) * 100
            changePercent = Math.round(changePercent * 100) / 100
          }
        }
        
        // 실시간 가격은 즉시 업데이트 (블로킹 없이)
        const priceData: RealtimePrice = {
          price: currentPrice,
          volume: data.volume,
          timestamp: data.timestamp_utc,
          dataSource: data.data_source,
          changePercent: changePercent ?? undefined,
        }
        
        setLatestPrice(priceData)

        // 가격 히스토리 업데이트 (최근 100개만 유지)
        setPriceHistory(prev => {
          const newHistory = [...prev, priceData]
          return newHistory.slice(-100)
        })
        
        // 캐시가 없거나 만료된 경우 백그라운드에서 전일 종가 가져오기 (비동기, 블로킹 없음)
        if ((!cached || (now - cached.timestamp) >= CACHE_DURATION || !cached.previousClose) && !loadingRef.current.has(assetIdentifier)) {
          loadingRef.current.add(assetIdentifier)
          
          fetchLatestChangePercent(assetIdentifier).then(result => {
            if (result.previousClose) {
              // 캐시에 저장
              changePercentCacheRef.current.set(cacheKey, {
                previousClose: result.previousClose,
                timestamp: Date.now(),
              } as any)
              
              // 전일 종가를 가져온 후 현재 가격과 다시 계산하여 업데이트
              const newChangePercent = ((currentPrice - result.previousClose) / result.previousClose) * 100
              setLatestPrice(prev => {
                if (!prev || prev.price !== currentPrice) return prev // 가격이 변경되었으면 업데이트하지 않음
                return {
                  ...prev,
                  changePercent: Math.round(newChangePercent * 100) / 100,
                }
              })
            }
          }).catch(error => {
            console.warn(`[useSocket] Failed to fetch previous close in background:`, error)
          }).finally(() => {
            loadingRef.current.delete(assetIdentifier)
          })
        }
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
  
  // 초기 로드 시 전일 종가 미리 가져오기 (별도 useEffect)
  useEffect(() => {
    if (!assetIdentifier || typeof window === 'undefined') return
    
    const loadPreviousClose = async () => {
      const cacheKey = `${assetIdentifier}_previous_close`
      const cached = changePercentCacheRef.current.get(cacheKey)
      const now = Date.now()
      
      // 캐시가 없거나 만료된 경우에만 API 호출
      if (!cached || (now - cached.timestamp) >= CACHE_DURATION) {
        const { previousClose } = await fetchLatestChangePercent(assetIdentifier)
        
        // 캐시에 저장
        if (previousClose) {
          changePercentCacheRef.current.set(cacheKey, {
            previousClose: previousClose,
            timestamp: now,
          } as any)
        }
        
        // latestPrice가 있으면 changePercent 계산하여 업데이트
        setLatestPrice(prev => {
          if (!prev || !prev.price || !previousClose || previousClose <= 0) return prev
          
          const changePercent = ((prev.price - previousClose) / previousClose) * 100
          return {
            ...prev,
            changePercent: Math.round(changePercent * 100) / 100,
          }
        })
      }
    }
    
    loadPreviousClose()
  }, [assetIdentifier])

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

