import { useEffect, useRef, useState } from 'react'
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

// 동적 Socket URL 설정
const getSocketURL = () => {
  if (typeof window === 'undefined') return 'http://localhost:8001'
  
  const { hostname, protocol } = window.location
  
  // 개발 환경에서는 localhost 사용
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8001'
  }
  
  // 개발 환경 감지 (포트가 있는 경우)
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || window.location.port) {
    return 'http://localhost:8001'
  }
  
  // 프로덕션 환경에서만 api 서브도메인 사용
  if (protocol === 'https:' && !hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
    return `https://api.${hostname}`
  }
  
  // 기본적으로 localhost 사용 (개발 환경)
  return 'http://localhost:8001'
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || getSocketURL()

// console.log('🌐 Socket URL 설정:', SOCKET_URL)

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    // console.log('🔌 Socket.IO 연결 시도:', SOCKET_URL)
    
    // Socket.IO 연결 초기화 (모바일 환경 고려)
    const isMobile = typeof window !== 'undefined' && 
      (window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    
    socketRef.current = io(SOCKET_URL, {
      transports: isMobile ? ['polling'] : ['polling', 'websocket'], // 모바일에서는 polling만 사용
      timeout: isMobile ? 30000 : 20000, // 모바일에서는 더 긴 타임아웃
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: isMobile ? 2000 : 1000, // 모바일에서는 더 긴 재연결 지연
      reconnectionAttempts: isMobile ? 3 : 5, // 모바일에서는 재연결 시도 횟수 감소
      // Mixed Content 허용을 위한 설정
      withCredentials: false,
      upgrade: true,
    })

    const socket = socketRef.current

    // 연결 성공
    socket.on('connect', () => {
      // console.log('✅ Socket.IO 연결 성공:', socket.id)
      // console.log('🔗 연결된 URL:', SOCKET_URL)
      setIsConnected(true)
      setConnectionError(null)
    })

    // 연결 실패
    socket.on('connect_error', (error) => {
      // console.error('❌ Socket.IO 연결 실패:', error)
      // console.error('🔗 연결 시도 URL:', SOCKET_URL)
      setConnectionError(error.message)
      setIsConnected(false)
    })

    // 연결 해제
    socket.on('disconnect', (reason) => {
      // console.log('🔌 Socket.IO 연결 해제:', reason)
      setIsConnected(false)
    })

    // 모든 이벤트 로깅
    socket.onAny((eventName, ...args) => {
      // console.log('📡 Socket.IO 이벤트 수신:', eventName, args)
    })

    // 연결 상태 확인
    // console.log('🔍 Socket 연결 상태:', {
    //   connected: socket.connected,
    //   id: socket.id,
    //   transport: socket.io.engine.transport.name
    // })

    // 정리 함수
    return () => {
      if (socket) {
        // console.log('🧹 Socket.IO 연결 정리')
        socket.disconnect()
      }
    }
  }, [])

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
  }
}

// 실시간 가격 데이터 수신 훅
export const useRealtimePrices = (assetIdentifier: string) => {
  const { socket, isConnected } = useSocket()
  const [latestPrice, setLatestPrice] = useState<RealtimePrice | null>(null)
  const [priceHistory, setPriceHistory] = useState<RealtimePrice[]>([])

  useEffect(() => {
    // console.log('🎯 useRealtimePrices 훅 실행:', { socket: !!socket, isConnected, assetIdentifier })
    
    if (!socket) {
      // console.log('❌ Socket이 없음')
      return
    }
    
    if (!isConnected) {
      // console.log('❌ Socket이 연결되지 않음')
      return
    }
    
    if (!assetIdentifier) {
      // console.log('❌ assetIdentifier가 없음')
      return
    }

    // console.log(`🚀 실시간 가격 수신 시작: ${assetIdentifier}`)

    // 구독 요청
    socket.emit('subscribe_prices', { symbols: [assetIdentifier] })
    // console.log(`🚪 ${assetIdentifier} 구독 요청`)

    // 구독 확인 수신
    const handleSubscriptionConfirmed = (data: any) => {
      // console.log(`✅ 구독 확인 수신:`, data)
    }

    // 실시간 가격 데이터 수신
    const handleRealtimeQuote = (data: any) => {
      // console.log(`📊 실시간 가격 데이터 수신 [${assetIdentifier}]:`, data)
      // console.log(`🔍 데이터 비교: 수신 ticker="${data.ticker}", 요청 assetIdentifier="${assetIdentifier}"`)
      
      // 해당 자산의 데이터만 처리
      if (data.ticker === assetIdentifier) {
        // console.log(`✅ 매칭되는 데이터 발견! 가격 업데이트: $${data.price}`)
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
          // console.log(`📈 가격 히스토리 업데이트: ${newHistory.length}개 항목`)
          return newHistory.slice(-100) // 최근 100개만 유지
        })
      } else {
        // console.log(`⏭️ 다른 자산 데이터 무시: ${data.ticker} !== ${assetIdentifier}`)
      }
    }

    // 이벤트 리스너 등록
    // console.log('👂 이벤트 리스너 등록')
    socket.on('subscription_confirmed', handleSubscriptionConfirmed)
    socket.on('realtime_quote', handleRealtimeQuote)

    // 정리 함수
    return () => {
      // console.log('🧹 이벤트 리스너 제거')
      socket.off('subscription_confirmed', handleSubscriptionConfirmed)
      socket.off('realtime_quote', handleRealtimeQuote)
      // console.log(`🏁 실시간 가격 수신 종료: ${assetIdentifier}`)
    }
  }, [socket, isConnected, assetIdentifier])

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
    // console.log('🎯 useBroadcastData 훅 실행:', { socket: !!socket, isConnected })
    
    if (!socket) {
      // console.log('❌ Socket이 없음')
      return
    }
    
    if (!isConnected) {
      // console.log('❌ Socket이 연결되지 않음')
      return
    }

    // console.log('🚀 브로드캐스트 데이터 수신 시작')

    const handleBroadcastQuote = (data: any) => {
      // console.log('📢 브로드캐스트 데이터 수신:', data)
      // console.log('📊 브로드캐스트 데이터 상세:', {
      //   ticker: data.ticker,
      //   price: data.price,
      //   volume: data.volume,
      //   timestamp: data.timestamp_utc,
      //   dataSource: data.data_source
      // })
      
      setBroadcastData(prev => {
        const newData = [...prev, {
          assetId: data.asset_id,
          ticker: data.ticker,
          price: data.price,
          volume: data.volume,
          timestamp: data.timestamp_utc,
          dataSource: data.data_source,
        }]
        // console.log(`📈 브로드캐스트 히스토리 업데이트: ${newData.length}개 항목`)
        return newData.slice(-50) // 최근 50개만 유지
      })
    }

    // 이벤트 리스너 등록
    // console.log('👂 broadcast_quote 이벤트 리스너 등록')
    socket.on('broadcast_quote', handleBroadcastQuote)

    // 정리 함수
    return () => {
      // console.log('🧹 broadcast_quote 이벤트 리스너 제거')
      socket.off('broadcast_quote', handleBroadcastQuote)
      // console.log('🏁 브로드캐스트 데이터 수신 종료')
    }
  }, [socket, isConnected])

  return {
    broadcastData,
    isConnected,
  }
}
