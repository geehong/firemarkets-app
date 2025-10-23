'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import SimpleCKEditor from './SimpleCKEditor'
// import { apiClient } from '@/lib/api' // 사용하지 않으므로 주석 처리

// SimpleCKEditor에서 타입 선언을 관리하므로 여기서는 불필요

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
}

export default function BaseEdit({ 
  postId, 
  mode = 'create', 
  postType,
  onSave,
  onCancel 
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

  const [keywordInput, setKeywordInput] = useState('')
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
          console.log('🌐 API Base URL:', process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1')
          
          const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'}/posts/${postId}`
          console.log('🔗 Full API URL:', apiUrl)
          
          const response = await fetch(apiUrl)
          console.log('📊 Response status:', response.status, response.statusText)
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()
          console.log('📦 Raw API response:', data)
          
          if (data) {
            console.log('📝 Processing post data...', {
              hasTitle: !!data.title,
              hasContent: !!data.content,
              hasContentKo: !!data.content_ko,
              hasExcerpt: !!data.excerpt,
              titleType: typeof data.title,
              contentType: typeof data.content,
              contentKoType: typeof data.content_ko,
              contentPreview: data.content?.substring(0, 100) + '...',
              contentKoPreview: data.content_ko?.substring(0, 100) + '...'
            })
            
            // 실제 API 응답 구조에 맞춘 데이터 처리
            const processedData = {
              id: data.id,
              title: typeof data.title === 'object' ? data.title : { ko: data.title || '', en: data.title || '' },
              content: data.content || '',
              content_ko: data.content_ko || '',
              description: typeof data.description === 'object' ? data.description : { ko: data.description || '', en: data.description || '' },
              excerpt: typeof data.excerpt === 'object' ? data.excerpt : { ko: data.excerpt || '', en: data.excerpt || '' },
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
              meta_title: typeof data.meta_title === 'object' ? data.meta_title : { ko: data.meta_title || '', en: data.meta_title || '' },
              meta_description: typeof data.meta_description === 'object' ? data.meta_description : { ko: data.meta_description || '', en: data.meta_description || '' },
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
            
            console.log('🔄 Setting form data:', {
              title: processedData.title,
              content: processedData.content,
              content_ko: processedData.content_ko,
              contentLength: processedData.content?.length || 0,
              contentKoLength: processedData.content_ko?.length || 0
            })
            
            setFormData(processedData)
            
            console.log('✅ Post data loaded and set successfully')
          } else {
            console.warn('⚠️ No data received from API')
          }
        } catch (error) {
          console.error('❌ Error fetching post data:', error)
          console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          })
        } finally {
          setLoading(false)
        }
      }

      fetchPostData()
    }
  }, [mode, postId, postType])

  // SimpleCKEditor는 자체적으로 상태를 관리하므로 복잡한 useEffect 불필요

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
    console.log('📝 updateFormData called:', { field, value, activeLanguage })
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      }
      console.log('🔄 FormData updated via updateFormData:', newData)
      return newData
    })
  }

  // 다국어 필드 업데이트
  const updateMultilingualField = (field: keyof Pick<PostFormState, 'title' | 'description' | 'excerpt' | 'meta_title' | 'meta_description'>, value: string) => {
    console.log('🌐 updateMultilingualField called:', { field, value, activeLanguage })
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: {
          ...prev[field],
          [activeLanguage]: value
        }
      }
      console.log('🔄 Multilingual field updated:', { field, newValue: newData[field] })
      return newData
    })
  }

  // 키워드 추가
  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }))
      setKeywordInput('')
    }
  }

  // 키워드 제거
  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
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
  const handleSave = async (status: 'draft' | 'published' = 'draft') => {
    try {
      setSaving(true)
      
      const postData = {
        ...formData,
        status,
        published_at: status === 'published' ? new Date().toISOString() : formData.published_at
      }

      if (mode === 'create') {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'}/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData)
        })
        const result = await response.json()
        console.log('Post created:', result)
      } else if (mode === 'edit' && postId) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1'}/posts/${postId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData)
        })
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
  }

  // 취소 함수
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* 언어 선택 */}
      <div className="mb-6">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => {
              console.log('🇰🇷 Switching to Korean')
              setActiveLanguage('ko')
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
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
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeLanguage === 'en'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* 제목 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          제목 ({activeLanguage === 'ko' ? '한국어' : 'English'})
        </label>
        <input
          type="text"
          value={formData.title[activeLanguage]}
          onChange={(e) => updateMultilingualField('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="제목을 입력하세요"
        />
      </div>

      {/* 슬러그 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          슬러그
        </label>
        <input
          type="text"
          value={formData.slug}
          onChange={(e) => updateFormData('slug', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="URL 슬러그를 입력하세요"
        />
        <button
          type="button"
          onClick={() => updateFormData('slug', generateSlug(formData.title[activeLanguage]))}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          제목에서 자동 생성
        </button>
      </div>

      {/* 커버 이미지 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          커버 이미지 URL
        </label>
        <input
          type="url"
          value={formData.cover_image}
          onChange={(e) => updateFormData('cover_image', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://example.com/image.jpg"
        />
      </div>

      {/* 커버 이미지 Alt 텍스트 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          커버 이미지 Alt 텍스트
        </label>
        <input
          type="text"
          value={formData.cover_image_alt}
          onChange={(e) => updateFormData('cover_image_alt', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="이미지에 대한 설명을 입력하세요"
        />
      </div>

      {/* Canonical URL */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Canonical URL
        </label>
        <input
          type="url"
          value={formData.canonical_url}
          onChange={(e) => updateFormData('canonical_url', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://example.com/canonical-url"
        />
      </div>

      {/* 설명 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          설명 ({activeLanguage === 'ko' ? '한국어' : 'English'})
        </label>
        <textarea
          value={formData.description[activeLanguage]}
          onChange={(e) => updateMultilingualField('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="블로그 글에 대한 간단한 설명을 입력하세요"
        />
      </div>

      {/* 요약 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          요약 ({activeLanguage === 'ko' ? '한국어' : 'English'})
        </label>
        <textarea
          value={formData.excerpt[activeLanguage]}
          onChange={(e) => updateMultilingualField('excerpt', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="요약을 입력하세요"
        />
      </div>

      {/* 본문 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          본문 ({activeLanguage === 'ko' ? '한국어' : 'English'})
        </label>
        <SimpleCKEditor
          value={activeLanguage === 'ko' ? formData.content_ko : formData.content}
          onChange={handleEditorChange}
          placeholder="본문을 입력하세요..."
          height={400}
        />
      </div>

      {/* 메타 제목 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          메타 제목 ({activeLanguage === 'ko' ? '한국어' : 'English'})
        </label>
        <input
          type="text"
          value={formData.meta_title[activeLanguage]}
          onChange={(e) => updateMultilingualField('meta_title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="SEO 메타 제목을 입력하세요"
        />
      </div>

      {/* 메타 설명 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          메타 설명 ({activeLanguage === 'ko' ? '한국어' : 'English'})
        </label>
        <textarea
          value={formData.meta_description[activeLanguage]}
          onChange={(e) => updateMultilingualField('meta_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="SEO 메타 설명을 입력하세요"
        />
      </div>

      {/* 키워드 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          키워드
        </label>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="키워드를 입력하고 Enter를 누르세요"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            추가
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.keywords.map((keyword, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {keyword}
              <button
                type="button"
                onClick={() => removeKeyword(keyword)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* 읽기 시간 표시 */}
      {formData.read_time_minutes && formData.read_time_minutes > 0 && (
        <div className="mb-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            📖 예상 읽기 시간: {formData.read_time_minutes}분
          </p>
        </div>
      )}

      {/* 기본 버튼들 */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={handleCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => handleSave('draft')}
          disabled={saving}
          className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '임시저장'}
        </button>
        <button
          type="button"
          onClick={() => handleSave('published')}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {saving ? '발행 중...' : '발행'}
        </button>
      </div>
    </div>
  )
}
