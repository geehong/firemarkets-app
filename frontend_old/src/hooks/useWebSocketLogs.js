import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const useWebSocketLogs = () => {
  const [logs, setLogs] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    // 백엔드 서버 상태 확인
    const checkBackendStatus = async () => {
      try {
        const response = await fetch('/health')
        if (response.ok) {
          // 백엔드가 실행 중이면 WebSocket 연결 시도
          socketRef.current = io('/', {
            transports: ['websocket', 'polling'],
            timeout: 5000,
          })

          socketRef.current.on('connect', () => {
            setIsConnected(true)
            // console.log('Socket.IO 연결됨:', socketRef.current.id)
          })

          socketRef.current.on('disconnect', (reason) => {
            setIsConnected(false)
            // console.log('Socket.IO 연결 종료:', reason)
          })

          socketRef.current.on('log', (logData) => {
            setLogs((prevLogs) => [...prevLogs, logData])
          })

          socketRef.current.on('connect_error', (error) => {
            setIsConnected(false)
            // console.log('Socket.IO 연결 오류:', error)
          })
        } else {
          // console.log('백엔드 서버가 실행되지 않아 WebSocket 연결을 건너뜁니다.')
        }
      } catch (error) {
        // console.log('백엔드 서버에 연결할 수 없어 WebSocket 연결을 건너뜁니다:', error.message)
      }
    }

    checkBackendStatus()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  const clearLogs = () => {
    setLogs([])
  }

  return {
    logs,
    isConnected,
    clearLogs,
  }
}

export default useWebSocketLogs
