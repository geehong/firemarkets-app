'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuthNew'
import AssetsEdit from '@/components/edit/AssetsEdit'
import OnChainEdit from '@/components/edit/OnChainEdit'

interface Asset {
  asset_id: number
  ticker: string
  name: string
  type_name: string
  exchange: string
  currency: string
  is_active: boolean
  description: string
  created_at: string
  updated_at: string
}

export default function AssetsEditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading, error, isAdmin } = useAuth()
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [loadingAsset, setLoadingAsset] = useState(false)
  const [alert, setAlert] = useState<{ type: string; message: string } | null>(null)



  // 특정 자산 정보 가져오기
  const fetchAssetById = useCallback(async (assetId: number) => {
    console.log('🚀 fetchAssetById called with assetId:', assetId)
    try {
      setLoadingAsset(true)
      console.log('📡 Fetching asset from API:', `https://backend.firemarkets.net/api/v1/assets/${assetId}`)
      const response = await fetch(`https://backend.firemarkets.net/api/v1/assets/${assetId}`)
      if (response.ok) {
        const assetData = await response.json()
        console.log('✅ Asset data received:', assetData)
        console.log('✅ Setting selectedAsset:', assetData)
        setSelectedAsset(assetData)
        // URL에서 assetId 파라미터 제거
        const url = new URL(window.location.href)
        url.searchParams.delete('assetId')
        window.history.replaceState({}, '', url.toString())
        console.log('🧹 URL cleaned, assetId parameter removed')
      } else {
        console.error('❌ Failed to fetch asset info, response not ok:', response.status)
        showAlert('error', 'Failed to fetch asset information')
      }
    } catch (err) {
      console.error('❌ Failed to fetch asset:', err)
      showAlert('error', 'Failed to fetch asset information')
    } finally {
      setLoadingAsset(false)
      console.log('🏁 fetchAssetById completed')
    }
  }, [])

  // URL 파라미터에서 assetId를 확인하여 편집 모드로 열기
  useEffect(() => {
    const assetId = searchParams?.get('assetId')
    
    // assetId가 있고, 아직 selectedAsset이 로드되지 않았을 때만 실행
    if (assetId && !selectedAsset) {
      console.log('✅ AssetId found, calling fetchAssetById with:', assetId)
      const parsedAssetId = parseInt(assetId)
      fetchAssetById(parsedAssetId)
    }
  }, [searchParams, fetchAssetById, selectedAsset])

  // 관리자 권한 확인
  useEffect(() => {
    if (!isAdmin && !loading) {
      router.push('/admin/signin')
    }
  }, [isAdmin, loading, router])

  const showAlert = (type: string, message: string) => {
    setAlert({ type, message })
    setTimeout(() => setAlert(null), 4000)
  }

  const handleBackToList = () => {
    router.push('/admin/appconfig/assets_editor')
  }

  const handleSaveAsset = (data: unknown) => {
    console.log('Asset saved:', data)
    showAlert('success', 'Asset saved successfully')
    // 실제 저장 로직 구현
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="mt-3 text-sm text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/signin')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  // assetId 파라미터가 없고 selectedAsset도 없으면 에러 표시
  const assetId = searchParams?.get('assetId')
  if (!assetId && !selectedAsset) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Access</h1>
          <p className="text-gray-600 mb-4">Asset ID is required to access this page.</p>
          <button
            onClick={() => router.push('/admin/appconfig/assets_editor')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Assets List
          </button>
        </div>
      </div>
    )
  }

  // 자산 로딩 중
  if (loadingAsset) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="mt-3 text-sm text-gray-600">Loading asset...</div>
        </div>
      </div>
    )
  }

  // 자산이 로드되지 않았으면 에러 표시
  if (!selectedAsset) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Asset Not Found</h1>
          <p className="text-gray-600 mb-4">The requested asset could not be found.</p>
          <button
            onClick={() => router.push('/admin/appconfig/assets_editor')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Assets List
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Edit Asset: {selectedAsset.name} ({selectedAsset.ticker})
              </h1>
              <p className="text-gray-600">
                Type: {selectedAsset.type_name} | Exchange: {selectedAsset.exchange}
              </p>
            </div>
            <button
              onClick={handleBackToList}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back to List
            </button>
          </div>
        </div>

        {/* Alert */}
        {alert && (
          <div className={`mb-6 p-4 rounded-md ${
            alert.type === 'success' ? 'bg-green-50 border border-green-200' :
            alert.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className={`text-sm ${
              alert.type === 'success' ? 'text-green-700' :
              alert.type === 'error' ? 'text-red-700' :
              'text-blue-700'
            }`}>
              {alert.message}
            </div>
          </div>
        )}

        {/* Asset Editor */}
        {(() => {
          console.log('🎯 Rendering editor for asset:', selectedAsset)
          console.log('🎯 Asset ID:', selectedAsset.asset_id)
          console.log('🎯 Asset type:', selectedAsset.type_name)
          console.log('🎯 Asset ticker:', selectedAsset.ticker)
          console.log('🎯 Asset name:', selectedAsset.name)
          
          const isOnChain = selectedAsset.type_name?.toLowerCase() === 'onchain'
          console.log('🎯 Is OnChain asset?', isOnChain)
          
          if (isOnChain) {
            console.log('🔗 Rendering OnChainEdit with postId:', selectedAsset.asset_id)
            return (
              <OnChainEdit
                postId={selectedAsset.asset_id}
                mode="create"
                onSave={handleSaveAsset}
                onCancel={handleBackToList}
              />
            )
          } else {
            console.log('💰 Rendering AssetsEdit with postId:', selectedAsset.asset_id)
            return (
              <AssetsEdit
                postId={selectedAsset.asset_id}
                mode="create"
                onSave={handleSaveAsset}
                onCancel={handleBackToList}
                categoryId={1}
                // authorId는 컴포넌트 내부에서 현재 사용자 정보로 자동 설정됨 (관리자/슈퍼관리자만 접근 가능)
                assetId={selectedAsset.asset_id}
              />
            )
          }
        })()}
      </div>
    </div>
  )
}
