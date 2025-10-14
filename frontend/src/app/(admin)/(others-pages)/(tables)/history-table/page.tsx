"use client"

import React, { useState } from 'react'
import SimpleHistoryTable from '@/components/tables/SimpleHistoryTable'
import AgGridHistoryTable from '@/components/tables/AgGridHistoryTable'

export default function HistoryTablePage() {
  const [asset, setAsset] = useState('BTCUSDT')
  const [impl, setImpl] = useState<'simple' | 'aggrid'>('aggrid')
  const [interval, setInterval] = useState<'1d' | '1w' | '1m'>('1d')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">History Table</h1>
        <p className="text-gray-600">OHLCV 이력 테이블</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Asset</label>
          <input
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className="w-full md:w-60 rounded border px-3 py-2"
            placeholder="BTCUSDT"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Implementation</label>
          <select
            value={impl}
            onChange={(e) => setImpl(e.target.value as any)}
            className="w-full md:w-60 rounded border px-3 py-2"
          >
            <option value="aggrid">AG Grid</option>
            <option value="simple">Simple</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Interval</label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value as any)}
            className="w-full md:w-60 rounded border px-3 py-2"
          >
            <option value="1d">1D</option>
            <option value="1w">1W</option>
            <option value="1m">1M</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        {impl === 'aggrid' ? (
          <AgGridHistoryTable assetIdentifier={asset} dataInterval={interval} />
        ) : (
          <SimpleHistoryTable assetIdentifier={asset} initialInterval={interval} />
        )}
      </div>
    </div>
  )
}


