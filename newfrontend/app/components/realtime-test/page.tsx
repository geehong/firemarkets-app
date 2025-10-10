"use client"

import React from 'react'
import { useBroadcastData, useRealtimePrices } from '@/hooks/useSocket'

export default function RealtimeTestPage() {
  const { latestPrice, priceHistory, isConnected } = useRealtimePrices('BTCUSDT')
  const { broadcastData, isConnected: broadcastConnected } = useBroadcastData()

  // 디버깅 정보
  console.log('🔍 RealtimeTestPage 렌더링:', {
    latestPrice,
    priceHistoryLength: priceHistory.length,
    isConnected,
    broadcastDataLength: broadcastData.length,
    broadcastConnected
  })

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">실시간 데이터 테스트</h1>
      
      {/* 연결 상태 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">연결 상태</h2>
          <div className="space-y-2">
            <div className={`p-3 rounded ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <strong>BTCUSDT 실시간:</strong> {isConnected ? '연결됨' : '연결 끊김'}
            </div>
            <div className={`p-3 rounded ${broadcastConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <strong>브로드캐스트:</strong> {broadcastConnected ? '연결됨' : '연결 끊김'}
            </div>
          </div>
        </div>

        {/* 최신 가격 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">BTCUSDT 최신 가격</h2>
          {latestPrice ? (
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">
                ${latestPrice.price.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                볼륨: {latestPrice.volume.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                시간: {new Date(latestPrice.timestamp).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                소스: {latestPrice.dataSource}
              </div>
            </div>
          ) : (
            <div className="text-gray-500">데이터 대기 중...</div>
          )}
        </div>
      </div>

      {/* 가격 히스토리 */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">가격 히스토리 (최근 10개)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">시간</th>
                <th className="px-4 py-2 text-left">가격</th>
                <th className="px-4 py-2 text-left">볼륨</th>
                <th className="px-4 py-2 text-left">소스</th>
              </tr>
            </thead>
            <tbody>
              {priceHistory.slice(-10).reverse().map((price, index) => (
                <tr key={index} className="border-b">
                  <td className="px-4 py-2">{new Date(price.timestamp).toLocaleTimeString()}</td>
                  <td className="px-4 py-2 font-mono">${price.price.toLocaleString()}</td>
                  <td className="px-4 py-2">{price.volume.toLocaleString()}</td>
                  <td className="px-4 py-2">{price.dataSource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 브로드캐스트 데이터 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">브로드캐스트 데이터 (최근 20개)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">심볼</th>
                <th className="px-4 py-2 text-left">가격</th>
                <th className="px-4 py-2 text-left">볼륨</th>
                <th className="px-4 py-2 text-left">시간</th>
                <th className="px-4 py-2 text-left">소스</th>
              </tr>
            </thead>
            <tbody>
              {broadcastData.slice(-20).reverse().map((data, index) => (
                <tr key={index} className="border-b">
                  <td className="px-4 py-2 font-mono">{data.ticker}</td>
                  <td className="px-4 py-2 font-mono">${data.price.toLocaleString()}</td>
                  <td className="px-4 py-2">{data.volume.toLocaleString()}</td>
                  <td className="px-4 py-2">{new Date(data.timestamp).toLocaleTimeString()}</td>
                  <td className="px-4 py-2">{data.dataSource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
