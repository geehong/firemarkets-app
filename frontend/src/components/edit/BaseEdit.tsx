'use client'

import React, { useState, useEffect, useRef, useCallback, ReactNode, useMemo } from 'react'
import dynamic from 'next/dynamic'

// Dynamic imports for editors
const SimpleTiptapEditor = dynamic(() => import('./SimpleTiptapEditor'), { ssr: false })
const SimpleQuillEditor = dynamic(() => import('./SimpleQuillEditor'), { ssr: false })
const SimpleEditorJS = dynamic(() => import('./SimpleEditorJS'), { ssr: false })
const SimpleSummernote = dynamic(() => import('./SimpleSummernote'), { ssr: false })
import FinancialDataBlock from './editorblock/FinancialDataBlock'
import { usePost, useCreatePost, useUpdatePost, Post, PostCreateData, PostUpdateData } from '@/hooks/usePosts'
import { useAssetOverviews } from '@/hooks/useAssetOverviews'
import { useAssetDetail } from '@/hooks/useAssets'


// PostFormState는 usePosts의 Post 타입을 기반으로 함
export type PostFormState = Post

export interface BaseEditProps {
  postId?: number
  mode?: 'create' | 'edit'
  postType: 'post' | 'page' | 'tutorial' | 'news' | 'assets' | 'onchain'
  onSave?: (data: PostFormState) => void
  onCancel?: () => void
  children?: ReactNode // 사이드바 컴포넌트들
  // FinancialDataBlock 관련 props
  showFinancialData?: boolean
  financialTicker?: string
  financialAssetId?: number | null
  financialData?: any | null
  onSaveFinancial?: (data: any) => Promise<void>
  // 자산 정보 표시 관련 props
  showAssetInfo?: boolean
  assetIdentifier?: string
  // PublishingBlock에서 사용할 handleSave 함수
  onHandleSave?: (handleSave: (status: 'draft' | 'published') => Promise<void>) => void
  // saving 상태 전달
  onSavingChange?: (saving: boolean) => void
  // formData와 updateFormData를 children에 전달하기 위한 props
  onFormDataChange?: (formData: PostFormState) => void
  onUpdateFormData?: (field: keyof PostFormState, value: string | number | boolean | string[] | { ko: string; en: string } | null) => void
  // activeLanguage를 children에 전달하기 위한 props
  onActiveLanguageChange?: (activeLanguage: 'ko' | 'en') => void
  // assetData를 children에 전달하기 위한 props
  onAssetDataChange?: (assetData: any) => void
}

export default function BaseEdit({
  postId,
  mode = 'create',
  postType,
  onSave,
  onCancel,
  children,
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
  onAssetDataChange
}: BaseEditProps) {
  console.log('🔍 BaseEdit - postId received:', postId)

  // React Query 훅들 사용
  const { data: postData, isLoading: postLoading, error: postError } = usePost(postId)
  const createPostMutation = useCreatePost()
  const updatePostMutation = useUpdatePost()

  console.log('🔍 BaseEdit - usePost result:', { postData: postData ? 'exists' : 'null', postLoading, postError })

  const [activeLanguage, setActiveLanguage] = useState<'ko' | 'en'>('ko')
  const [editorType, setEditorType] = useState<string>('tiptap') // Default editor editorType

  const editors = [
    { id: 'tiptap', name: 'Tiptap' },
    { id: 'quill', name: 'Quill' },
    { id: 'summernote', name: 'Summernote' },
    { id: 'editorjs', name: 'Editor.js' },
  ]

  // activeLanguage 변경 시 children에 알림
  useEffect(() => {
    if (onActiveLanguageChange) {
      onActiveLanguageChange(activeLanguage)
    }
  }, [activeLanguage, onActiveLanguageChange])

  // 자산 타입 확인 (assetIdentifier로부터)
  const { data: assetDetail } = useAssetDetail(assetIdentifier || '')
  const assetType = assetDetail?.type_name

  // 새로운 asset-overviews API 사용
  const { data: overviewsData, loading: assetLoading, error: assetError } = useAssetOverviews(
    assetIdentifier || '',
    { assetType: assetType as string }
  )

  // 새로운 API 구조를 기존 구조로 변환 (호환성 유지)
  const assetData = useMemo(() => {
    if (!overviewsData) return null
    // 자산 타입에 따라 적절한 데이터 선택
    if (overviewsData.stock) {
      return {
        post_overview: overviewsData.stock.post_overview,
        numeric_overview: {
          ...overviewsData.stock.numeric_overview,
          ...overviewsData.stock.numeric_overview?.stock_financials_data,
          asset_id: overviewsData.stock.asset_id,
          // common 데이터도 병합
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
          // common 데이터도 병합
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
          // common 데이터도 병합
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

  console.log('🔍 BaseEdit - assetIdentifier received:', assetIdentifier)
  console.log('🔍 BaseEdit - assetType:', assetType)
  console.log('🔍 BaseEdit - overviewsData received:', overviewsData)
  console.log('🔍 BaseEdit - assetData (converted):', assetData)

  const lastAssetSyncRef = useRef<{ assetData: any; activeLanguage: 'ko' | 'en' } | null>(null)

  // assetData를 부모 컴포넌트에 전달
  useEffect(() => {
    if (onAssetDataChange) {
      onAssetDataChange(assetData)
    }
  }, [assetData, onAssetDataChange])

  const [formData, setFormData] = useState<PostFormState>({
    // 기본값 설정
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
    sync_status: 'pending'
  })

  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)

  // CKEditor 내용 변경을 추적하기 위한 ref
  const editorContentRef = useRef<string>('')
  const isUpdatingFromEditor = useRef(false)

  // CKEditor onChange 핸들러를 useCallback으로 안정화
  const handleEditorChange = useCallback((value: string) => {
    // 무한 루프 방지: 에디터에서 변경된 값만 업데이트
    if (!isUpdatingFromEditor.current && value !== editorContentRef.current) {
      isUpdatingFromEditor.current = true
      editorContentRef.current = value

      setFormData(prev => ({
        ...prev,
        [activeLanguage === 'ko' ? 'content_ko' : 'content']: value
      }))

      // 다음 렌더링 사이클에서 플래그 리셋
      setTimeout(() => {
        isUpdatingFromEditor.current = false
      }, 0)
    }
  }, [activeLanguage])

  // assetData의 post_overview를 사용하여 formData 업데이트
  useEffect(() => {
    if (assetData?.post_overview) {
      const lastSync = lastAssetSyncRef.current
      if (lastSync && lastSync.assetData === assetData && lastSync.activeLanguage === activeLanguage) {
        return
      }
      lastAssetSyncRef.current = { assetData, activeLanguage }

      console.log('📦 BaseEdit - Updating formData with assetData.post_overview:', assetData.post_overview)
      console.log('📦 BaseEdit - Current activeLanguage:', activeLanguage)
      console.log('📦 BaseEdit - postOverview.title:', assetData.post_overview.title)
      console.log('📦 BaseEdit - postOverview.content:', assetData.post_overview.content)
      console.log('📦 BaseEdit - postOverview.description:', assetData.post_overview.description)

      const postOverview = assetData.post_overview
      setFormData(prev => {
        const newFormData = {
          ...prev,
          title: postOverview.title || { ko: '', en: '' },
          content: activeLanguage === 'en' ? (postOverview.content || '') : prev.content,
          content_ko: activeLanguage === 'ko' ? (postOverview.content || '') : prev.content_ko,
          description: postOverview.description || { ko: '', en: '' },
          excerpt: postOverview.excerpt || { ko: '', en: '' },
          slug: postOverview.slug || '',
          cover_image: postOverview.cover_image || null,
          cover_image_alt: postOverview.cover_image_alt || null,
          keywords: postOverview.keywords || null,
          canonical_url: postOverview.canonical_url || null,
          meta_title: postOverview.meta_title || { ko: '', en: '' },
          meta_description: postOverview.meta_description || { ko: '', en: '' }
        }
        console.log('📦 BaseEdit - New formData after update:', {
          title: newFormData.title,
          content: newFormData.content,
          content_ko: newFormData.content_ko,
          description: newFormData.description,
          activeLanguage: activeLanguage
        })
        console.log('📦 BaseEdit - CKEditor value will be:', activeLanguage === 'ko' ? newFormData.content_ko : newFormData.content)
        return newFormData
      })
    }
  }, [assetData, activeLanguage])

  // 수정 모드일 때 기존 데이터 불러오기 (React Query 사용)
  useEffect(() => {
    console.log('🔍 BaseEdit - useEffect triggered:', { mode, postData: postData ? 'exists' : 'null', postId })

    if (mode === 'edit' && postData) {
      console.log('📦 BaseEdit - Post data loaded from React Query:', postData)

      // 다국어 필드를 안전하게 처리하는 헬퍼 함수
      const processMultilingualField = (field: any) => {
        if (typeof field === 'string') {
          return { ko: field, en: field }
        }
        if (typeof field === 'object' && field !== null) {
          // 중첩된 객체인 경우 (예: {ko: {…}, en: {…}})
          if (field.ko && typeof field.ko === 'object') {
            return {
              ko: field.ko.ko || field.ko || '',
              en: field.en?.en || field.en || ''
            }
          }
          // 일반적인 객체인 경우 (예: {ko: 'text', en: 'text'})
          return {
            ko: field.ko || '',
            en: field.en || ''
          }
        }
        return { ko: '', en: '' }
      }

      // 실제 API 응답 구조에 맞춘 데이터 처리
      const processedData = {
        id: postData.id,
        title: processMultilingualField(postData.title),
        content: postData.content || '',
        content_ko: postData.content_ko || '',
        description: processMultilingualField(postData.description),
        excerpt: processMultilingualField(postData.excerpt),
        slug: postData.slug || '',
        status: postData.status || 'draft',
        featured: postData.featured || false,
        post_type: postData.post_type || postType,
        view_count: postData.view_count || 0,
        created_at: postData.created_at,
        updated_at: postData.updated_at,
        published_at: postData.published_at,
        scheduled_at: postData.scheduled_at,

        // API에서 실제로 제공하는 필수 필드들
        author_id: postData.author_id || null,
        category_id: postData.category_id || null,
        cover_image: postData.cover_image || null,
        cover_image_alt: postData.cover_image_alt || null,
        keywords: postData.keywords || null,
        canonical_url: postData.canonical_url || null,
        meta_title: processMultilingualField(postData.meta_title),
        meta_description: processMultilingualField(postData.meta_description),
        read_time_minutes: postData.read_time_minutes || null,

        // 추가 API 필드들
        sync_with_asset: postData.sync_with_asset || false,
        auto_sync_content: postData.auto_sync_content || false,
        asset_id: postData.asset_id || null,
        post_parent: postData.post_parent || null,
        menu_order: postData.menu_order || 0,
        comment_count: postData.comment_count || 0,
        post_password: postData.post_password || null,
        ping_status: postData.ping_status || 'open',
        last_sync_at: postData.last_sync_at || null,
        sync_status: postData.sync_status || 'pending',

        // author와 category 객체 포함
        author: postData.author || null,
        category: postData.category || null,
        tags: postData.tags || []
      }

      console.log('📝 Processed data:', {
        title: processedData.title,
        description: processedData.description,
        excerpt: processedData.excerpt
      })
      setFormData(processedData)
      console.log('✅ Post data loaded and set successfully')
    }
  }, [mode, postData, postType])

  // 로딩 상태 업데이트
  useEffect(() => {
    setLoading(postLoading)
  }, [postLoading])

  // 내용이 변경될 때마다 읽기 시간 업데이트
  useEffect(() => {
    const currentContent = activeLanguage === 'ko' ? formData.content_ko : formData.content
    const readTime = calculateReadTime(currentContent)
    setFormData((prev: PostFormState) => ({
      ...prev,
      read_time_minutes: readTime
    }))
  }, [formData.content, formData.content_ko, activeLanguage])

  // 에디터 내용 ref 업데이트 (언어 변경 시)
  useEffect(() => {
    const currentContent = activeLanguage === 'ko' ? formData.content_ko : formData.content
    editorContentRef.current = currentContent
  }, [activeLanguage, formData.content, formData.content_ko])

  // 폼 데이터 업데이트
  const updateFormData = (field: keyof PostFormState, value: string | number | boolean | string[] | { ko: string; en: string } | null) => {
    const newFormData = {
      ...formData,
      [field]: value
    }
    setFormData(newFormData)

    // 부모 컴포넌트에 변경사항 전달
    if (onFormDataChange) {
      onFormDataChange(newFormData)
    }
    if (onUpdateFormData) {
      onUpdateFormData(field, value)
    }
  }

  // 부모 컴포넌트에서 formData 변경사항을 받아서 내부 상태 업데이트
  useEffect(() => {
    if (onFormDataChange) {
      // 부모 컴포넌트에 현재 formData 전달
      onFormDataChange(formData)
    }
  }, [formData, onFormDataChange])

  // onFormDataChange가 호출될 때 내부 formData 업데이트
  useEffect(() => {
    if (onFormDataChange) {
      // onFormDataChange가 변경될 때마다 현재 formData를 부모에게 전달
      onFormDataChange(formData)
    }
  }, [onFormDataChange])

  // 다국어 필드 업데이트
  const updateMultilingualField = (field: keyof Pick<PostFormState, 'title' | 'description' | 'excerpt' | 'meta_title' | 'meta_description'>, value: string) => {
    const currentFieldValue = formData[field]
    const newValue = {
      ko: '',
      en: '',
      ...(typeof currentFieldValue === 'object' && currentFieldValue !== null ? currentFieldValue : {}),
      [activeLanguage]: value
    }

    setFormData((prev: PostFormState) => ({
      ...prev,
      [field]: newValue
    }))
  }

  // 슬러그 자동 생성
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  // 읽기 시간 계산 함수
  const calculateReadTime = (content: string): number => {
    if (!content) return 0

    // HTML 태그 제거하고 텍스트만 추출
    const textContent = content.replace(/<[^>]*>/g, '')

    // 한국어와 영어 단어 수 계산 (한국어는 글자 수, 영어는 단어 수)
    const koreanChars = textContent.match(/[가-힣]/g) || []
    const englishWords = textContent.match(/[a-zA-Z]+/g) || []

    // 한국어는 글자 수로, 영어는 단어 수로 계산
    const totalWords = koreanChars.length + englishWords.length

    // 평균 읽기 속도: 분당 200단어 (한국어 기준)
    const wordsPerMinute = 200
    const readTime = Math.ceil(totalWords / wordsPerMinute)

    return Math.max(1, readTime) // 최소 1분
  }

  // 저장 함수 (React Query 사용)
  const handleSave = React.useCallback(async (status: 'draft' | 'published' = 'draft') => {
    try {
      setSaving(true)

      // 데이터 유효성 검사
      const validationErrors: string[] = []

      // 제목 검사 - 더 엄격한 검사
      if (!formData.title) {
        validationErrors.push('제목을 입력해주세요.')
      } else if (typeof formData.title === 'object') {
        const hasValidTitle = (formData.title.ko && formData.title.ko.trim() !== '') ||
          (formData.title.en && formData.title.en.trim() !== '')
        if (!hasValidTitle) {
          validationErrors.push('제목을 입력해주세요.')
        }
      } else if (typeof formData.title === 'string' && formData.title.trim() === '') {
        validationErrors.push('제목을 입력해주세요.')
      }

      // 슬러그 검사
      if (!formData.slug || formData.slug.trim() === '') {
        validationErrors.push('슬러그를 입력해주세요.')
      } else {
        // 슬러그 형식 검사 - /로 시작하면 제거
        let cleanSlug = formData.slug.trim()
        if (cleanSlug.startsWith('/')) {
          cleanSlug = cleanSlug.substring(1)
        }
        // 슬러그는 영문자, 숫자, 하이픈, 언더스코어만 허용
        if (!/^[a-zA-Z0-9-_]+$/.test(cleanSlug)) {
          validationErrors.push('슬러그는 영문자, 숫자, 하이픈, 언더스코어만 사용할 수 있습니다.')
        } else {
          // 정리된 슬러그로 업데이트
          formData.slug = cleanSlug
        }
      }

      // 내용 검사 - content 또는 content_ko 중 하나는 있어야 함
      const hasContent = (formData.content && formData.content.trim() !== '') ||
        (formData.content_ko && formData.content_ko.trim() !== '')
      if (!hasContent) {
        validationErrors.push('내용을 입력해주세요.')
      }

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(' '))
      }

      const postData = {
        ...formData,
        status,
        published_at: status === 'published' ? new Date().toISOString() : formData.published_at
      }

      console.log('📝 Sending post data:', JSON.stringify(postData, null, 2))

      if (mode === 'create') {
        // React Query mutation 사용
        const result = await createPostMutation.mutateAsync(postData as PostCreateData)
        console.log('✅ Post created:', result)

        if (onSave) {
          onSave(result)
        }
      } else if (mode === 'edit' && postId) {
        // React Query mutation 사용
        const result = await updatePostMutation.mutateAsync({
          postId,
          postData: postData as PostUpdateData
        })
        console.log('✅ Post updated:', result)

        if (onSave) {
          onSave(result)
        }
      }
    } catch (error) {
      console.error('❌ Failed to save post:', error)
      // 에러는 React Query가 자동으로 처리하므로 여기서는 로깅만
    } finally {
      setSaving(false)
    }
  }, [formData, mode, postId, postType, onSave, createPostMutation, updatePostMutation])

  // 취소 함수
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
  }

  // onHandleSave에 handleSave 함수 전달 (useRef 사용)
  const handleSaveRef = React.useRef(handleSave)
  handleSaveRef.current = handleSave

  React.useEffect(() => {
    if (onHandleSave) {
      onHandleSave(handleSaveRef.current)
    }
  }, [onHandleSave])

  // saving 상태를 부모 컴포넌트에 전달
  React.useEffect(() => {
    if (onSavingChange) {
      onSavingChange(saving)
    }
  }, [saving, onSavingChange])

  // formData가 변경될 때마다 부모 컴포넌트에 전달 (안전한 처리)
  React.useEffect(() => {
    if (onFormDataChange) {
      // formData의 다국어 필드들이 올바른 형태인지 확인
      const safeFormData = {
        ...formData,
        title: typeof formData.title === 'object' ? formData.title : { ko: formData.title || '', en: formData.title || '' },
        description: typeof formData.description === 'object' ? formData.description : { ko: formData.description || '', en: formData.description || '' },
        excerpt: typeof formData.excerpt === 'object' ? formData.excerpt : { ko: formData.excerpt || '', en: formData.excerpt || '' },
        meta_title: typeof formData.meta_title === 'object' ? formData.meta_title : { ko: formData.meta_title || '', en: formData.meta_title || '' },
        meta_description: typeof formData.meta_description === 'object' ? formData.meta_description : { ko: formData.meta_description || '', en: formData.meta_description || '' }
      }
      onFormDataChange(safeFormData)
    }
  }, [formData, onFormDataChange])

  // 에러 상태 처리
  if (postError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">오류가 발생했습니다</div>
          <div className="text-gray-600">{postError.message}</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b px-4 lg:px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-4">
            <h1 className="text-lg lg:text-xl font-semibold">
              {mode === 'create' ? '새 포스트 작성' : '포스트 편집'}
            </h1>
            <div className="flex space-x-2">
              {/* Editor Selector */}
              <select
                value={editorType}
                onChange={(e) => setEditorType(e.target.value)}
                className="px-3 py-1 rounded text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {editors.map(editor => (
                  <option key={editor.id} value={editor.id}>
                    {editor.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  console.log('🇰🇷 Switching to Korean')
                  console.log('🔍 BaseEdit - Before language change:', { activeLanguage, assetIdentifier })
                  setActiveLanguage('ko')
                }}
                className={`px-3 py-1 rounded text-sm font-medium ${activeLanguage === 'ko'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                한국어
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('🇺🇸 Switching to English')
                  console.log('🔍 BaseEdit - Before language change:', { activeLanguage, assetIdentifier })
                  setActiveLanguage('en')
                }}
                className={`px-3 py-1 rounded text-sm font-medium ${activeLanguage === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                English
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '임시저장'}
            </button>
            <button
              type="button"
              onClick={() => handleSave('published')}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '발행 중...' : '발행'}
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* 왼쪽: 메인 편집 영역 */}
          <div className="flex-1 order-2 lg:order-1">
            <div className="bg-white rounded-lg shadow-sm">
              {/* 제목 */}
              <div className="p-6 border-b">
                <input
                  type="text"
                  value={
                    typeof formData.title === 'object' && formData.title !== null
                      ? (formData.title[activeLanguage] || '')
                      : (typeof formData.title === 'string' ? formData.title : '')
                  }
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMultilingualField('title', e.target.value)}
                  className="w-full text-2xl font-semibold border-none outline-none"
                  placeholder="제목을 입력하세요..."
                />
              </div>

              {/* 슬러그 */}
              <div className="px-6 py-3 border-b bg-gray-50">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">슬러그:</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('slug', e.target.value)}
                    className="flex-1 text-sm border-none bg-transparent outline-none"
                    placeholder="url-slug"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const titleValue = typeof formData.title === 'object' && formData.title !== null
                        ? (formData.title[activeLanguage] || '')
                        : (typeof formData.title === 'string' ? formData.title : '')
                      updateFormData('slug', generateSlug(titleValue))
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    자동 생성
                  </button>
                </div>
              </div>

              {/* 요약 */}
              <div className="p-6 border-b">
                <textarea
                  value={
                    typeof formData.excerpt === 'object' && formData.excerpt !== null
                      ? (formData.excerpt[activeLanguage] || '')
                      : (typeof formData.excerpt === 'string' ? formData.excerpt : '')
                  }
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateMultilingualField('excerpt', e.target.value)}
                  rows={3}
                  className="w-full border-none outline-none resize-none"
                  placeholder="요약을 입력하세요..."
                />
              </div>

              {/* 본문 */}
              <div className="p-6">
                {editorType === 'tiptap' && (
                  <SimpleTiptapEditor
                    value={activeLanguage === 'ko' ? formData.content_ko : formData.content}
                    onChange={handleEditorChange}
                    placeholder="본문을 입력하세요..."
                    height={500}
                  />
                )}
                {editorType === 'quill' && (
                  <SimpleQuillEditor
                    value={activeLanguage === 'ko' ? formData.content_ko : formData.content}
                    onChange={handleEditorChange}
                    placeholder="본문을 입력하세요..."
                    height={500}
                  />
                )}
                {editorType === 'editorjs' && (
                  <SimpleEditorJS
                    value={activeLanguage === 'ko' ? formData.content_ko : formData.content}
                    onChange={handleEditorChange}
                    height={500}
                  />
                )}
                {editorType === 'summernote' && (
                  <SimpleSummernote
                    value={activeLanguage === 'ko' ? formData.content_ko : formData.content}
                    onChange={handleEditorChange}
                    height={500}
                  />
                )}
              </div>

              {/* 재무 데이터 블럭 (Assets 타입일 때만 표시) */}
              {showFinancialData && (
                <div className="p-6 border-t">
                  <FinancialDataBlock
                    ticker={financialTicker}
                    assetId={financialAssetId}
                    financialData={financialData}
                    onSaveFinancial={onSaveFinancial}
                  />
                </div>
              )}

              {/* 자산 정보 블럭 */}
              {showAssetInfo && assetData && (
                <div className="p-6 border-t">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">자산 정보</h3>

                    {assetData.numeric_overview && (
                      <div className="space-y-4">
                        {/* 기본 정보 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">티커</label>
                            <p className="text-lg font-semibold text-gray-900">
                              {assetData.numeric_overview.ticker}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">이름</label>
                            <p className="text-lg font-semibold text-gray-900">
                              {(() => {
                                const name = assetData.numeric_overview?.name
                                const companyName = assetData.post_overview?.company_name
                                const title = assetData.post_overview?.title
                                if (typeof name === 'string' && name) return name
                                if (name && typeof name === 'object' && name.ko) return name.ko
                                if (typeof companyName === 'string' && companyName) return companyName
                                if (companyName && typeof companyName === 'object' && companyName.ko) return companyName.ko
                                if (typeof title === 'string' && title) return title
                                if (title && typeof title === 'object' && title.ko) return title.ko
                                return '-'
                              })()}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">거래소</label>
                            <p className="text-gray-900">
                              {(() => {
                                const v = assetData.numeric_overview?.exchange || assetData.post_overview?.exchange
                                if (typeof v === 'string') return v || '-'
                                if (v && typeof v === 'object' && v.ko) return v.ko
                                return '-'
                              })()}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">통화</label>
                            <p className="text-gray-900">{assetData.numeric_overview.currency || '-'}</p>
                          </div>
                        </div>

                        {/* 가격 정보 */}
                        {(assetData.numeric_overview.current_price || assetData.numeric_overview.prev_close) && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600">현재 가격</label>
                              <p className="text-xl font-bold text-gray-900">
                                ${(assetData.numeric_overview.current_price || assetData.numeric_overview.prev_close)?.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">24시간 변동률</label>
                              <p className={`text-lg font-semibold ${(assetData.numeric_overview.percent_change_24h || assetData.numeric_overview.price_change_percentage_24h || 0) >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                                }`}>
                                {(assetData.numeric_overview.percent_change_24h || assetData.numeric_overview.price_change_percentage_24h)?.toFixed(2)}%
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">시가총액</label>
                              <p className="text-lg font-semibold text-gray-900">
                                ${assetData.numeric_overview.market_cap?.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* 암호화폐 정보 */}
                        {(assetData.numeric_overview.asset_category === 'crypto' || assetData.numeric_overview.circulating_supply) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600">순환 공급량</label>
                              <p className="text-gray-900">
                                {assetData.numeric_overview.circulating_supply?.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">총 공급량</label>
                              <p className="text-gray-900">
                                {assetData.numeric_overview.total_supply?.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">24시간 거래량</label>
                              <p className="text-gray-900">
                                ${assetData.numeric_overview.volume_24h?.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">CMC 순위</label>
                              <p className="text-gray-900">#{assetData.numeric_overview.cmc_rank}</p>
                            </div>
                          </div>
                        )}

                        {/* 주식 정보 */}
                        {(assetData.numeric_overview.asset_category === 'stocks' || assetData.post_overview?.company_name) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600">회사명</label>
                              <p className="text-gray-900">
                                {(() => {
                                  const v = assetData.post_overview?.company_name || assetData.numeric_overview?.company_name
                                  if (typeof v === 'string') return v || '-'
                                  if (v && typeof v === 'object' && v.ko) return v.ko
                                  return '-'
                                })()}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">섹터</label>
                              <p className="text-gray-900">
                                {(() => {
                                  const v = assetData.post_overview?.sector || assetData.numeric_overview?.sector
                                  if (typeof v === 'string') return v || '-'
                                  if (v && typeof v === 'object' && v.ko) return v.ko
                                  return '-'
                                })()}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">산업</label>
                              <p className="text-gray-900">
                                {(() => {
                                  const v = assetData.post_overview?.industry || assetData.numeric_overview?.industry
                                  if (typeof v === 'string') return v || '-'
                                  if (v && typeof v === 'object' && v.ko) return v.ko
                                  return '-'
                                })()}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">국가</label>
                              <p className="text-gray-900">
                                {(() => {
                                  const v = assetData.post_overview?.country || assetData.numeric_overview?.country
                                  if (typeof v === 'string') return v || '-'
                                  if (v && typeof v === 'object' && v.ko) return v.ko
                                  return '-'
                                })()}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* 설명 */}
                        {(assetData.post_overview?.description || assetData.numeric_overview?.description) && (
                          <div>
                            <label className="text-sm font-medium text-gray-600">설명</label>
                            <p className="text-gray-700 text-sm leading-relaxed">
                              {(() => {
                                const postDesc = assetData.post_overview?.description
                                const numericDesc = assetData.numeric_overview?.description
                                // postDesc 처리
                                if (typeof postDesc === 'string') return postDesc
                                if (postDesc && typeof postDesc === 'object') {
                                  if (typeof postDesc.ko === 'string' && postDesc.ko) return postDesc.ko
                                  if (typeof postDesc.en === 'string' && postDesc.en) return postDesc.en
                                }
                                // numericDesc 처리
                                if (typeof numericDesc === 'string') return numericDesc
                                if (numericDesc && typeof numericDesc === 'object') {
                                  if (typeof numericDesc.ko === 'string' && numericDesc.ko) return numericDesc.ko
                                  if (typeof numericDesc.en === 'string' && numericDesc.en) return numericDesc.en
                                }
                                return '-'
                              })()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {assetLoading && (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">자산 정보 로딩 중...</span>
                      </div>
                    )}

                    {assetError && (
                      <div className="text-red-600 text-sm">
                        자산 정보를 불러올 수 없습니다: {assetError.message}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 사이드바 */}
          <div className="w-full lg:w-80 order-1 lg:order-2 space-y-4 lg:space-y-6">
            <div className="sticky top-6 max-h-[calc(100vh-2rem)] overflow-y-auto">
              {/* 사이드바는 BlogEdit, AssetsEdit에서 구현 */}
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
