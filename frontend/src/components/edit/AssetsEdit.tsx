'use client'

import React, { useState, useEffect } from 'react'
import BaseEdit, { BaseEditProps, PostFormState } from './BaseEdit'
import PublishingBlock from './editorblock/PublishingBlock'
import ContentBlock from './editorblock/ContentBlock'
import SEOSettings from './editorblock/SEOSettings'
import SyncSettings from './editorblock/SyncSettings'
import { useAssetOverviewBundle } from '@/hooks/useAssetOverviewBundle'

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
}

export default function AssetsEdit({
  postId,
  mode = 'create',
  onSave,
  onCancel,
  categoryId,
  authorId,
  ...props 
}: AssetsEditProps) {
  // 자산 정보와 재무 정보 상태
  const [assetInfo, setAssetInfo] = useState<Asset | null>(null)
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [assetIdentifier, setAssetIdentifier] = useState<string | null>(null)

  // BaseEdit에서 사용할 상태들
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
    author_id: authorId || null,
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

  const [activeLanguage] = useState<'ko' | 'en'>('ko')
  const [saving] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(false)

  // 자산 개요 번들 훅 사용
  const { data: assetBundle, loading: assetBundleLoading, error: assetBundleError } = useAssetOverviewBundle(
    assetIdentifier || '',
    { initialData: undefined }
  )

  // 폼 데이터 업데이트 함수
  const updateFormData = (field: keyof PostFormState, value: string | number | boolean | string[] | { ko: string; en: string } | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 포스트 데이터 가져오기 (편집 모드일 때만)
  useEffect(() => {
    const fetchPostData = async () => {
      if (!postId || mode !== 'edit') return
      
      try {
        console.log('📡 AssetsEdit - Fetching post data for ID:', postId)
        const postResponse = await fetch(`https://backend.firemarkets.net/api/v1/posts/asset/${postId}`)
        if (!postResponse.ok) {
          throw new Error('Failed to fetch asset post info')
        }
        const postData = await postResponse.json()
        console.log('✅ AssetsEdit - Asset post data received:', postData)
        
        // 포스트 데이터가 배열로 반환되므로 첫 번째 항목 사용
        const assetPost = Array.isArray(postData) ? postData[0] : postData
        if (assetPost) {
          // 포스트 데이터를 formData에 설정
          setFormData(prev => ({
            ...prev,
            title: assetPost.title || { ko: '', en: '' },
            content: assetPost.content || '',
            content_ko: assetPost.content_ko || '',
            description: assetPost.description || { ko: '', en: '' },
            excerpt: assetPost.excerpt || { ko: '', en: '' },
            slug: assetPost.slug || '',
            status: assetPost.status || 'draft',
            featured: assetPost.featured || false,
            author_id: assetPost.author_id || null,
            category_id: assetPost.category_id || null,
            cover_image: assetPost.cover_image || null,
            cover_image_alt: assetPost.cover_image_alt || null,
            keywords: assetPost.keywords || null,
            canonical_url: assetPost.canonical_url || null,
            meta_title: assetPost.meta_title || { ko: '', en: '' },
            meta_description: assetPost.meta_description || { ko: '', en: '' },
            read_time_minutes: assetPost.read_time_minutes || null,
            sync_with_asset: assetPost.sync_with_asset || false,
            auto_sync_content: assetPost.auto_sync_content || false,
            asset_id: assetPost.asset_id || null,
            post_parent: assetPost.post_parent || null,
            menu_order: assetPost.menu_order || 0,
            comment_count: assetPost.comment_count || 0,
            post_password: assetPost.post_password || null,
            ping_status: assetPost.ping_status || 'open',
            last_sync_at: assetPost.last_sync_at || null,
            sync_status: assetPost.sync_status || 'pending',
            // author와 category 객체 포함
            author: assetPost.author || null,
            category: assetPost.category || null,
            tags: assetPost.tags || []
          }))

          // 자산 ID 설정 (bundle API 호출을 위해)
          if (assetPost.asset_id) {
            setAssetIdentifier(assetPost.asset_id.toString())
          }
        }
      } catch (err) {
        console.error('❌ AssetsEdit - Failed to fetch post data:', err)
      }
    }

    fetchPostData()
  }, [postId, mode])

  // 자산 번들 데이터 처리
  useEffect(() => {
    if (assetBundle) {
      console.log('📦 AssetsEdit - Asset bundle data received:', assetBundle)
      
      // numeric_overview 데이터를 assetInfo에 설정
      if (assetBundle.numeric_overview) {
        setAssetInfo(assetBundle.numeric_overview as any)
      }
      
      // post_overview 데이터가 있으면 formData 업데이트 (편집 모드가 아닐 때)
      if (assetBundle.post_overview && mode !== 'edit') {
        const postOverview = assetBundle.post_overview
        setFormData(prev => ({
          ...prev,
          title: postOverview.title || { ko: '', en: '' },
          content: postOverview.content || '',
          content_ko: postOverview.content || '',
          description: postOverview.description || { ko: '', en: '' },
          excerpt: postOverview.excerpt || { ko: '', en: '' },
          slug: postOverview.slug || '',
          cover_image: postOverview.cover_image || null,
          cover_image_alt: postOverview.cover_image_alt || null,
          keywords: postOverview.keywords || null,
          canonical_url: postOverview.canonical_url || null,
          meta_title: postOverview.meta_title || { ko: '', en: '' },
          meta_description: postOverview.meta_description || { ko: '', en: '' }
        }))
      }
    }
  }, [assetBundle, mode])

  // formData.asset_id가 설정되면 assetIdentifier도 동기화
  useEffect(() => {
    if (formData.asset_id) {
      setAssetIdentifier(formData.asset_id.toString())
    }
  }, [formData.asset_id])

  // 로딩 상태 업데이트
  useEffect(() => {
    setLoading(assetBundleLoading)
  }, [assetBundleLoading])

  // 자산 데이터 로드 (드롭다운용)
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        // 자산 목록 API 호출 (드롭다운용)
        const response = await fetch('https://backend.firemarkets.net/api/v1/assets/assets?limit=100&offset=0')
        if (response.ok) {
          const data = await response.json()
          setAssets(data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch assets:', error)
        // Mock 데이터 사용 (API 실패 시)
        setAssets([
          { 
            asset_id: 1, 
            ticker: 'BTCUSDT', 
            name: 'Bitcoin', 
            type_name: 'Crypto',
            exchange: 'Binance',
            currency: 'USDT',
            is_active: true,
            description: 'Bitcoin cryptocurrency',
            data_source: 'binance',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            id: 1, 
            symbol: 'BTCUSDT', 
            price: 112954.70, 
            change_24h: 0.10 
          },
          { 
            asset_id: 2, 
            ticker: 'ETHUSDT', 
            name: 'Ethereum', 
            type_name: 'Crypto',
            exchange: 'Binance',
            currency: 'USDT',
            is_active: true,
            description: 'Ethereum cryptocurrency',
            data_source: 'binance',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            id: 2, 
            symbol: 'ETHUSDT', 
            price: 3456.78, 
            change_24h: -1.25 
          },
          { 
            asset_id: 3, 
            ticker: 'AAPL', 
            name: 'Apple Inc.', 
            type_name: 'Stocks',
            exchange: 'NASDAQ',
            currency: 'USD',
            is_active: true,
            description: 'Apple Inc. stock',
            data_source: 'twelvedata',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            id: 3, 
            symbol: 'AAPL', 
            price: 175.43, 
            change_24h: 0.85 
          }
        ])
      }
    }

    fetchAssets()
  }, [])

  // 재무 정보 저장 함수 (자산 개요 정보 업데이트)
  const saveFinancialData = async (data: Partial<FinancialData>) => {
    try {
      // 자산 개요 정보 업데이트 API 호출
      const response = await fetch(`https://backend.firemarkets.net/api/v1/assets/overview/${formData.asset_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save financial data')
      }
      
      const result = await response.json()
      console.log('Financial data saved:', result)
      
      // 업데이트된 자산 정보를 상태에 반영
      setAssetInfo(prev => ({
        ...prev,
        ...result
      }))
      
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

  // 에러 상태 처리
  if (assetBundleError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">자산 정보를 불러올 수 없습니다</div>
          <div className="text-gray-600">{assetBundleError.message}</div>
        </div>
      </div>
    )
  }

  return (
    <BaseEdit
      postId={postId}
      mode={mode}
      postType="assets"
      onSave={handleAssetsSave}
      onCancel={onCancel}
      showFinancialData={true}
      financialTicker={assetInfo?.ticker}
      financialAssetId={assetInfo?.asset_id}
      financialData={assetInfo as any} // assetInfo에 모든 재무 데이터가 포함되어 있음
      onSaveFinancial={saveFinancialData}
      showAssetInfo={true}
      assetIdentifier={assetIdentifier}
      {...props}
    >
      {/* 퍼블리싱 블럭 */}
      <PublishingBlock
        status={formData.status}
        onStatusChange={(status) => updateFormData('status', status)}
        onPreview={() => console.log('미리보기')}
        onPublish={() => handleAssetsSave({ ...formData, status: 'published' })}
        onSaveDraft={() => handleAssetsSave({ ...formData, status: 'draft' })}
        saving={loading}
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
        assetId={formData.asset_id || null}
        onAssetIdChange={(assetId) => {
          updateFormData('asset_id', assetId)
          setAssetIdentifier(assetId?.toString() || null)
        }}
        syncWithAsset={formData.sync_with_asset || false}
        onSyncWithAssetChange={(syncWithAsset) => updateFormData('sync_with_asset', syncWithAsset)}
        autoSyncContent={formData.auto_sync_content || false}
        onAutoSyncContentChange={(autoSyncContent) => updateFormData('auto_sync_content', autoSyncContent)}
        ticker={assetInfo?.ticker || selectedAsset?.symbol}
        onTickerChange={(ticker) => {
          // Ticker 변경 시 해당 Asset 찾기
          const asset = assets.find(a => a.ticker === ticker || a.symbol === ticker)
          if (asset) {
            setSelectedAsset(asset)
            setAssetIdentifier(asset.asset_id.toString())
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
