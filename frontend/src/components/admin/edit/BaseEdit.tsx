'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { usePost, useCreatePost, useUpdatePost, useRegeneratePost, useDeletePost, Post, PostCreateData, PostUpdateData } from '@/hooks/data/usePosts'
import { useRouter } from 'next/navigation'
import { useAssetOverviews } from '@/hooks/assets/useAssetOverviews'
import { useAssetDetail } from '@/hooks/assets/useAssets'

// Import New Block Components
import EditorHeader, { EditorBlockVisibility } from './EditorHeader'
import MainContentBlock from './editorblock/MainContentBlock'
import AiAnalysisBlock from './editorblock/AiAnalysisBlock'
import PublishingBlock from './editorblock/PublishingBlock'

import OrganizationBlock from './editorblock/OrganizationBlock'
import MediaBlock from './editorblock/MediaBlock'
import SEOSettings from './editorblock/SEOSettings'
import SyncSettings from './editorblock/SyncSettings'
import PostInfoBlock from './editorblock/PostInfoBlock'
import FinancialDataBlock from './editorblock/FinancialDataBlock'
import BlockWrapper from './BlockWrapper'
import ShortcodeInsertionBlock from './editorblock/ShortcodeInsertionBlock'
import SimpleQuillEditor from './htmledit/SimpleQuillEditor'

const SimpleTinyMceEditor = dynamic(() => import('./htmledit/SimpleTinyMceEditor'), { ssr: false })

export type PostFormState = Post

export interface BaseEditProps {
  postId?: number
  mode?: 'create' | 'edit'
  postType: 'post' | 'page' | 'tutorial' | 'news' | 'assets' | 'onchain' | 'raw_news' | 'ai_draft_news'
  onSave?: (data: PostFormState) => void
  onCancel?: () => void
  children?: React.ReactNode // Legacy sidebar support (if any)
  // FinancialDataBlock handling
  showFinancialData?: boolean
  financialTicker?: string
  financialAssetId?: number | null
  financialData?: any | null
  onSaveFinancial?: (data: any) => Promise<void>
  // Asset Info handling
  showAssetInfo?: boolean
  assetIdentifier?: string
  // Legacy props compatibility
  onPreview?: () => void
  onHandleSave?: (handleSave: (status: 'draft' | 'published') => Promise<void>) => void
  onSavingChange?: (saving: boolean) => void
  onFormDataChange?: (formData: PostFormState) => void
  onUpdateFormData?: (field: keyof PostFormState, value: any) => void
  onActiveLanguageChange?: (activeLanguage: 'ko' | 'en') => void
  onAssetDataChange?: (assetData: any) => void
  onRegisterUpdateFormData?: (fn: (field: keyof PostFormState, value: any) => void) => void
  initialData?: Partial<PostFormState>
}

export default function BaseEdit({
  postId,
  mode = 'create',
  postType,
  onSave,
  onCancel,
  onPreview,
  showFinancialData = false,
  financialTicker,
  financialAssetId,
  financialData,
  onSaveFinancial,
  showAssetInfo = false,
  assetIdentifier,
  onHandleSave,
  onSavingChange,
  onFormDataChange,
  onUpdateFormData,
  onActiveLanguageChange,
  onAssetDataChange,
  onRegisterUpdateFormData,
  initialData
}: BaseEditProps) {

  // --- 1. State & Hooks ---
  const { data: postData, isLoading: postLoading, error: postError } = usePost(postId)
  const createPostMutation = useCreatePost()
  const updatePostMutation = useUpdatePost()
  const regeneratePostMutation = useRegeneratePost()
  const deletePostMutation = useDeletePost()
  const router = useRouter()

  const handleAiRewrite = async () => {
    if (!postId) return
    if (!confirm('AI를 사용하여 포스트 내용을 다시 생성하시겠습니까? 기존 내용은 변경될 수 있습니다.')) return

    try {
      await regeneratePostMutation.mutateAsync(postId)
      alert('AI 분석 및 글다듬기가 완료되었습니다.')
    } catch (e) {
      console.error(e)
      alert('AI 분석 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!postId) return
    if (!confirm('이 포스트를 정말 삭제하시겠습니까? 삭제된 포스트는 복구할 수 없습니다.')) return

    try {
      await deletePostMutation.mutateAsync(postId)
      alert('포스트가 삭제되었습니다.')
      router.push('/admin/post/list')
    } catch (e) {
      console.error(e)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const [activeLanguage, setActiveLanguage] = useState<'ko' | 'en'>('ko')
  const [editorType, setEditorType] = useState<string>('tinymce')
  const [toastUiPreviewStyle, setToastUiPreviewStyle] = useState<'vertical' | 'tab' | 'vertical-stack'>('vertical')
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [useTinyMce, setUseTinyMce] = useState(false) // Toggle for TinyMCE

  // Block Visibility State
  const [blockVisibility, setBlockVisibility] = useState<EditorBlockVisibility>({
    publishing: true,
    organization: true,
    sync: true,
    postInfo: true,
    media: true,
    shortcode: true,
    seo: true,
    aiAnalysis: true,
    financial: showFinancialData,
    assetInfo: showAssetInfo
  })

  // Block Order State
  const [mainBlockOrder, setMainBlockOrder] = useState<string[]>(['mainContent', 'sync', 'postInfo', 'financial', 'assetInfo'])
  const [sideBlockOrder, setSideBlockOrder] = useState<string[]>([
    'aiAnalysis',
    'publishing',
    'organization',

    'media',
    'shortcode',
    'seo',
  ])

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    blockId: string
    column: 'main' | 'side'
  } | null>(null)


  // --- 2. Data Initialization ---
  const [formData, setFormData] = useState<PostFormState>({
    id: 0,
    title: { ko: '', en: '' },
    content: '',
    content_ko: '',
    description: { ko: '', en: '' },
    excerpt: { ko: '', en: '' },
    slug: '',
    status: 'draft',
    featured: false,
    post_type: postType,
    view_count: 0,
    created_at: '',
    updated_at: '',
    published_at: undefined,
    scheduled_at: undefined,
    author_id: null,
    category_id: null,
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
    post_info: null,
    author: null,
    category: null,
    tags: []
  })

  // Asset Data Logic
  const { data: assetDetail } = useAssetDetail(assetIdentifier || '')
  const assetType = assetDetail?.type_name
  const { data: overviewsData, loading: assetLoading, error: assetError } = useAssetOverviews(
    assetIdentifier || '',
    { assetType: assetType as string }
  )

  const assetData = useMemo(() => {
    if (!overviewsData) return null
    if (overviewsData.stock) {
      return {
        post_overview: overviewsData.stock.post_overview,
        numeric_overview: {
          ...overviewsData.stock.numeric_overview,
          ...overviewsData.stock.numeric_overview?.stock_financials_data,
          asset_id: overviewsData.stock.asset_id,
          prev_close: overviewsData.common?.prev_close,
          week_52_high: overviewsData.common?.week_52_high,
          week_52_low: overviewsData.common?.week_52_low,
          volume: overviewsData.common?.volume,
          market_cap: overviewsData.common?.market_cap || overviewsData.stock.numeric_overview?.stock_financials_data?.market_cap,
        },
        estimates_overview: overviewsData.stock.estimates_overview,
      }
    } else if (overviewsData.crypto) {
      return {
        post_overview: overviewsData.crypto.post_overview,
        numeric_overview: {
          ...overviewsData.crypto.numeric_overview,
          asset_id: overviewsData.crypto.asset_id,
          prev_close: overviewsData.common?.prev_close,
          week_52_high: overviewsData.common?.week_52_high,
          week_52_low: overviewsData.common?.week_52_low,
          volume: overviewsData.common?.volume,
          market_cap: overviewsData.common?.market_cap || overviewsData.crypto.numeric_overview?.market_cap,
        },
      }
    } else if (overviewsData.etf) {
      return {
        post_overview: overviewsData.etf.post_overview,
        numeric_overview: {
          ...overviewsData.etf.numeric_overview,
          asset_id: overviewsData.etf.asset_id,
          prev_close: overviewsData.common?.prev_close,
          week_52_high: overviewsData.common?.week_52_high,
          week_52_low: overviewsData.common?.week_52_low,
          volume: overviewsData.common?.volume,
          market_cap: overviewsData.common?.market_cap,
        },
      }
    }
    return null
  }, [overviewsData])

  // Effects to sync Asset Data to form
  useEffect(() => {
    if (onAssetDataChange) onAssetDataChange(assetData)
  }, [assetData, onAssetDataChange])

  // Initial Data Load
  useEffect(() => {
    if (mode === 'edit' && postData) {
      // Prevent overwriting client state if we already have this post loaded
      // This protects against background refetches wiping out user edits
      // But we MUST allow updates if the server content has changed (e.g. after AI rewrite)
      if (formData.id === postData.id && formData.updated_at === postData.updated_at) return

        const processMultilingualField = (field: any) => {
        if (typeof field === 'string') return { ko: field, en: field }
        if (typeof field === 'object' && field !== null) {
          return {
            ko: field.ko?.ko || field.ko || '',
            en: field.en?.en || field.en || ''
          }
        }
        return { ko: '', en: '' }
      }

      // 2024-05-24: Fix for post_type mismatch (e.g. 'asset' vs 'assets')
      // If API returns singular 'asset', normalize to 'assets' to match dropdown options
      let normalizedPostType = postData.post_type;
      if (postData.post_type === 'asset' as any) normalizedPostType = 'assets';
      if (postData.post_type === 'blog' as any) normalizedPostType = 'post';

      setFormData({
        ...postData,
        post_type: normalizedPostType,
        title: processMultilingualField(postData.title),
        description: processMultilingualField(postData.description),
        excerpt: processMultilingualField(postData.excerpt || postData.description),
        meta_title: processMultilingualField(postData.meta_title),
        meta_description: processMultilingualField(postData.meta_description),
        // Ensure arrays are arrays
        tags: postData.tags || [],
        keywords: Array.isArray(postData.keywords)
          ? postData.keywords
          : (typeof postData.keywords === 'string'
            ? (postData.keywords as string).split(',').map(k => k.trim()).filter(Boolean)
            : []),
        content: postData.content || '',
        content_ko: postData.content_ko || ''
      })
    } else if (mode === 'create' && initialData) {
      // Handle initialData for create mode
      setFormData(prev => ({
        ...prev,
        ...initialData,
        // Ensure complex objects are merged correctly if needed
        title: {
          ko: initialData.title?.ko || (typeof initialData.title === 'string' ? initialData.title : '') || prev.title.ko,
          en: initialData.title?.en || (typeof initialData.title === 'string' ? initialData.title : '') || prev.title.en,
        }
      }))
    }
    setLoading(postLoading)
    console.log('[BaseEdit] Data sync effect triggered. postData:', postData?.id, 'formData:', formData.id)
  }, [mode, postData, postLoading, initialData])

  // Notification Effects
  useEffect(() => { if (onActiveLanguageChange) onActiveLanguageChange(activeLanguage) }, [activeLanguage, onActiveLanguageChange])
  useEffect(() => { if (onSavingChange) onSavingChange(saving) }, [saving, onSavingChange])
  useEffect(() => { if (onFormDataChange) onFormDataChange(formData) }, [formData, onFormDataChange])


  // --- 3. Handlers ---

  const handleUpdate = useCallback((field: keyof PostFormState, value: any) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      // Sync description to meta_description if updated as a whole object (rare)
      if (field === 'description' && value && typeof value === 'object') {
        newState.meta_description = { ...(newState.meta_description as any || {}), ...value };
      }
      return newState;
    });
    if (onUpdateFormData) onUpdateFormData(field, value);
  }, [onUpdateFormData])

  // Specialized updaters for complex fields
  const updateMultilingual = (field: 'title' | 'description' | 'excerpt' | 'meta_title' | 'meta_description', value: string) => {
    setFormData(prev => {
      const current = prev[field] as any || { ko: '', en: '' }
      const updatedMultilingualValue = { ...current, [activeLanguage]: value };

      const newState = {
        ...prev,
        [field]: updatedMultilingualValue
      }

      // Sync description to meta_description (SEO)
      if (field === 'description') {
        newState.meta_description = {
          ...(newState.meta_description as any || { ko: '', en: '' }),
          [activeLanguage]: value
        };
      }

      return newState
    })
  }

  // Helper to extract headings for excerpt
  const extractHeadings = (html: string) => {
    if (typeof window === 'undefined') return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const headings = temp.querySelectorAll('h2, h3');
    return Array.from(headings)
      .map(h => h.textContent?.trim())
      .filter(Boolean)
      .join(' / ');
  }

  const generateSlug = () => {
    const title = typeof formData.title === 'string'
      ? formData.title
      : (formData.title as any)[activeLanguage]

    if (!title) return

    const slug = title.toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    handleUpdate('slug', slug)
  }

  const handleSave = useCallback(async (status: string = 'draft', options?: { skipCallback?: boolean }) => {
    try {
      setSaving(true)
      const postPayload: any = {
        ...formData,
        status,
        published_at: status === 'published' ? new Date().toISOString() : formData.published_at,
        tags: formData.tags?.map((t: any) => typeof t === 'string' ? t : t.name) || []
      }
      
      console.log('[BaseEdit] handleSave payload:', { 
        id: formData.id, 
        post_type: formData.post_type, 
        tags: postPayload.tags 
      });

      let result
      if (mode === 'create') {
        result = await createPostMutation.mutateAsync(postPayload as PostCreateData)
      } else if (mode === 'edit' && postId) {
        result = await updatePostMutation.mutateAsync({ postId, postData: postPayload as PostUpdateData })
      }

      // Only call onSave callback if NOT skipped (default behavior)
      if (onSave && result && !options?.skipCallback) {
        onSave(result)
      }
    } catch (e) {
      console.error(e)
      alert("저장 중 오류가 발생했습니다.")
    } finally {
      setSaving(false)
    }
  }, [formData, mode, postId, createPostMutation, updatePostMutation, onSave])


  // Only expose handleSave if requested (Legacy support)
  // We need to cast it or update the type definition of handleSaveRef to allow extra args if needed, 
  // but for legacy onHandleSave it usually expects (status) => Promise.
  // We can wrap it to maintain compatibility while allowing internal usage.
  const handleSaveRef = useRef<any>(handleSave)
  handleSaveRef.current = handleSave
  useEffect(() => { if (onHandleSave) onHandleSave(handleSaveRef.current) }, [onHandleSave])

  // --- 4. Block Movement Logic ---
  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const isMain = mainBlockOrder.includes(blockId)
    const list = isMain ? [...mainBlockOrder] : [...sideBlockOrder]
    const setList = isMain ? setMainBlockOrder : setSideBlockOrder

    const index = list.indexOf(blockId)
    if (index === -1) return

    if (direction === 'up' && index > 0) {
      [list[index - 1], list[index]] = [list[index], list[index - 1]]
    } else if (direction === 'down' && index < list.length - 1) {
      [list[index + 1], list[index]] = [list[index], list[index + 1]]
    }

    setList(list)
  }

  // --- 5. Render Blocks ---
  const renderBlock = (blockId: string, index: number, isFirst: boolean, isLast: boolean) => {
    // Check visibility first
    if (blockVisibility[blockId as keyof EditorBlockVisibility] === false) return null

    let content = null
    let title: React.ReactNode = ''

    switch (blockId) {
      case 'mainContent':
        title = '메인을 에디터 (Main Content)'
        content = (
          <MainContentBlock
            title={formData.title}
            onTitleChange={(val) => updateMultilingual('title', val)}
            slug={formData.slug}
            onSlugChange={(val) => handleUpdate('slug', val)}
            onGenerateSlug={generateSlug}
            description={formData.description}
            onDescriptionChange={(val) => updateMultilingual('description', val)}
            content={activeLanguage === 'ko' ? formData.content_ko : formData.content}
            onContentChange={(val) => {
              const field = activeLanguage === 'ko' ? 'content_ko' : 'content'
              const excerptField = 'excerpt'
              const generatedExcerpt = extractHeadings(val)

              setFormData(prev => {
                const currentExcerpt = prev.excerpt as any || { ko: '', en: '' }
                return {
                  ...prev,
                  [field]: val,
                  [excerptField]: { ...currentExcerpt, [activeLanguage]: generatedExcerpt }
                }
              })
              if (onUpdateFormData) onUpdateFormData(field, val)
            }}
            activeLanguage={activeLanguage}
            editorType={editorType}
            toastUiPreviewStyle={toastUiPreviewStyle}
          />
        )
        break
      case 'aiAnalysis':
        // Custom title with badge
        const sentiment = formData.post_info?.analysis?.sentiment
        const isPositive = sentiment?.toLowerCase() === 'positive'
        const isNegative = sentiment?.toLowerCase() === 'negative'
        title = (
          <div className="flex items-center gap-2">
            AI 분석 정보 (AI Analysis)
            {sentiment && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${isPositive ? 'bg-green-100 text-green-800 border-green-200' :
                isNegative ? 'bg-red-100 text-red-800 border-red-200' :
                  'bg-gray-100 text-gray-800 border-gray-200'
                }`}>
                {sentiment}
              </span>
            )}
          </div>
        )
        content = (
          <AiAnalysisBlock
            postInfo={formData.post_info}
            onPostInfoChange={(val) => handleUpdate('post_info', val)}
            activeLanguage={activeLanguage}
            onAiRewrite={handleAiRewrite}
            isRewriting={regeneratePostMutation.isPending}
          />
        )
        break

      case 'publishing':
        title = '퍼블리싱 (Publishing)'
        content = (
          <PublishingBlock
            status={formData.status as any}
            onStatusChange={(val) => {
              handleUpdate('status', val)
              if (val !== 'scheduled') {
                handleUpdate('published_at', new Date().toISOString())
              }
            }}
            publishedAt={formData.published_at as string}
            onPublishedAtChange={(val) => handleUpdate('published_at', val)}
            onPreview={onPreview || (() => {})}
            onSave={handleSave}
            mode={mode}
            saving={saving}
          />
        )
        break
      case 'organization':
        title = '분류 (Organization)'
        content = (
          <OrganizationBlock
            categoryId={formData.category_id}
            onCategoryIdChange={(val) => handleUpdate('category_id', val)}
            tags={formData.tags}
            onTagsChange={(val) => handleUpdate('tags', val)}
            authorId={formData.author_id}
            authorUsername={formData.author?.username}
            postType={formData.post_type}
            onPostTypeChange={(val) => handleUpdate('post_type', val)}
            featured={formData.featured}
            onFeaturedChange={(val) => handleUpdate('featured', val)}
          />
        )
        break

      case 'media':
        title = '미디어 (Media)'
        content = (
          <MediaBlock
            coverImage={formData.cover_image}
            onCoverImageChange={(val) => handleUpdate('cover_image', val)}
            coverImageAlt={formData.cover_image_alt}
            onCoverImageAltChange={(val) => handleUpdate('cover_image_alt', val)}
            postInfo={formData.post_info}
            postType={formData.post_type}
            slug={formData.slug}
            onUploadComplete={(url) => {
              // 1. Always update state with new URL
              setFormData(prev => ({ ...prev, cover_image: url }));
              
              // 2. Auto-save triggers ONLY in EDIT mode
              // preventing "Create -> Save -> Redirect" flow which disrupts user
              if (mode === 'edit') {
                 setTimeout(() => {
                    handleSaveRef.current('draft', { skipCallback: true }); 
                 }, 500); // Slight delay to ensure state update is processed
              }
            }}
          />
        )
        break
      case 'shortcode':
        title = '숏코드 삽입 (Shortcodes)'
        content = (
          <ShortcodeInsertionBlock
            onInsert={(shortcode) => {
              const field = activeLanguage === 'ko' ? 'content_ko' : 'content';
              const currentContent = formData[field] || '';
              const newContent = currentContent + `\n<p>${shortcode}</p>`;

              setFormData(prev => ({
                ...prev,
                [field]: newContent
              }));

              if (onUpdateFormData) onUpdateFormData(field, newContent);
            }}
          />
        )
        break
      case 'seo':
        title = 'SEO 설정'
        content = (
          <SEOSettings
            keywords={formData.keywords}
            onKeywordsChange={(val) => handleUpdate('keywords', val)}
            metaTitle={formData.meta_title as any}
            onMetaTitleChange={(val) => handleUpdate('meta_title', val)}
            metaDescription={formData.meta_description as any}
            onMetaDescriptionChange={(val) => handleUpdate('meta_description', val)}
            canonicalUrl={formData.canonical_url}
            onCanonicalUrlChange={(val) => handleUpdate('canonical_url', val)}
            activeLanguage={activeLanguage}
          />
        )
        break
      case 'sync':
        title = '동기화 설정'
        content = (
          <SyncSettings
            assetId={formData.asset_id}
            onAssetIdChange={(val) => handleUpdate('asset_id', val)}
            syncWithAsset={formData.sync_with_asset}
            onSyncWithAssetChange={(val) => handleUpdate('sync_with_asset', val)}
            autoSyncContent={formData.auto_sync_content}
            onAutoSyncContentChange={(val) => handleUpdate('auto_sync_content', val)}
          />
        )
        break
      case 'postInfo':
        title = (
          <div className="flex items-center gap-2">
            Post Info
            {formData.post_info?.source_post_ids && (
              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full border border-purple-200">
                AI Generated
              </span>
            )}
          </div>
        )
        content = (
          <PostInfoBlock
            postId={postId}
            postInfo={formData.post_info}
            onChange={(val) => handleUpdate('post_info', val)}
          />
        )
        break
      case 'financial':
        if (!showFinancialData) return null
        title = '재무 데이터'
        content = (
          <FinancialDataBlock
            ticker={financialTicker}
            assetId={financialAssetId}
            financialData={financialData}
            onSaveFinancial={onSaveFinancial}
          />
        )
        break
      case 'assetInfo':
        if (!showAssetInfo || !assetData) return null
        title = '자산 정보'
        content = (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <div>
              <label className="text-xs text-gray-500">가격</label>
              <p className="font-bold">${assetData.numeric_overview?.current_price?.toLocaleString() || '-'}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">변동률(24h)</label>
              <p className={
                (assetData.numeric_overview?.percent_change_24h || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }>
                {(assetData.numeric_overview?.percent_change_24h || 0).toFixed(2)}%
              </p>
            </div>
            <div>
              <label className="text-xs text-gray-500">시총</label>
              <p>${assetData.numeric_overview?.market_cap?.toLocaleString() || '-'}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">거래량</label>
              <p>${assetData.numeric_overview?.volume_24h?.toLocaleString() || '-'}</p>
            </div>
          </div>
        )
        break
      default:
        return null
    }

    return (
      <BlockWrapper
        key={blockId}
        title={title}
        onMoveUp={() => moveBlock(blockId, 'up')}
        onMoveDown={() => moveBlock(blockId, 'down')}
        isFirst={isFirst}
        isLast={isLast}
      >
        {content}
      </BlockWrapper>
    )
  }

  // --- 6. Render ---
  if (postError) {
    return <div className="p-8 text-center text-red-600">오류가 발생했습니다: {postError.message}</div>
  }
  if (loading) {
    return <div className="p-8 text-center">로딩 중...</div>
  }

  return (
    <div className="pb-20">
      <EditorHeader
        mode={mode}
        activeLanguage={activeLanguage}
        onActiveLanguageChange={setActiveLanguage}
        status={formData.status}
        editorType={editorType}
        onEditorTypeChange={setEditorType}
        toastUiPreviewStyle={toastUiPreviewStyle}
        onToastUiPreviewStyleChange={setToastUiPreviewStyle}
        saving={saving}
        onSave={handleSave}
        onCancel={onCancel || (() => { })}
        blockVisibility={blockVisibility}
        onToggleBlock={(key) => setBlockVisibility(prev => ({ ...prev, [key]: !prev[key] }))}
        onDelete={handleDelete}
        onPreview={onPreview}
      />

      <div className="w-full py-4 lg:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
          {/* Main Column */}
          <div className="flex-1 w-full lg:w-auto space-y-4">
            {mainBlockOrder.map((blockId, index) =>
              renderBlock(blockId, index, index === 0, index === mainBlockOrder.length - 1)
            )}
          </div>

          {/* Sidebar Column */}
          <div className="w-full lg:w-80 space-y-4">
            {sideBlockOrder.map((blockId, index) =>
              renderBlock(blockId, index, index === 0, index === sideBlockOrder.length - 1)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
