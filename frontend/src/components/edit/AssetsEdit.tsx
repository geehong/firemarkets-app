'use client'

import React, { useState, useEffect } from 'react'
import BaseEdit, { BaseEditProps, PostFormState } from './BaseEdit'
// import { apiClient } from '@/lib/api' // 사용하지 않으므로 주석 처리

interface Asset {
  id: number
  symbol: string
  name: string
  price: number
  change_24h: number
}

interface AssetsEditProps extends Omit<BaseEditProps, 'postType'> {
  // AssetsEdit 특화 props
  selectedAssetId?: number
  onAssetSelect?: (asset: Asset) => void
}

export default function AssetsEdit({ 
  postId, 
  mode = 'create', 
  onSave,
  onCancel,
  selectedAssetId,
  onAssetSelect,
  ...props 
}: AssetsEditProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [loadingAssets, setLoadingAssets] = useState(false)

  // 자산 목록 불러오기
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoadingAssets(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'}/assets`)
        const data = await response.json()
        setAssets(data || [])
      } catch (error) {
        console.error('Failed to fetch assets:', error)
      } finally {
        setLoadingAssets(false)
      }
    }

    fetchAssets()
  }, [])

  // 선택된 자산 처리
  useEffect(() => {
    if (selectedAssetId && assets.length > 0) {
      const asset = assets.find(a => a.id === selectedAssetId)
      if (asset) {
        setSelectedAsset(asset)
      }
    }
  }, [selectedAssetId, assets])

  // AssetsEdit 특화 저장 로직
  const handleAssetsSave = (data: PostFormState) => {
    // 실제 API 구조에 맞춘 데이터 준비
    const assetsData = {
      ...data,
      post_type: 'assets' as const,
      // 자산 관련 데이터를 customFields에 포함
      customFields: {
        assetId: selectedAsset?.id || null,
        assetSymbol: selectedAsset?.symbol || '',
        assetName: selectedAsset?.name || '',
        assetPrice: selectedAsset?.price || 0,
        assetChange24h: selectedAsset?.change_24h || 0,
        syncWithAsset: !!selectedAsset,
        autoSyncContent: !!selectedAsset,
        // 자산 정보를 description에 추가
        assetDescription: selectedAsset ? {
          ko: `[Asset Data]\nSymbol: ${selectedAsset.symbol}\nName: ${selectedAsset.name}\nPrice: $${selectedAsset.price.toFixed(2)}\n24h Change: ${selectedAsset.change_24h >= 0 ? '+' : ''}${selectedAsset.change_24h.toFixed(2)}%`,
          en: `[Asset Data]\nSymbol: ${selectedAsset.symbol}\nName: ${selectedAsset.name}\nPrice: $${selectedAsset.price.toFixed(2)}\n24h Change: ${selectedAsset.change_24h >= 0 ? '+' : ''}${selectedAsset.change_24h.toFixed(2)}%`
        } : null
      }
    }
    
    console.log('💰 Assets data prepared:', {
      assetId: selectedAsset?.id,
      symbol: selectedAsset?.symbol,
      name: selectedAsset?.name,
      price: selectedAsset?.price,
      change24h: selectedAsset?.change_24h
    })
    
    if (onSave) {
      onSave(assetsData)
    }
  }

  // 자산 선택 핸들러
  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset)
    if (onAssetSelect) {
      onAssetSelect(asset)
    }
  }

  return (
    <div>
      {/* 자산 선택 섹션 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">연결할 자산 선택</h3>
        
        {loadingAssets ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => handleAssetSelect(asset)}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedAsset?.id === asset.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-lg">{asset.symbol}</h4>
                    <p className="text-sm text-gray-600">{asset.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${asset.price.toFixed(2)}</p>
                    <p className={`text-sm ${
                      asset.change_24h >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {asset.change_24h >= 0 ? '+' : ''}{asset.change_24h.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {selectedAsset && (
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              선택된 자산: <strong>{selectedAsset.symbol}</strong> - {selectedAsset.name}
            </p>
          </div>
        )}
      </div>

      {/* 기본 에디터 */}
      <BaseEdit
        postId={postId}
        mode={mode}
        postType="assets"
        onSave={handleAssetsSave}
        onCancel={onCancel}
        {...props}
      />
    </div>
  )
}
