'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { resolveApiBaseUrl, apiClient } from '@/lib/api'

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
    return 'http://localhost:8001'
  }

  const hostname = window.location.hostname
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'

  // 로컬 개발 환경
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8001'
  }

  // 프로덕션 환경 (firemarkets.net)
  if (hostname.includes('firemarkets.net')) {
    return 'https://backend.firemarkets.net'
  }

  // 그 외 환경 (자동 감지 시도)
  // 도메인/IP 접속 시, 기본적으로 Origin 사용 (Nginx Proxy 가정)
  // return `${protocol}//backend.${hostname}` // 기존 로직은 서브도메인 가정이라 위험
  if (typeof window !== 'undefined') {
      return window.location.origin;
  }
  return 'http://localhost:8001';
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
        // WebSocket 우선, 실패시 Polling fallback
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        withCredentials: false,
        // path: '/socket.io/', // 기본값 사용
        query: {
          EIO: "4"
        }
      })
    }

    connectionCount++
    const socket = globalSocket

    // 연결 성공
    socket.on('connect', () => {
      setIsConnected(true)
      setConnectionError(null)
      // socket.io.engine might be undefined during initial connection in some versions, check existence
      if (socket.io && socket.io.engine) {
        setTransport(socket.io.engine.transport.name)
      }
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
      // WebSocket 연결 실패시 polling으로 자동 전환은 socket.io가 알아서 처리함 (transports 배열에 따라)
      // 하지만 명시적으로 닫고 재시도하는 로직은 때로는 도움됨
      console.warn('[useSocket] Connection error:', error.message)
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
    if (socket.io && socket.io.engine) {
      socket.io.engine.on('upgrade', () => {
        setTransport(socket.io.engine.transport.name)
      })

      socket.io.engine.on('upgradeError', (error) => {
        // upgrade 실패 시 polling 유지
      })
    }

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
  }, [socketURL]) // socketURL 의존성 추가

  return {
    socket: globalSocket,
    isConnected,
    connectionError,
    transport,
  }
}

/**
 * 전일 종가 가져오기 함수
 */
// 전일 종가 가져오기 함수
const fetchLatestChangePercent = async (assetIdentifier: string): Promise<{ previousClose: number | null; changePercent: number | null }> => {
  try {
    // V2 API 사용 (limit=2, 1d interval)
    // v2GetOhlcv는 Promise<OhlcvResponseV2> 등을 반환하므로 any로 캐스팅하거나 타입을 맞춤
    const result: any = await apiClient.v2GetOhlcv(assetIdentifier, {
      data_interval: '1d',
      limit: 2
    }, { silentStatusCodes: [404] })

    const items = result?.data || result?.items || []
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { previousClose: null, changePercent: null }
    }

    // 최신순 정렬 (V2 응답 순서 불확실성을 대비)
    const sorted = [...items].sort((a: any, b: any) => {
      const timeA = new Date(a.timestamp_utc.endsWith('Z') ? a.timestamp_utc : a.timestamp_utc + 'Z').getTime()
      const timeB = new Date(b.timestamp_utc.endsWith('Z') ? b.timestamp_utc : b.timestamp_utc + 'Z').getTime()
      return timeB - timeA
    })

    // 오늘 날짜(UTC 기준) 확인
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();

    // 적절한 전일 종가 찾기
    // 1. sorted[0]의 날짜가 오늘이면 -> sorted[1] (어제) 사용
    // 2. sorted[0]의 날짜가 어제이거나 그 이전이면 -> sorted[0] 사용
    let targetData = sorted[0];
    
    if (targetData) {
      const targetTime = new Date(targetData.timestamp_utc.endsWith('Z') ? targetData.timestamp_utc : targetData.timestamp_utc + 'Z').getTime()
      if (targetTime >= todayUTC) {
        // 오늘의 데이터가 존재하면, 그 다음 데이터(어제)를 사용
        targetData = sorted.length > 1 ? sorted[1] : null;
      }
    }

    // v2 데이터 매핑 (close_price 사용)
    const previousClose = targetData?.close_price && targetData.close_price > 0
      ? targetData.close_price 
      : null

    return { previousClose, changePercent: null }
  } catch (error) {
    // console.warn(`[useSocket] Error fetching latest change percent for ${assetIdentifier}:`, error)
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

  const assetIdentifierRef = useRef(assetIdentifier)

  // 이전 가격 데이터를 추적하기 위한 ref (무한 루프 방지)
  const previousPriceDataRef = useRef<RealtimePrice | null>(null)

  // 마지막 처리 시간 추적 (스로틀링)
  const lastUpdateTimeRef = useRef<number>(0)
  const UPDATE_THROTTLE = 500 // 500ms마다 한 번만 업데이트 (초당 2회)

  // 업데이트 플래그 (동시 업데이트 방지)
  const isUpdatingRef = useRef<boolean>(false)

  useEffect(() => {
    assetIdentifierRef.current = assetIdentifier
    // assetIdentifier가 변경되면 모든 ref 초기화
    previousPriceDataRef.current = null
    latestPriceRef.current = null
    lastUpdateTimeRef.current = 0
    isUpdatingRef.current = false
  }, [assetIdentifier])

  // Use ref to store the latest handler to avoid dependency issues
  const handleRealtimeQuoteRef = useRef<((data: any) => void) | null>(null)

  // React 상태와 동기화된 ref
  const latestPriceRef = useRef<RealtimePrice | null>(null)

  // 공통 처리 함수: priceData를 받아서 setLatestPrice 호출 (useCallback으로 안정화)
  const processPriceUpdate = useCallback((priceData: RealtimePrice): boolean => {
    const now = Date.now()

    // 이미 업데이트 중이면 스킵 (동시 업데이트 방지)
    if (isUpdatingRef.current) {
      return false
    }

    // 스로틀링: 마지막 업데이트로부터 UPDATE_THROTTLE 이내면 스킵
    if (now - lastUpdateTimeRef.current < UPDATE_THROTTLE) {
      return false
    }

    const prevData = previousPriceDataRef.current

    // 같은 timestamp 체크
    if (prevData && prevData.timestamp === priceData.timestamp) {
      return false
    }

    // 데이터 변경 체크
    const hasChanged = !prevData ||
      prevData.price !== priceData.price ||
      prevData.timestamp !== priceData.timestamp

    if (!hasChanged) {
      return false
    }

    // 업데이트 플래그 설정
    isUpdatingRef.current = true
    lastUpdateTimeRef.current = now

    // setLatestPrice 호출 (함수형 업데이트로 이전 상태와 비교)
    setLatestPrice((prev: RealtimePrice | null) => {
      // 이전 상태와 동일하면 업데이트 건너뛰기 (무한 루프 방지)
      if (
        prev &&
        prev.price === priceData.price &&
        prev.timestamp === priceData.timestamp
      ) {
        isUpdatingRef.current = false
        return prev // 동일한 참조 반환 -> React가 리렌더 건너뜀
      }

      // ref 업데이트 (실제 업데이트될 때만)
      previousPriceDataRef.current = priceData
      latestPriceRef.current = priceData

      // 플래그 리셋
      isUpdatingRef.current = false

      return priceData
    })

    return true
  }, []) // 빈 의존성 배열 -> 함수가 안정적으로 유지됨

  // 실시간 가격 데이터 처리 핸들러 (useCallback으로 안정화)
  const handleRealtimeQuoteInternal = useCallback((data: any) => {
    // 티커 체크를 가장 먼저 수행 (성능 최적화)
    const targetAsset = assetIdentifierRef.current
    if (!targetAsset) {
      return
    }

    const receivedTicker = String(data.ticker || '').trim().toUpperCase()
    const targetTicker = String(targetAsset || '').trim().toUpperCase()

    // 티커가 일치하지 않으면 즉시 리턴 (다른 컴포넌트용 메시지)
    if (receivedTicker !== targetTicker) {
      return
    }


    const currentPrice = data.price
    const cacheKey = `${targetAsset}_previous_close`
    const cached = changePercentCacheRef.current.get(cacheKey)
    const now = Date.now()
    let changePercent: number | null = null

    if (cached && (now - cached.timestamp) < CACHE_DURATION && cached.previousClose) {
      const previousClose = cached.previousClose
      if (previousClose > 0 && currentPrice > 0) {
        changePercent = ((currentPrice - previousClose) / previousClose) * 100
        changePercent = Math.round(changePercent * 100) / 100
      }
    }

    const priceData: RealtimePrice = {
      price: currentPrice,
      volume: data.volume,
      timestamp: data.timestamp_utc,
      dataSource: data.data_source,
      changePercent: changePercent ?? undefined,
    }

    // processPriceUpdate 함수로 처리 (스로틀링 적용됨)
    processPriceUpdate(priceData)

    if ((!cached || (now - cached.timestamp) >= CACHE_DURATION || !cached.previousClose) && !loadingRef.current.has(targetAsset)) {
      loadingRef.current.add(targetAsset)

      fetchLatestChangePercent(targetAsset).then(result => {
        if (result.previousClose) {
          changePercentCacheRef.current.set(cacheKey, {
            previousClose: result.previousClose,
            timestamp: Date.now(),
          } as any)

          const newChangePercent = ((currentPrice - result.previousClose) / result.previousClose) * 100
          const rounded = Math.round(newChangePercent * 100) / 100

          // changePercent가 실제로 변경된 경우에만 업데이트
          const currentData = latestPriceRef.current

          if (currentData && currentData.price === currentPrice && currentData.changePercent !== rounded) {
            // 이미 업데이트 중이면 스킵
            if (isUpdatingRef.current) {
              return
            }

            const updatedData = {
              ...currentData,
              changePercent: rounded,
            }

            isUpdatingRef.current = true

            // processPriceUpdate 대신 직접 업데이트 (changePercent만 업데이트)
            setLatestPrice((prev: RealtimePrice | null) => {
              if (!prev || prev.price !== currentPrice) {
                isUpdatingRef.current = false
                return prev
              }
              if (prev.changePercent === rounded) {
                isUpdatingRef.current = false
                return prev
              }

              previousPriceDataRef.current = updatedData
              latestPriceRef.current = updatedData
              isUpdatingRef.current = false

              return updatedData
            })
          }
        }
      }).catch(error => {
        console.warn(`[useSocket] Failed to fetch previous close in background:`, error)
      }).finally(() => {
        loadingRef.current.delete(targetAsset)
      })
    }
  }, [processPriceUpdate]) // processPriceUpdate를 의존성으로 추가

  // handleRealtimeQuoteRef에 할당 (useEffect로 한 번만 실행)
  useEffect(() => {
    handleRealtimeQuoteRef.current = handleRealtimeQuoteInternal
  }, [handleRealtimeQuoteInternal])

  // Stable wrapper function
  const handleRealtimeQuote = useCallback((data: any) => {
    handleRealtimeQuoteRef.current?.(data)
  }, [])

  // 연결 상태 체크 및 더미 데이터 모드 감지
  useEffect(() => {
    if (typeof window === 'undefined') return

    const shouldDummy = !socket || (!isConnected && !(socket && socket.connected))
    setIsUsingDummyData(prev => prev === shouldDummy ? prev : shouldDummy)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, assetIdentifier, isConnected])

  // 초기 로드 시 전일 종가 미리 가져오기 (별도 useEffect)
  useEffect(() => {
    if (!assetIdentifier || typeof window === 'undefined') {
      return
    }

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
        const currentData = latestPriceRef.current
        if (currentData && currentData.price && previousClose && previousClose > 0) {
          const changePercent = ((currentData.price - previousClose) / previousClose) * 100
          const rounded = Math.round(changePercent * 100) / 100

          if (currentData.changePercent !== rounded) {
            // 이미 업데이트 중이면 스킵
            if (isUpdatingRef.current) {
              return
            }

            const updatedData = {
              ...currentData,
              changePercent: rounded,
            }

            isUpdatingRef.current = true

            setLatestPrice((prev: RealtimePrice | null) => {
              if (!prev || prev.price !== currentData.price) {
                isUpdatingRef.current = false
                return prev
              }
              if (prev.changePercent === rounded) {
                isUpdatingRef.current = false
                return prev
              }

              previousPriceDataRef.current = updatedData
              latestPriceRef.current = updatedData
              isUpdatingRef.current = false

              return updatedData
            })
          }
        }
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

    const shouldDummy = !socket || (!isConnected && !(socket && socket.connected))
    setIsUsingDummyData(prev => prev === shouldDummy ? prev : shouldDummy)
  }, [socket, isConnected])

  useEffect(() => {
    if (!socket) {
      return
    }

    const handleBroadcastQuote = (data: any) => {
      setBroadcastData((prev: BroadcastData[]) => {
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