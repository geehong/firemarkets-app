'use client'

import React, { useState, useEffect, useRef } from 'react'
import { apiClient } from '@/lib/api'

interface RealTimeLogEntry {
  timestamp: string
  level: string
  message: string
  source: string
}

const RealTimeLogs: React.FC = () => {
  const [logs, setLogs] = useState<RealTimeLogEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  // const wsRef = useRef<WebSocket | null>(null) // Removed as WebSocket is no longer used

  // 자동 스크롤
  const scrollToBottom = () => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [logs, autoScroll])

  // 폴링 방식으로 로그 업데이트
  useEffect(() => {
    let intervalId: NodeJS.Timeout
    let lastLogId = 0

    const fetchLogs = async () => {
      try {
        // 시스템 로그 API를 사용하여 최신 로그 가져오기
        const data = await apiClient.getSystemLogs({ limit: 20 })

        if (data && data.length > 0) {
          // 최신 로그를 실시간 로그 형식으로 변환
          // ID가 lastLogId보다 큰 것만 필터링 (중복 방지)
          // 하지만 초기 로드 시에는 모두 보여줌

          const newLogs: RealTimeLogEntry[] = data
            .filter((log: any) => log.id > lastLogId)
            .map((log: any) => ({
              timestamp: log.timestamp,
              level: log.level,
              message: log.message,
              source: log.module || 'system'
            }))
            .reverse() // 최신순으로 오므로 역순으로 정렬하여 시간순 표시

          if (newLogs.length > 0) {
            setLogs(prev => {
              const combined = [...prev, ...newLogs]
              return combined.slice(-1000) // 최대 1000개 유지
            })
            lastLogId = Math.max(...data.map((l: any) => l.id), lastLogId)
          }

          setIsConnected(true)
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error)
        setIsConnected(false)
      }
    }

    // 초기 로드
    fetchLogs()

    // 3초마다 폴링
    intervalId = setInterval(fetchLogs, 3000)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [])

  // 필터링된 로그
  const filteredLogs = React.useMemo(() => {
    if (filterLevel === 'all') return logs
    return logs.filter(log => log.level === filterLevel)
  }, [logs, filterLevel])

  // 레벨별 색상
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'CRITICAL':
        return 'text-red-600 bg-red-50'
      case 'WARNING':
        return 'text-yellow-600 bg-yellow-50'
      case 'INFO':
        return 'text-blue-600 bg-blue-50'
      case 'DEBUG':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  // 시간 포맷팅
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  // 로그 클리어
  const clearLogs = () => {
    setLogs([])
  }

  // 테스트 로그 추가 (개발용)
  const addTestLog = () => {
    const testLog: RealTimeLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'Test log message from frontend',
      source: 'frontend'
    }
    setLogs(prev => [...prev, testLog])
  }

  return (
    <div className="space-y-4">
      {/* 컨트롤 패널 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={filterLevel}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterLevel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="ERROR">Error</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
            <option value="DEBUG">Debug</option>
            <option value="CRITICAL">Critical</option>
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto Scroll
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={addTestLog}
            className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            Add Test Log
          </button>
          <button
            onClick={clearLogs}
            className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* 연결 상태 */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-gray-600">
          {isConnected ? 'Connected (Polling)' : 'Disconnected'}
        </span>
      </div>

      {/* 로그 표시 영역 */}
      <div className="bg-black text-green-400 font-mono text-sm rounded-lg p-4 h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            Waiting for logs...
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-gray-500 text-xs whitespace-nowrap">
                  {formatTime(log.timestamp)}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getLevelColor(log.level)}`}>
                  {log.level}
                </span>
                <span className="text-gray-400 text-xs">
                  [{log.source}]
                </span>
                <span className="text-green-400 flex-1 break-words">
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* 통계 */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <div>
          Showing {filteredLogs.length} of {logs.length} logs
        </div>
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            Error: {logs.filter(l => l.level === 'ERROR' || l.level === 'CRITICAL').length}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
            Warning: {logs.filter(l => l.level === 'WARNING').length}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Info: {logs.filter(l => l.level === 'INFO').length}
          </span>
        </div>
      </div>
    </div>
  )
}

export default RealTimeLogs
