'use client'

import React, { useState, useEffect } from 'react'
import BaseEdit, { BaseEditProps, PostFormState } from './BaseEdit'
import PublishingBlock from './editorblock/PublishingBlock'
import ContentBlock from './editorblock/ContentBlock'
import SEOSettings from './editorblock/SEOSettings'
import SyncSettings from './editorblock/SyncSettings'
import FinancialDataBlock from './FinancialDataBlock'

interface Asset {
  id: number
  symbol: string
  name: string
  price: number
  change_24h: number
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
    sync_status: 'pending'
  })

  const [activeLanguage] = useState<'ko' | 'en'>('ko')
  const [saving] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  // 폼 데이터 업데이트 함수
  const updateFormData = (field: keyof PostFormState, value: string | number | boolean | string[] | { ko: string; en: string } | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 자산 데이터 로드
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        // 실제 API 호출 (예시)
        const response = await fetch('/api/assets')
        if (response.ok) {
          const data = await response.json()
          setAssets(data.assets || [])
        }
      } catch (error) {
        console.error('Failed to fetch assets:', error)
        // Mock 데이터 사용
        setAssets([
          { id: 1, symbol: 'BTC', name: 'Bitcoin', price: 112954.70, change_24h: 0.10 },
          { id: 2, symbol: 'ETH', name: 'Ethereum', price: 3456.78, change_24h: -1.25 },
          { id: 3, symbol: 'AAPL', name: 'Apple Inc.', price: 175.43, change_24h: 0.85 }
        ])
      }
    }

    fetchAssets()
  }, [])

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

  return (
    <BaseEdit
      postId={postId}
      mode={mode}
      postType="assets"
      onSave={handleAssetsSave}
      onCancel={onCancel}
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
        onAuthorIdChange={(authorId) => updateFormData('author_id', authorId)}
        categoryId={formData.category_id || null}
        onCategoryIdChange={(categoryId) => updateFormData('category_id', categoryId)}
        postParent={formData.post_parent || null}
        onPostParentChange={(postParent) => updateFormData('post_parent', postParent)}
        postPassword={formData.post_password || null}
        onPostPasswordChange={(postPassword) => updateFormData('post_password', postPassword)}
        featured={formData.featured}
        onFeaturedChange={(featured) => updateFormData('featured', featured)}
      />

      {/* 재무 데이터 블럭 */}
      <FinancialDataBlock
        ticker={selectedAsset?.symbol}
        assetId={selectedAsset?.id}
      />

      {/* 동기화 설정 */}
      <SyncSettings
        assetId={formData.asset_id}
        onAssetIdChange={(assetId) => updateFormData('asset_id', assetId)}
        syncWithAsset={formData.sync_with_asset || false}
        onSyncWithAssetChange={(syncWithAsset) => updateFormData('sync_with_asset', syncWithAsset)}
        autoSyncContent={formData.auto_sync_content || false}
        onAutoSyncContentChange={(autoSyncContent) => updateFormData('auto_sync_content', autoSyncContent)}
        ticker={selectedAsset?.symbol}
        onTickerChange={(ticker) => {
          // Ticker 변경 시 해당 Asset 찾기
          const asset = assets.find(a => a.symbol === ticker)
          if (asset) {
            setSelectedAsset(asset)
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
