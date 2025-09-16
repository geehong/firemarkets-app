import { useState, useEffect, useCallback } from 'react'

const LOG_STORAGE_KEY = 'ticker_execution_logs'
const MAX_LOG_ENTRIES = 1000 // 최대 로그 개수 제한

export const useLogManager = () => {
  const [logs, setLogs] = useState([])

  // 로컬 스토리지에서 로그 복원
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem(LOG_STORAGE_KEY)
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs)

        // 기존 로그들의 키를 새로운 형식으로 업데이트
        const updatedLogs = parsedLogs.map((log, index) => ({
          ...log,
          id:
            log.id && typeof log.id === 'string' && log.id.startsWith('log_')
              ? log.id
              : `log_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        }))

        setLogs(updatedLogs)

        // 업데이트된 로그를 다시 저장
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updatedLogs))
      }
    } catch (error) {
      console.error('로그 복원 실패:', error)
    }
  }, [])

  // 로그 추가 함수
  const addLog = useCallback((logEntry) => {
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...logEntry,
    }

    setLogs((prevLogs) => {
      const updatedLogs = [newLog, ...prevLogs].slice(0, MAX_LOG_ENTRIES)

      // 로컬 스토리지에 저장
      try {
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updatedLogs))
      } catch (error) {
        console.error('로그 저장 실패:', error)
      }

      return updatedLogs
    })
  }, [])

  // 로그 초기화 함수
  const clearLogs = useCallback(() => {
    setLogs([])
    try {
      localStorage.removeItem(LOG_STORAGE_KEY)
    } catch (error) {
      console.error('로그 초기화 실패:', error)
    }
  }, [])

  // 특정 시간 이후의 로그만 가져오기
  const getLogsSince = useCallback(
    (timestamp) => {
      return logs.filter((log) => new Date(log.timestamp) > new Date(timestamp))
    },
    [logs],
  )

  return {
    logs,
    addLog,
    clearLogs,
    getLogsSince,
  }
}
