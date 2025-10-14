"use client"

import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

export default function SocketTestPage() {
  const [socket, setSocket] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    console.log('🧪 Socket 테스트 시작')
    
    const newSocket = io('http://localhost:8001', {
      transports: ['polling', 'websocket'],
      timeout: 10000,
      forceNew: true,
    })

    newSocket.on('connect', () => {
      console.log('✅ Socket 테스트 연결 성공:', newSocket.id)
      setIsConnected(true)
      setConnectionError(null)
      setMessages(prev => [...prev, { type: 'connect', data: newSocket.id, time: new Date().toLocaleTimeString() }])
      
      // BTCUSDT 구독
      newSocket.emit('subscribe_prices', { symbols: ['BTCUSDT'] })
      console.log('🚪 BTCUSDT 구독 시도')
      setMessages(prev => [...prev, { type: 'subscribe_prices', data: { symbols: ['BTCUSDT'] }, time: new Date().toLocaleTimeString() }])
    })

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket 테스트 연결 실패:', error)
      setConnectionError(error.message)
      setIsConnected(false)
      setMessages(prev => [...prev, { type: 'error', data: error.message, time: new Date().toLocaleTimeString() }])
    })

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket 테스트 연결 해제:', reason)
      setIsConnected(false)
      setMessages(prev => [...prev, { type: 'disconnect', data: reason, time: new Date().toLocaleTimeString() }])
    })

    newSocket.on('realtime_quote', (data) => {
      console.log('📊 Socket 테스트 realtime_quote 수신:', data)
      setMessages(prev => [...prev, { type: 'realtime_quote', data, time: new Date().toLocaleTimeString() }])
    })

    newSocket.on('broadcast_quote', (data) => {
      console.log('📢 Socket 테스트 broadcast_quote 수신:', data)
      setMessages(prev => [...prev, { type: 'broadcast_quote', data, time: new Date().toLocaleTimeString() }])
    })

    newSocket.on('subscription_confirmed', (data) => {
      console.log('✅ Socket 테스트 구독 확인:', data)
      setMessages(prev => [...prev, { type: 'subscription_confirmed', data, time: new Date().toLocaleTimeString() }])
    })

    // 모든 이벤트 로깅
    newSocket.onAny((eventName, ...args) => {
      console.log('📡 Socket 테스트 이벤트 수신:', eventName, args)
      setMessages(prev => [...prev, { type: 'any', event: eventName, data: args, time: new Date().toLocaleTimeString() }])
    })

    setSocket(newSocket)

    return () => {
      console.log('🧹 Socket 테스트 정리')
      newSocket.disconnect()
    }
  }, [])

  const clearMessages = () => {
    setMessages([])
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Socket.IO 직접 테스트</h1>
      
      {/* 연결 상태 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">연결 상태</h2>
        <div className="space-y-2">
          <div className={`p-3 rounded ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <strong>Socket 연결:</strong> {isConnected ? '연결됨' : '연결 끊김'}
          </div>
          {connectionError && (
            <div className="p-3 rounded bg-red-100 text-red-800">
              <strong>연결 오류:</strong> {connectionError}
            </div>
          )}
        </div>
      </div>

      {/* 메시지 로그 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">메시지 로그</h2>
          <button 
            onClick={clearMessages}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            로그 지우기
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-gray-500">메시지 대기 중...</div>
          ) : (
            <div className="space-y-2">
              {messages.slice(-50).reverse().map((msg, index) => (
                <div key={index} className="p-2 border rounded text-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-blue-600">{msg.time}</span>
                    <span className="font-bold text-green-600">{msg.type}</span>
                  </div>
                  <div className="mt-1">
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(msg.data || msg.event, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
