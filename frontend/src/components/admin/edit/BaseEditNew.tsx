'use client'

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import dynamic from 'next/dynamic'
import SimpleQuillEditor from './htmledit/SimpleQuillEditor'
import ShortcodeInsertionBlock from './editorblock/ShortcodeInsertionBlock'

const SimpleTinyMceEditor = dynamic(() => import('./htmledit/SimpleTinyMceEditor'), { ssr: false })

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
  post_type: 'post' | 'page' | 'tutorial' | 'news' | 'assets' | 'onchain' | 'brief_news' | 'raw_news' | 'ai_draft_news'
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
}

export default function BaseEdit({
  postId,
  mode = 'create',
  postType,
  onSave,
  onCancel,
  children
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
  const [useTinyMce, setUseTinyMce] = useState(false) // Toggle for TinyMCE

  // CKEditor 내용 변경을 추적하기 위한 ref
  const editorContentRef = useRef<string>('')
  const isUpdatingFromEditor = useRef(false)

  // CKEditor onChange 핸들러를 useCallback으로 안정화
  const handleEditorChange = useCallback((value: string) => {
    // 무한 루프 방지: 에디터에서 변경된 값만 업데이트
    if (!isUpdatingFromEditor.current && value !== editorContentRef.current) {
      isUpdatingFromEditor.current = true
      editorContentRef.current = value

      setFormData(prev => {
        const generatedExcerpt = extractHeadings(value)
        const currentExcerpt = prev.excerpt as any || { ko: '', en: '' }

        return {
          ...prev,
          [activeLanguage === 'ko' ? 'content_ko' : 'content']: value,
          excerpt: { ...currentExcerpt, [activeLanguage]: generatedExcerpt }
        }
      })

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
    setFormData(prev => {
      const current = prev[field] as any || { ko: '', en: '' }
      const updatedMultilingualValue = { ...current, [activeLanguage]: value };

      const newState = {
        ...prev,
        [field]: updatedMultilingualValue
      }

      // 설명(description)이 변경될 때, 메타 설명(meta_description)도 동기화 (SEO)
      if (field === 'description') {
        newState.meta_description = {
          ...(newState.meta_description as any || { ko: '', en: '' }),
          [activeLanguage]: value
        }
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

  // 숏코드 삽입 핸들러
  const handleInsertShortcode = (shortcode: string) => {
    setFormData(prev => {
      const field = activeLanguage === 'ko' ? 'content_ko' : 'content'
      const currentContent = prev[field]
      // Append content. Ideally insert at cursor, but appending is safer for state manipulation without ref
      return {
        ...prev,
        [field]: currentContent + `\n<p>${shortcode}</p>`
      }
    })
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
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">
              {mode === 'create' ? '새 포스트 작성' : '포스트 편집'}
            </h1>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  console.log('🇰🇷 Switching to Korean')
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
          <div className="flex space-x-3">
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
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* 왼쪽: 메인 편집 영역 */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm">
              {/* 제목 */}
              <div className="p-6 border-b">
                <input
                  type="text"
                  value={formData.title[activeLanguage]}
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
                    onClick={() => updateFormData('slug', generateSlug(formData.title[activeLanguage]))}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    자동 생성
                  </button>
                </div>
              </div>

              {/* 설명 (Description) */}
              <div className="p-6 border-b">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  설명 (Description) - {activeLanguage === 'ko' ? '한국어' : 'English'}
                </label>
                <textarea
                  value={formData.description[activeLanguage]}
                  onChange={(e) => updateMultilingualField('description', e.target.value)}
                  rows={3}
                  className="w-full border-none outline-none resize-none text-gray-700 bg-gray-50 p-2 rounded"
                  placeholder="포스트 설명을 입력하세요..."
                />
              </div>

              {/* 본문 */}
              <div className="p-6">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setUseTinyMce(!useTinyMce)}
                    className="text-xs text-gray-500 hover:text-blue-600 underline"
                  >
                    {useTinyMce ? 'Switch to Quill' : 'Switch to TinyMCE'}
                  </button>
                </div>
                {useTinyMce ? (
                  <SimpleTinyMceEditor
                    key={`tinymce-${activeLanguage}`}
                    value={activeLanguage === 'ko' ? formData.content_ko : formData.content}
                    onChange={(val) => {
                      // TinyMCE Change Handler
                      handleEditorChange(val)
                    }}
                    placeholder="본문을 입력하세요..."
                    height={500}
                  />
                ) : (
                  <SimpleQuillEditor
                    key={`quill-${activeLanguage}`}
                    value={activeLanguage === 'ko' ? formData.content_ko : formData.content}
                    onChange={handleEditorChange}
                    placeholder="본문을 입력하세요..."
                    height={500}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 사이드바 */}
          <div className="w-80 space-y-6">
            <ShortcodeInsertionBlock onInsert={handleInsertShortcode} />
            {/* 사이드바는 BlogEdit, AssetsEdit에서 구현 */}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
