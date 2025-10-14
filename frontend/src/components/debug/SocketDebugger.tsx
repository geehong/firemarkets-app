"use client"

import React, { useState, useEffect } from 'react'
import { useSocket } from '@/hooks/useSocket'

interface LogEntry {
  timestamp: string
  level: 'info' | 'error' | 'warn' | 'success'
  message: string
  data?: any
}

const SocketDebugger: React.FC = () => {
  const { socket, isConnected, connectionError, transport } = useSocket()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isVisible, setIsVisible] = useState(false)

  // 디버그 컴포넌트 비활성화
  return null

  // 로그 추가 함수
  const addLog = (level: LogEntry['level'], message: string, data?: any) => {
    const newLog: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      data
    }
    setLogs(prev => [newLog, ...prev.slice(0, 49)]) // 최근 50개만 유지
  }

  // Socket 이벤트 모니터링
  useEffect(() => {
    if (!socket) return

    const handleConnect = () => {
      addLog('success', 'Socket 연결됨', {
        transport: socket.io.engine.transport.name,
        socketId: socket.id,
        url: socket.io.uri
      })
    }

    const handleDisconnect = (reason: string) => {
      addLog('warn', 'Socket 연결 해제', { reason })
    }

    const handleConnectError = (error: any) => {
      addLog('error', 'Socket 연결 실패', {
        message: error.message,
        type: error.type,
        description: error.description,
        transport: socket.io.engine.transport.name
      })
    }

    const handleReconnect = (attemptNumber: number) => {
      addLog('info', 'Socket 재연결 성공', { attemptNumber })
    }

    const handleReconnectAttempt = (attemptNumber: number) => {
      addLog('info', 'Socket 재연결 시도', { attemptNumber })
    }

    const handleReconnectFailed = () => {
      addLog('error', 'Socket 재연결 실패')
    }

    // 이벤트 리스너 등록
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('connect_error', handleConnectError)
    socket.on('reconnect', handleReconnect)
    socket.on('reconnect_attempt', handleReconnectAttempt)
    socket.on('reconnect_failed', handleReconnectFailed)

    // Transport 변경 감지
    socket.io.engine.on('upgrade', () => {
      addLog('info', 'Transport 업그레이드', { 
        transport: socket.io.engine.transport.name 
      })
    })

    socket.io.engine.on('upgradeError', (error: any) => {
      addLog('warn', 'Transport 업그레이드 실패', { 
        error: error.message,
        fallback: 'polling'
      })
    })

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('connect_error', handleConnectError)
      socket.off('reconnect', handleReconnect)
      socket.off('reconnect_attempt', handleReconnectAttempt)
      socket.off('reconnect_failed', handleReconnectFailed)
    }
  }, [socket])

  // 초기 정보 로그
  useEffect(() => {
    addLog('info', 'Socket Debugger 초기화', {
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      isMobile: window.innerWidth <= 768,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port
    })
  }, [])

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50'
      case 'warn': return 'text-yellow-600 bg-yellow-50'
      case 'success': return 'text-green-600 bg-green-50'
      default: return 'text-blue-600 bg-blue-50'
    }
  }

  const getStatusColor = () => {
    if (isConnected) return 'text-green-600 bg-green-100'
    if (connectionError) return 'text-red-600 bg-red-100'
    return 'text-yellow-600 bg-yellow-100'
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${getStatusColor()}`}
        >
          🔌 Socket Debug
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="font-medium text-sm">Socket Debug</span>
          <span className={`px-2 py-1 rounded text-xs ${getStatusColor()}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* 상태 정보 */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="text-xs space-y-1">
          <div><strong>Transport:</strong> {transport}</div>
          <div><strong>Error:</strong> {connectionError || 'None'}</div>
          <div><strong>URL:</strong> {socket?.io?.uri || 'Unknown'}</div>
        </div>
      </div>

      {/* 로그 */}
      <div className="max-h-64 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="p-3 text-gray-500 text-sm text-center">
            로그가 없습니다
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={`p-2 border-b border-gray-100 ${getLogColor(log.level)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-xs font-medium">{log.message}</div>
                  {log.data && (
                    <div className="text-xs mt-1 opacity-75">
                      {JSON.stringify(log.data, null, 2)}
                    </div>
                  )}
                </div>
                <div className="text-xs opacity-50 ml-2">
                  {log.timestamp}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="p-2 border-t border-gray-200 bg-gray-50">
        <button
          onClick={() => setLogs([])}
          className="text-xs text-gray-600 hover:text-gray-800"
        >
          로그 지우기
        </button>
      </div>
    </div>
  )
}

export default SocketDebugger
