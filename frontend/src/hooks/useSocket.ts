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

// 동적 Socket URL 설정 - 로컬 개발용으로 강제 localhost 사용
const getSocketURL = () => {
  return 'http://localhost:8001'  // 항상 localhost 사용
}

const SOCKET_URL = 'http://localhost:8001'  // 로컬 개발용 강제 설정

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    // Socket.IO 연결 초기화
    const isMobile = typeof window !== 'undefined' && 
      (window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    
    socketRef.current = io(SOCKET_URL, {
      transports: isMobile ? ['polling'] : ['polling', 'websocket'],
      timeout: isMobile ? 30000 : 20000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: isMobile ? 2000 : 1000,
      reconnectionAttempts: isMobile ? 3 : 5,
      withCredentials: false,
      upgrade: true,
    })

    const socket = socketRef.current

    // 연결 성공
    socket.on('connect', () => {
      // console.log('✅ Socket 연결됨')
      setIsConnected(true)
      setConnectionError(null)
    })

    // 연결 실패
    socket.on('connect_error', (error) => {
      // console.error('❌ Socket 연결 실패:', error.message)
      setConnectionError(error.message)
      setIsConnected(false)
    })

    // 연결 해제
    socket.on('disconnect', (reason) => {
      // console.log('🔌 Socket 연결 해제:', reason)
      setIsConnected(false)
    })

    // 정리 함수
    return () => {
      if (socket) {
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
    if (!socket || !isConnected || !assetIdentifier) {
      return
    }

    // 구독 요청
    socket.emit('subscribe_prices', { symbols: [assetIdentifier] })

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
      socket.off('subscription_confirmed', handleSubscriptionConfirmed)
      socket.off('realtime_quote', handleRealtimeQuote)
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
