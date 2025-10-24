'use client'

import React from 'react'

interface SyncSettingsProps {
  assetId: number | null
  onAssetIdChange: (assetId: number | null) => void
  syncWithAsset: boolean
  onSyncWithAssetChange: (syncWithAsset: boolean) => void
  autoSyncContent: boolean
  onAutoSyncContentChange: (autoSyncContent: boolean) => void
  ticker?: string
  onTickerChange?: (ticker: string) => void
}

export default function SyncSettings({
  assetId,
  onAssetIdChange,
  syncWithAsset,
  onSyncWithAssetChange,
  autoSyncContent,
  onAutoSyncContentChange,
  ticker = '',
  onTickerChange
}: SyncSettingsProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b px-4 py-3 bg-gray-50">
        <h3 className="font-semibold text-gray-900">동기화 설정</h3>
      </div>
      <div className="p-4 space-y-3">
        {onTickerChange && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ticker
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => onTickerChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="BTC, ETH, AAPL"
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Asset ID
          </label>
          <input
            type="number"
            value={assetId ?? ''}
            onChange={(e) => onAssetIdChange(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="연동할 Asset ID"
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={syncWithAsset}
            onChange={(e) => onSyncWithAssetChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label className="ml-2 text-sm text-gray-700">
            Asset과 동기화
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={autoSyncContent}
            onChange={(e) => onAutoSyncContentChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label className="ml-2 text-sm text-gray-700">
            자동 콘텐츠 동기화
          </label>
        </div>
        
        {syncWithAsset && (
          <div className="mt-3 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-700">
              💡 Asset과 동기화하면 실시간 가격 정보가 자동으로 업데이트됩니다.
            </p>
          </div>
        )}
        
        {autoSyncContent && (
          <div className="mt-3 p-3 bg-green-50 rounded-md">
            <p className="text-sm text-green-700">
              🔄 자동 콘텐츠 동기화가 활성화되어 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
