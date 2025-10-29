'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import BlogEditor from '@/components/blog/editor/BlogEditor'
import AssetsEdit from '@/components/edit/AssetsEdit'
import OnChainEdit from '@/components/edit/OnChainEdit'

interface AssetInfo {
  asset_id: number
  ticker: string
  name: string
  type_name: string
  asset_type_id: number
  exchange: string
  currency: string
  is_active: boolean
  description: string
  data_source: string
  created_at: string
  updated_at: string
  collection_settings: any
}

const TickerEditorPage = () => {
  const params = useParams()
  const tickerId = params?.id ? parseInt(params.id as string, 10) : undefined
  const [assetInfo, setAssetInfo] = useState<AssetInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 자산 정보 가져오기
  useEffect(() => {
    if (!tickerId || isNaN(tickerId)) {
      setLoading(false)
      return
    }

    const fetchAssetInfo = async () => {
      try {
        setLoading(true)
        const response = await fetch(`https://backend.firemarkets.net/api/v1/assets/${tickerId}`)
        
        if (!response.ok) {
          throw new Error(`Asset not found: ${response.status}`)
        }
        
        const data = await response.json()
        setAssetInfo(data)
      } catch (err) {
        console.error('Failed to fetch asset info:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch asset information')
      } finally {
        setLoading(false)
      }
    }

    fetchAssetInfo()
  }, [tickerId])

  if (!tickerId || isNaN(tickerId)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
        <h1 className="text-4xl font-bold mb-4">404 - Ticker Not Found</h1>
        <p className="text-lg mb-8">The ticker you are looking for does not exist or the ID is invalid.</p>
        <a href="/admin/appconfig" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Back to Admin Panel
        </a>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-lg">Loading asset information...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
        <h1 className="text-4xl font-bold mb-4">Error</h1>
        <p className="text-lg mb-8">{error}</p>
        <a href="/admin/appconfig" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Back to Admin Panel
        </a>
      </div>
    )
  }

  if (!assetInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white">
        <h1 className="text-4xl font-bold mb-4">Asset Not Found</h1>
        <p className="text-lg mb-8">The asset information could not be loaded.</p>
        <a href="/admin/appconfig" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Back to Admin Panel
        </a>
      </div>
    )
  }

  // 자산 타입에 따라 적절한 편집 컴포넌트 선택
  const renderEditor = () => {
    const assetType = assetInfo.type_name?.toLowerCase()
    
    console.log('Asset type:', assetType) // 디버깅용
    
    switch (assetType) {
      case 'stocks':
      case 'etfs':
      case 'funds':
      case 'commodities':
      case 'crypto':
        return (
          <AssetsEdit
            postId={undefined}
            mode="create"
            onSave={(data) => {
              console.log('Assets data saved:', data)
              // 실제 저장 로직 구현
            }}
            onCancel={() => {
              window.history.back()
            }}
            categoryId={1} // 기본 카테고리
            authorId={1} // 기본 작성자
            assetId={assetInfo?.asset_id}
          />
        )
      
      case 'onchain':
        return (
          <OnChainEdit
            postId={undefined}
            mode="create"
            onSave={(data) => {
              console.log('OnChain data saved:', data)
              // 실제 저장 로직 구현
            }}
            onCancel={() => {
              window.history.back()
            }}
          />
        )
      
      default:
        // 기본적으로 BlogEditor 사용 (기존 동작)
        return <BlogEditor tickerId={tickerId} mode="ticker" />
    }
  }

  return (
    <div>
      {/* 자산 정보 헤더 */}
      <div className="bg-white border-b px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {assetInfo.name} ({assetInfo.ticker})
            </h1>
            <p className="text-gray-600">
              Asset Type: {assetInfo.type_name} | ID: {assetInfo.asset_id} | Exchange: {assetInfo.exchange}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {assetInfo.type_name?.toLowerCase() === 'onchain' ? '🔗 OnChain Editor' : 
             ['stocks', 'etfs', 'funds', 'commodities', 'crypto'].includes(assetInfo.type_name?.toLowerCase()) ? '📊 Assets Editor' : 
             '📝 Blog Editor'}
          </div>
        </div>
      </div>

      {/* 적절한 편집 컴포넌트 렌더링 */}
      {renderEditor()}
    </div>
  )
}

export default TickerEditorPage
