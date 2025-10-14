"use client"

import React, { useState } from 'react'

interface TestResult {
  url: string
  status: 'testing' | 'success' | 'error'
  response?: string
  error?: string
  duration?: number
}

const NetworkTester: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([])
  const [isTesting, setIsTesting] = useState(false)

  // 디버그 컴포넌트 비활성화
  return null

  const testUrls = [
    {
      name: 'Socket.IO (localhost)',
      url: 'http://localhost:8001/socket.io/?EIO=4&transport=polling',
      expectedStatus: [200, 400] // Socket.IO는 400도 정상
    },
    {
      name: 'Socket.IO (backend)',
      url: 'https://backend.firemarkets.net/socket.io/?EIO=4&transport=polling',
      expectedStatus: [200, 400] // Socket.IO는 400도 정상
    },
    {
      name: 'API Health Check',
      url: 'https://backend.firemarkets.net/api/v1/',
      expectedStatus: [200, 404] // API 루트 확인
    },
    {
      name: 'Frontend',
      url: 'https://firemarkets.net',
      expectedStatus: [200]
    },
  ]

  const testConnection = async (testItem: { name: string; url: string; expectedStatus: number[] }): Promise<TestResult> => {
    const startTime = Date.now()
    
    try {
      const response = await fetch(testItem.url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
      })
      
      const duration = Date.now() - startTime
      const responseText = await response.text()
      
      // 예상 상태 코드에 포함되면 성공으로 처리
      const isExpectedStatus = testItem.expectedStatus.includes(response.status)
      
      return {
        url: `${testItem.name}: ${testItem.url}`,
        status: isExpectedStatus ? 'success' : 'error',
        response: `${response.status} ${response.statusText} ${isExpectedStatus ? '(Expected)' : '(Unexpected)'}`,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      return {
        url: `${testItem.name}: ${testItem.url}`,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      }
    }
  }

  const runTests = async () => {
    setIsTesting(true)
    setResults([])

    for (const testItem of testUrls) {
      // 테스트 시작 표시
      setResults(prev => [...prev, { url: `${testItem.name}: ${testItem.url}`, status: 'testing' }])
      
      const result = await testConnection(testItem)
      
      // 결과 업데이트
      setResults(prev => 
        prev.map(r => r.url === result.url ? result : r)
      )
    }
    
    setIsTesting(false)
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'testing': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'testing': return '🔄'
      default: return '⏸️'
    }
  }

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">네트워크 연결 테스트</h3>
        <button
          onClick={runTests}
          disabled={isTesting}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            isTesting 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isTesting ? '테스트 중...' : '테스트 실행'}
        </button>
      </div>

      <div className="space-y-2">
        {results.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">
            테스트를 실행하여 연결 상태를 확인하세요
          </div>
        ) : (
          results.map((result, index) => (
            <div key={index} className={`p-3 rounded-lg ${getStatusColor(result.status)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span>{getStatusIcon(result.status)}</span>
                  <span className="font-medium text-sm">{result.url}</span>
                </div>
                {result.duration && (
                  <span className="text-xs opacity-75">
                    {result.duration}ms
                  </span>
                )}
              </div>
              
              {result.response && (
                <div className="text-xs mt-1 opacity-75">
                  Response: {result.response}
                </div>
              )}
              
              {result.error && (
                <div className="text-xs mt-1 opacity-75">
                  Error: {result.error}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 환경 정보 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium mb-2">환경 정보</h4>
        <div className="text-xs space-y-1 text-gray-600">
          <div><strong>User Agent:</strong> {navigator.userAgent}</div>
          <div><strong>Screen:</strong> {window.innerWidth}x{window.innerHeight}</div>
          <div><strong>Protocol:</strong> {window.location.protocol}</div>
          <div><strong>Hostname:</strong> {window.location.hostname}</div>
          <div><strong>Port:</strong> {window.location.port || 'default'}</div>
          <div><strong>Online:</strong> {navigator.onLine ? 'Yes' : 'No'}</div>
        </div>
      </div>
    </div>
  )
}

export default NetworkTester
