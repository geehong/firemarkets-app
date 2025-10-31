'use client'

import React, { useState, useEffect } from 'react'
import BaseEdit, { BaseEditProps, PostFormState } from './BaseEdit'
import PublishingBlock from './editorblock/PublishingBlock'
import ContentBlock from './editorblock/ContentBlock'
import SEOSettings from './editorblock/SEOSettings'
import SyncSettings from './editorblock/SyncSettings'
import { useAssets } from '@/hooks/useAssets'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/hooks/useAuthNew'

interface Asset {
  asset_id: number
  ticker: string
  name: string
  type_name: string
  exchange: string
  currency: string
  is_active: boolean
  description: string
  data_source: string
  created_at: string
  updated_at: string
  // 추가 필드들
  id: number
  symbol: string
  price: number
  change_24h: number
}

interface FinancialData {
  financial_id: number
  asset_id: number
  snapshot_date: string
  currency: string
  market_cap: number
  ebitda: number | null
  shares_outstanding: number
  pe_ratio: number
  peg_ratio: number | null
  beta: number
  eps: number
  dividend_yield: number | null
  dividend_per_share: number
  profit_margin_ttm: number | null
  return_on_equity_ttm: number | null
  revenue_ttm: number | null
  price_to_book_ratio: number | null
  week_52_high: number
  week_52_low: number
  day_50_moving_avg: number
  day_200_moving_avg: number
  updated_at: string
}

interface AssetsEditProps extends Omit<BaseEditProps, 'postType'> {
  // AssetsEdit 특화 props
  categoryId?: number
  authorId?: number
  assetId?: number // 자산 ID 추가
}

export default function AssetsEdit({
  postId,
  mode = 'create',
  onSave,
  onCancel,
  categoryId,
  authorId,
  assetId,
  ...props 
}: AssetsEditProps) {
  console.log('🚀 AssetsEdit - Component initialized with:', { postId, mode, categoryId, authorId, assetId })
  // assetIdentifier만 관리 (BaseEdit에서 assetData를 useAssetOverviewBundle로 가져옴)
  const [assetIdentifier, setAssetIdentifier] = useState<string | null>(null)
  // BaseEdit에서 받아올 assetData를 저장할 상태 (BaseEdit 콜백으로 받음)
  const [assetDataFromBase, setAssetDataFromBase] = useState<any>(null)

  // 현재 사용자 정보 가져오기 (authorId가 없을 경우 사용)
  const { user } = useAuth()
  const currentUserId = user?.user_id || user?.id || null
  
  // BaseEdit에서 사용할 상태들
  // authorId는 prop으로 받거나, 없으면 현재 사용자 ID 사용 (관리자/슈퍼관리자만 접근 가능)
  const effectiveAuthorId = authorId || currentUserId
  
  const [formData, setFormData] = useState<PostFormState>({
    title: { ko: '', en: '' },
    content: '',
    content_ko: '',
    description: { ko: '', en: '' },
    excerpt: { ko: '', en: '' },
    slug: '',
    status: 'draft',
    featured: false,
    post_type: 'assets',
    view_count: 0,
    author_id: effectiveAuthorId || null,
    category_id: categoryId || null,
    cover_image: null,
    cover_image_alt: null,
    keywords: null,
    canonical_url: null,
    meta_title: { ko: '', en: '' },
    meta_description: { ko: '', en: '' },
    read_time_minutes: null,
    sync_with_asset: false,
    auto_sync_content: false,
    asset_id: null,
    post_parent: null,
    menu_order: 0,
    comment_count: 0,
    post_password: null,
    ping_status: 'open',
    last_sync_at: null,
    sync_status: 'pending',
    // author와 category 객체 초기화
    author: null,
    category: null,
    tags: []
  })

  const [activeLanguage, setActiveLanguage] = useState<'ko' | 'en'>('ko')
  const [saving] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  
  // BaseEdit에서 이미 useAssetOverviewBundle을 호출하므로 중복 제거
  // assetBundle 데이터는 BaseEdit의 assetData를 props로 받아서 사용
  
  // 드롭다운용 자산 목록은 useAssets 훅 사용 (컴포넌트에서 직접 API 호출 대신)
  const { data: assetsData, loading: assetsLoading, error: assetsError } = useAssets({
    limit: 100,
    offset: 0
  })
  
  // useAssets 훅의 응답 구조에 맞게 변환
  const assets: Asset[] = assetsData?.data || assetsData || []

  console.log('🔍 AssetsEdit - Current state:', {
    assetIdentifier,
    assetId,
    assetsCount: assets.length,
    formData: {
      asset_id: formData.asset_id,
      title: formData.title,
      content: formData.content,
      slug: formData.slug
    }
  })

  // 폼 데이터 업데이트 함수
  const updateFormData = (field: keyof PostFormState, value: string | number | boolean | string[] | { ko: string; en: string } | null) => {
    setFormData((prev: PostFormState) => ({
      ...prev,
      [field]: value
    }))
  }

  // BaseEdit에서 assetData를 props로 받아서 assetInfo 설정
  // BaseEdit의 assetData.numeric_overview를 사용하므로 별도 처리는 필요 없음

  // assetId prop이 있으면 assetIdentifier 설정
  useEffect(() => {
    if (assetId) {
      console.log('✅ AssetsEdit - Setting assetIdentifier from assetId prop:', assetId.toString())
      setAssetIdentifier(assetId.toString())
    }
  }, [assetId])

  // formData.asset_id가 설정되면 assetIdentifier도 동기화
  useEffect(() => {
    console.log('🔍 AssetsEdit - formData.asset_id changed:', formData.asset_id)
    if (formData.asset_id) {
      console.log('✅ AssetsEdit - Setting assetIdentifier to:', formData.asset_id.toString())
      setAssetIdentifier(formData.asset_id.toString())
    }
  }, [formData.asset_id])

  // assetData는 BaseEdit에서 받아오므로 여기서는 assetIdentifier만 관리

  // 재무 정보 저장 함수 (자산 개요 정보 업데이트)
  // apiClient를 사용하여 아키텍처 일관성 유지
  const saveFinancialData = async (data: Partial<FinancialData>) => {
    try {
      if (!formData.asset_id && !assetIdentifier) {
        throw new Error('Asset ID is required to save financial data')
      }
      
      const assetIdToUse = assetIdentifier || formData.asset_id?.toString()
      if (!assetIdToUse) {
        throw new Error('Asset identifier is required')
      }
      
      const result = await apiClient.updateAssetOverview(assetIdToUse, data)
      console.log('Financial data saved:', result)
      
      // assetInfo는 BaseEdit의 assetData를 사용하므로 별도 업데이트 불필요
      // BaseEdit에서 자동으로 refetch됨
      
      return result
    } catch (error) {
      console.error('Failed to save financial data:', error)
      throw error
    }
  }

  // 자산 저장 핸들러
  const handleAssetsSave = (data: PostFormState) => {
    console.log('💰 Assets save triggered:', data)
    
    // 자산 특화 데이터 처리
    const assetsData = {
      ...data,
      post_type: 'assets' as const,
      // 자산 특화 필드들은 customFields에 포함
      customFields: {
        assetId: selectedAsset?.id || null,
        assetSymbol: selectedAsset?.symbol || '',
        assetName: selectedAsset?.name || '',
        assetPrice: selectedAsset?.price || 0,
        assetChange24h: selectedAsset?.change_24h || 0,
        syncWithAsset: !!selectedAsset,
        autoSyncContent: !!selectedAsset,
        assetDescription: selectedAsset ? {
          ko: `[Asset Data]\nSymbol: ${selectedAsset.symbol}\nName: ${selectedAsset.name}\nPrice: $${selectedAsset.price.toFixed(2)}\n24h Change: ${selectedAsset.change_24h >= 0 ? '+' : ''}${selectedAsset.change_24h.toFixed(2)}%`,
          en: `[Asset Data]\nSymbol: ${selectedAsset.symbol}\nName: ${selectedAsset.name}\nPrice: $${selectedAsset.price.toFixed(2)}\n24h Change: ${selectedAsset.change_24h >= 0 ? '+' : ''}${selectedAsset.change_24h.toFixed(2)}%`
        } : null
      }
    }
    
    if (onSave) {
      onSave(assetsData)
    }
  }

  // 에러 상태는 BaseEdit에서 처리하므로 여기서는 제거

  return (
    <BaseEdit
      postId={postId}
      mode={mode}
      postType="assets"
      onSave={handleAssetsSave}
      onCancel={onCancel}
      showFinancialData={true}
      financialTicker={assetDataFromBase?.numeric_overview?.ticker}
      financialAssetId={assetDataFromBase?.numeric_overview?.asset_id || formData.asset_id}
      financialData={assetDataFromBase?.numeric_overview || null}
      onSaveFinancial={saveFinancialData}
      showAssetInfo={true}
      assetIdentifier={assetIdentifier}
      onActiveLanguageChange={setActiveLanguage}
      // BaseEdit의 assetData를 받기 위한 콜백 (BaseEdit에 이 prop을 추가해야 함)
      onAssetDataChange={setAssetDataFromBase}
      {...props}
    >
      {/* 퍼블리싱 블럭 */}
      <PublishingBlock
        status={formData.status}
        onStatusChange={(status) => updateFormData('status', status)}
        onPreview={() => console.log('미리보기')}
        onPublish={() => handleAssetsSave({ ...formData, status: 'published' })}
        onSaveDraft={() => handleAssetsSave({ ...formData, status: 'draft' })}
        saving={saving}
      />

      {/* 작성내용 블럭 */}
      <ContentBlock
        postType={formData.post_type}
        onPostTypeChange={(postType) => updateFormData('post_type', postType)}
        authorId={formData.author_id || null}
        authorUsername={formData.author?.username || null}
        categoryId={formData.category_id || null}
        onCategoryIdChange={(categoryId) => updateFormData('category_id', categoryId)}
        postParent={formData.post_parent || null}
        onPostParentChange={(postParent) => updateFormData('post_parent', postParent)}
        postPassword={formData.post_password || null}
        onPostPasswordChange={(postPassword) => updateFormData('post_password', postPassword)}
        featured={formData.featured}
        onFeaturedChange={(featured) => updateFormData('featured', featured)}
      />


      {/* 동기화 설정 */}
      <SyncSettings
        assetId={assetDataFromBase?.numeric_overview?.asset_id || formData.asset_id || null}
        onAssetIdChange={(assetId) => {
          updateFormData('asset_id', assetId)
          setAssetIdentifier(assetId?.toString() || null)
        }}
        syncWithAsset={formData.sync_with_asset || false}
        onSyncWithAssetChange={(syncWithAsset) => updateFormData('sync_with_asset', syncWithAsset)}
        autoSyncContent={formData.auto_sync_content || false}
        onAutoSyncContentChange={(autoSyncContent) => updateFormData('auto_sync_content', autoSyncContent)}
        ticker={assetDataFromBase?.numeric_overview?.ticker || selectedAsset?.symbol || formData.slug}
        onTickerChange={(ticker) => {
          // Ticker 변경 시 해당 Asset 찾기
          const asset = assets.find(a => a.ticker === ticker || a.symbol === ticker)
          if (asset) {
            setSelectedAsset(asset)
            setAssetIdentifier(asset.asset_id.toString())
            updateFormData('asset_id', asset.asset_id)
          }
        }}
      />

      {/* SEO 설정 */}
      <SEOSettings
        keywords={formData.keywords}
        onKeywordsChange={(keywords) => updateFormData('keywords', keywords)}
        metaTitle={formData.meta_title}
        onMetaTitleChange={(metaTitle) => updateFormData('meta_title', metaTitle)}
        metaDescription={formData.meta_description}
        onMetaDescriptionChange={(metaDescription) => updateFormData('meta_description', metaDescription)}
        canonicalUrl={formData.canonical_url}
        onCanonicalUrlChange={(canonicalUrl) => updateFormData('canonical_url', canonicalUrl)}
        activeLanguage={activeLanguage}
      />
    </BaseEdit>
  )
}
