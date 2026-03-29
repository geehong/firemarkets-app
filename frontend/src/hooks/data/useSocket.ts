'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { resolveApiBaseUrl, apiClient } from '@/lib/api'

// 타입 정의
export interface RealtimePrice {
  price: number
  volume?: number
  timestamp: string
  dataSource: string
  changePercent?: number // 일일 증감율 (%)
  asset_id?: number | string // 🚨 추가: 데이터의 자산 ID 유지
  ticker?: string            // 🚨 추가: 데이터의 티커 이름 유지
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
  const port = window.location.port

  // 1. 로컬 개발 환경 또는 루프백
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8001'
  }

  // 2. 프로덕션 환경 (firemarkets.net)
  if (hostname.includes('firemarkets.net')) {
    // 🔔 중요: 메인 도메인을 거쳐서 Next.js Rewrite를 통해 백엔드(http://backend:8000)로 우회 접속
    // 이렇게 하면 CORS나 SSL 인증서 문제를 피할 수 있고, 
    // 브라우저의 'Mixed Content' 경고(HTTPS에서 HTTP 요청 시 차단)를 원천 차단 가능함.
    return window.location.origin
  }

  // 3. 커스텀 개발 포트 (3006) 사용 시 백엔드 포트(8001)로 자동 전환
  if (port === '3006') {
    return `${protocol}//${hostname}:8001`
  }

  // 4. 그 외 환경 (자동 감지 시도) 캐시된 origin 사용
  return window.location.origin;
}

// 전역 Socket 인스턴스 관리 (클라이언트 측에서만)
let globalSocket: Socket | null = null
let connectionCount = 0
let globalSubscriptions: Set<string> | null = null

console.log('[useSocket] Module-level code loaded'); // 🔍 모듈 로드 확인용 로그

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [transport, setTransport] = useState<string>('unknown')

  // 동적 URL 가져오기 - 클라이언트에서만 실행 (하이드레이션 문제 방지)
  const socketURL = useMemo(() => {
    // 서버 사이드에서는 더미 URL 반환 (어차피 useEffect에서 사용되지 않음)
    if (typeof window === 'undefined') return ''
    
    // 🔔 프로덕션 환경(firemarkets.net)에서는 상대 경로를 사용하도록 설정
    // 이렇게 하면 Next.js rewrite(/socket.io)가 올바르게 작동함
    if (window.location.hostname.includes('firemarkets.net')) {
      return '' // 빈 문자열 전달 시 현재 Origin 사용
    }
    
    return getSocketURL()
  }, []) // 클라이언트 사이드에서 한 번만 호출됨

  // 모바일 감지 (메모이제이션) - 클라이언트에서만 실행
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }, [])

  useEffect(() => {
    // 🔍 훅 마운트 로그
    console.log(`[useSocket] Effect running. isConnected=${isConnected}, URL=${socketURL}`);

    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') {
      return
    }

    // 전역 Socket 인스턴스 사용
    if (!globalSocket) {
      console.log(`🔌 Initializing NEW WebSocket connection to: ${socketURL}`)
      
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
        path: '/socket.io', // Next.js 308 리다이렉션을 피하기 위해 슬래시 제거
        query: {
          EIO: "4"
        }
      })

      const initialSocket = globalSocket

      initialSocket.on('connect', () => {
        console.log('✅ WebSocket [NEW] Connected Successfully!')
        setIsConnected(true)
      })

      initialSocket.on('disconnect', (reason) => {
        console.warn(`[Socket.io] 🔌 [NEW] Disconnected: ${reason}`)
        setIsConnected(false)
      })

      initialSocket.on('connect_error', (error) => {
          console.error('[Socket.io] 🛑 [NEW] Connection error:', error.message);
          setConnectionError(error.message)
          setIsConnected(false)
      });
    } else {
        console.log(`[useSocket] Using existing globalSocket. Status: ${globalSocket.connected ? 'Connected' : 'Disconnected'}`);
    }

    connectionCount++
    const socket = globalSocket
    
    // 🔥 중요: 초기 상태 동기화 (이미 연결되어 있다면 즉시 true 설정)
    if (socket && socket.connected) {
        if (!isConnected) {
            console.log('[useSocket] Syncing isConnected to true');
            setIsConnected(true);
        }
        if (socket.io && socket.io.engine) {
            setTransport(socket.io.engine.transport.name);
        }
    }

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
export const useRealtimePrices = (assetIdentifier: string, options: { enabled?: boolean } = { enabled: true }) => {
  const enabled = options.enabled !== false;
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
    const receivedAssetId = String(data.asset_id || '').trim().toUpperCase()
    const targetTicker = String(targetAsset || '').trim().toUpperCase()

    // 🚨 수신된 데이터의 티커나 자산ID 중 하나라도 차트와 정확히 일치할 때만 통과 (교차 수신 원천 차단)
    // BTCUSDT (received) matches BTC (target) or BTCUSDT (target)
    const normalizedReceived = receivedTicker.replace(/[^A-Z0-9]/g, '')
    const normalizedTarget = targetTicker.replace(/[^A-Z0-9]/g, '')
    
    // 기본 일치 확인
    let isMatch = (receivedTicker === targetTicker) || 
                  (receivedAssetId === targetTicker) ||
                  (normalizedReceived === normalizedTarget);
    
    // 추가 변형 확인 (BTC -> BTCUSDT, BTC-USD -> BTCUSDT 등)
    if (!isMatch) {
      const suffixes = ['USDT', 'USD', 'KRW', 'BTC'];
      let rBase = normalizedReceived;
      let tBase = normalizedTarget;

      for (const s of suffixes) {
        if (rBase.endsWith(s) && rBase.length > s.length) rBase = rBase.slice(0, -s.length);
        if (tBase.endsWith(s) && tBase.length > s.length) tBase = tBase.slice(0, -s.length);
      }
      
      isMatch = rBase === tBase && rBase.length > 0;
    }

    // 디버깅을 위한 로그 (사용자 요청 시 활성화 가능)
    if (process.env.NODE_ENV === 'development' || window.location.search.includes('debug=true')) {
        if (isMatch || receivedTicker.includes(targetTicker) || targetTicker.includes(receivedTicker)) {
            console.log(`[Socket Match] ${isMatch ? '✅' : '❌'} Received: ${receivedTicker} (ID: ${receivedAssetId}), Target: ${targetTicker}`);
        }
    }


    // 티커가 일치하지 않으면 즉시 리턴 (다른 컴포넌트용 메시지)
    if (!isMatch) {
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

    const ts = (data.timestamp_utc && typeof data.timestamp_utc === 'string' && !data.timestamp_utc.includes('Z') && !data.timestamp_utc.includes('+'))
      ? `${data.timestamp_utc}Z`
      : data.timestamp_utc;

    const priceData: RealtimePrice = {
      price: currentPrice,
      volume: data.volume,
      timestamp: ts,
      dataSource: data.data_source,
      changePercent: changePercent ?? undefined,
      asset_id: data.asset_id, // 🚨 추가: 차트로 이름표 전달
      ticker: data.ticker,     // 🚨 추가: 차트로 이름표 전달
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

            const priceData = {
              ticker: receivedTicker,
              price: Number(data.price || 0),
              changePercent: Number(data.change_percent || data.changePercent || 0),
              volume: Number(data.volume_24h || data.volume || 0),
              timestamp: data.timestamp_utc || data.last_updated || new Date().toISOString()
            };
            
            processPriceUpdate(priceData as any);

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

              previousPriceDataRef.current = priceData as any
              latestPriceRef.current = priceData as any
              isUpdatingRef.current = false

              return priceData as any
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

    if (!socket || !assetIdentifier || !enabled) {
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
    if (!assetIdentifier || typeof window === 'undefined' || !enabled) {
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
  const [broadcastData, setBroadcastData] = useState<{ [key: string]: BroadcastData }>({})
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
      if (!data.ticker) return;
      setBroadcastData(prev => ({
        ...prev,
        [data.ticker]: {
          assetId: data.asset_id,
          ticker: data.ticker,
          price: data.price,
          volume: data.volume,
          timestamp: data.timestamp_utc,
          dataSource: data.data_source,
        }
      }));
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