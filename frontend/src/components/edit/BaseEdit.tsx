'use client'

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import SimpleCKEditor from './SimpleCKEditor'
import FinancialDataBlock from './editorblock/FinancialDataBlock'

// 인증 헤더를 가져오는 헬퍼 함수
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('accessToken')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

// FinancialData 타입 정의
interface FinancialData {
  financial_id: number
  asset_id: number
  snapshot_date: string
  currency: string | null
  market_cap: number | null
  ebitda: number | null
  shares_outstanding: number | null
  pe_ratio: number | null
  peg_ratio: number | null
  beta: number | null
  eps: number | null
  dividend_yield: number | null
  dividend_per_share: number | null
  profit_margin_ttm: number | null
  return_on_equity_ttm: number | null
  revenue_ttm: number | null
  price_to_book_ratio: number | null
  week_52_high: number | null
  week_52_low: number | null
  day_50_moving_avg: number | null
  day_200_moving_avg: number | null
  updated_at: string
  // 추가 필드들
  book_value: number | null
  revenue_per_share_ttm: number | null
  operating_margin_ttm: number | null
  return_on_assets_ttm: number | null
  gross_profit_ttm: number | null
  quarterly_earnings_growth_yoy: number | null
  quarterly_revenue_growth_yoy: number | null
  analyst_target_price: number | null
  trailing_pe: number | null
  forward_pe: number | null
  price_to_sales_ratio_ttm: number | null
  ev_to_revenue: number | null
  ev_to_ebitda: number | null
}

// 실제 API 응답 구조에 맞춘 PostFormState 타입
export type PostFormState = {
  // API에서 실제로 제공하는 필드들
  id?: number
  title: { ko: string; en: string }
  content: string // 영문 content
  content_ko: string // 한글 content
  description: { ko: string; en: string }
  excerpt: { ko: string; en: string }
  slug: string
  status: 'draft' | 'published' | 'private' | 'scheduled'
  featured: boolean
  post_type: 'post' | 'page' | 'tutorial' | 'news' | 'assets' | 'onchain'
  view_count: number
  created_at?: string
  updated_at?: string
  published_at?: string
  scheduled_at?: string
  
  // API에서 실제로 제공하는 필수 필드들
  author_id: number | null
  category_id: number | null
  cover_image: string | null
  cover_image_alt: string | null
  keywords: string[] | null
  canonical_url: string | null
  meta_title: { ko: string; en: string }
  meta_description: { ko: string; en: string }
  read_time_minutes: number | null
  
  // 추가 API 필드들
  sync_with_asset?: boolean
  auto_sync_content?: boolean
  asset_id?: number | null
  post_parent?: number | null
  menu_order?: number
  comment_count?: number
  post_password?: string | null
  ping_status?: string
  last_sync_at?: string | null
  sync_status?: 'pending' | 'synced' | 'failed'
}

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
  financialData?: FinancialData | null
  onSaveFinancial?: (data: Partial<FinancialData>) => Promise<void>
  // PublishingBlock에서 사용할 handleSave 함수
  onHandleSave?: (handleSave: (status: 'draft' | 'published') => Promise<void>) => void
  // saving 상태 전달
  onSavingChange?: (saving: boolean) => void
  // formData와 updateFormData를 children에 전달하기 위한 props
  onFormDataChange?: (formData: PostFormState) => void
  onUpdateFormData?: (field: keyof PostFormState, value: string | number | boolean | string[] | { ko: string; en: string } | null) => void
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
  onHandleSave,
  onSavingChange,
  onFormDataChange,
  onUpdateFormData
}: BaseEditProps) {
  const [formData, setFormData] = useState<PostFormState>({
    // API에서 실제로 제공하는 필드들
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
    
    // API에서 실제로 제공하는 필수 필드들
    author_id: null,
    category_id: null,
    cover_image: null,
    cover_image_alt: null,
    keywords: null,
    canonical_url: null,
    meta_title: { ko: '', en: '' },
    meta_description: { ko: '', en: '' },
    read_time_minutes: null,
    
    // 추가 API 필드들
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

  const [activeLanguage, setActiveLanguage] = useState<'ko' | 'en'>('ko')
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

  // 수정 모드일 때 기존 데이터 불러오기
  useEffect(() => {
    if (mode === 'edit' && postId) {
      const fetchPostData = async () => {
        try {
          setLoading(true)
          console.log('📡 Fetching post data for ID:', postId)
          
          const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'}/posts/${postId}`
          const response = await fetch(apiUrl)
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()
          console.log('📦 Raw API response:', data)
          
          if (data) {
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
              id: data.id,
              title: processMultilingualField(data.title),
              content: data.content || '',
              content_ko: data.content_ko || '',
              description: processMultilingualField(data.description),
              excerpt: processMultilingualField(data.excerpt),
              slug: data.slug || '',
              status: data.status || 'draft',
              featured: data.featured || false,
              post_type: data.post_type || postType,
              view_count: data.view_count || 0,
              created_at: data.created_at,
              updated_at: data.updated_at,
              published_at: data.published_at,
              scheduled_at: data.scheduled_at,
              
              // API에서 실제로 제공하는 필수 필드들
              author_id: data.author_id || null,
              category_id: data.category_id || null,
              cover_image: data.cover_image || null,
              cover_image_alt: data.cover_image_alt || null,
              keywords: data.keywords || null,
              canonical_url: data.canonical_url || null,
              meta_title: processMultilingualField(data.meta_title),
              meta_description: processMultilingualField(data.meta_description),
              read_time_minutes: data.read_time_minutes || null,
              
              // 추가 API 필드들
              sync_with_asset: data.sync_with_asset || false,
              auto_sync_content: data.auto_sync_content || false,
              asset_id: data.asset_id || null,
              post_parent: data.post_parent || null,
              menu_order: data.menu_order || 0,
              comment_count: data.comment_count || 0,
              post_password: data.post_password || null,
              ping_status: data.ping_status || 'open',
              last_sync_at: data.last_sync_at || null,
              sync_status: data.sync_status || 'pending'
            }
            
            console.log('📝 Processed data:', {
              title: processedData.title,
              description: processedData.description,
              excerpt: processedData.excerpt
            })
            setFormData(processedData)
            console.log('✅ Post data loaded and set successfully')
          }
        } catch (error) {
          console.error('❌ Error fetching post data:', error)
        } finally {
          setLoading(false)
        }
      }

      fetchPostData()
    }
  }, [mode, postId, postType])

  // 내용이 변경될 때마다 읽기 시간 업데이트
  useEffect(() => {
    const currentContent = activeLanguage === 'ko' ? formData.content_ko : formData.content
    const readTime = calculateReadTime(currentContent)
    setFormData(prev => ({
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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 다국어 필드 업데이트
  const updateMultilingualField = (field: keyof Pick<PostFormState, 'title' | 'description' | 'excerpt' | 'meta_title' | 'meta_description'>, value: string) => {
    const currentFieldValue = formData[field]
    const newValue = {
      ko: '',
      en: '',
      ...(typeof currentFieldValue === 'object' && currentFieldValue !== null ? currentFieldValue : {}),
      [activeLanguage]: value
    }
    
    setFormData(prev => ({
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

  // 저장 함수
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
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'}/posts`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(postData)
        })
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('인증이 필요합니다. 로그인해주세요.')
          }
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.detail || `서버 오류: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('Post created:', result)
      } else if (mode === 'edit' && postId) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'}/posts/${postId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(postData)
        })
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('인증이 필요합니다. 로그인해주세요.')
          }
          const errorData = await response.json().catch(() => ({}))
          console.error('API Error Details:', errorData)
          console.error('API Error Details (full):', JSON.stringify(errorData, null, 2))
          
          // 422 오류의 경우 상세한 유효성 검사 오류 표시
          if (response.status === 422) {
            const validationErrors = errorData.detail || errorData.errors || errorData
            console.error('Validation errors:', validationErrors)
            
            if (Array.isArray(validationErrors)) {
              const errorMessages = validationErrors.map(err => {
                if (typeof err === 'object' && err !== null) {
                  return `${err.field || err.loc?.join('.') || '필드'}: ${err.message || err.msg || err.type || JSON.stringify(err)}`
                }
                return String(err)
              }).join(', ')
              throw new Error(`유효성 검사 오류: ${errorMessages}`)
            } else if (typeof validationErrors === 'string') {
              throw new Error(`유효성 검사 오류: ${validationErrors}`)
            } else {
              throw new Error(`유효성 검사 오류: ${JSON.stringify(validationErrors)}`)
            }
          }
          
          throw new Error(errorData.detail || `서버 오류: ${response.status}`)
        }
        
        const result = await response.json()
        console.log('Post updated:', result)
      }

      if (onSave) {
        onSave(postData)
      }
    } catch (error) {
      console.error('Failed to save post:', error)
    } finally {
      setSaving(false)
    }
  }, [formData, mode, postId, postType, onSave])

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
              <button
                type="button"
                onClick={() => {
                  console.log('🇰🇷 Switching to Korean')
                  setActiveLanguage('ko')
                }}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  activeLanguage === 'ko'
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
                  setActiveLanguage('en')
                }}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  activeLanguage === 'en'
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
                  onChange={(e) => updateMultilingualField('title', e.target.value)}
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
                    onChange={(e) => updateFormData('slug', e.target.value)}
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
                  onChange={(e) => updateMultilingualField('excerpt', e.target.value)}
                  rows={3}
                  className="w-full border-none outline-none resize-none"
                  placeholder="요약을 입력하세요..."
                />
              </div>

              {/* 본문 */}
              <div className="p-6">
                <SimpleCKEditor
                  value={activeLanguage === 'ko' ? formData.content_ko : formData.content}
                  onChange={handleEditorChange}
                  placeholder="본문을 입력하세요..."
                  height={500}
                />
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
