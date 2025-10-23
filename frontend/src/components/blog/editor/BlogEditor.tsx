'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Save, Eye, Calendar, Image as ImageIcon, Tag, FileText } from 'lucide-react'
import { apiClient } from '@/lib/api'

type BlogFormState = {
  title: string
  slug: string
  description: string
  content: string
  excerpt: string
  status: 'draft' | 'published' | 'private' | 'scheduled'
  featured: boolean
  author_id: number | null
  category_id: number | null
  cover_image: string
  cover_image_alt: string
  meta_title: string
  meta_description: string
  keywords: string[]
  canonical_url: string
  post_type: 'post' | 'page' | 'tutorial' | 'news' | 'assets' | 'onchain'
  published_at: string
  scheduled_at: string
  
  // Asset 연동 필드들
  asset_id: number | null
  sync_with_asset: boolean
  auto_sync_content: boolean
  
  // 구조 필드들
  post_parent: number | null
  menu_order: number
  
  // 보안 필드들
  post_password: string
  
  // 동기화 필드들
  sync_status: 'pending' | 'synced' | 'failed'
  last_sync_at: string
  
  // 읽기 시간 (자동 계산)
  read_time_minutes: number | null
}

export default function BlogEditor() {
  const [formData, setFormData] = useState<BlogFormState>({
    title: '',
    slug: '',
    description: '',
    content: '',
    excerpt: '',
    status: 'draft',
    featured: false,
    author_id: null,
    category_id: null,
    cover_image: '',
    cover_image_alt: '',
    meta_title: '',
    meta_description: '',
    keywords: [],
    canonical_url: '',
    post_type: 'post',
    published_at: '',
    scheduled_at: '',
    
    // Asset 연동 필드들
    asset_id: null,
    sync_with_asset: false,
    auto_sync_content: false,
    
    // 구조 필드들
    post_parent: null,
    menu_order: 0,
    
    // 보안 필드들
    post_password: '',
    
    // 동기화 필드들
    sync_status: 'pending',
    last_sync_at: '',
    
    // 읽기 시간 (자동 계산)
    read_time_minutes: null
  })

  const [keywordInput, setKeywordInput] = useState('')
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const ckEditorRef = useRef<any>(null)

  // CKEditor 4.22.1 setup
  useEffect(() => {
    // CKEditor 보안 경고 필터링
    const originalWarn = console.warn;
    console.warn = function(message: string) {
      if (message && (
        message.includes('not secure') || 
        message.includes('4.22.1') ||
        message.includes('Consider upgrading')
      )) {
        return; // CKEditor 보안 경고 무시
      }
      originalWarn.apply(console, arguments as any);
    };

    const loadCKEditor = () => {
      if (typeof window !== 'undefined' && (window as any).CKEDITOR && editorRef.current) {
        // CKEditor가 이미 로드되어 있는 경우
        if (ckEditorRef.current) {
          ckEditorRef.current.destroy()
        }
        
        ckEditorRef.current = (window as any).CKEDITOR.replace(editorRef.current, {
          height: 300,
          language: 'ko',
          // 보안 경고 비활성화
          startupMode: 'wysiwyg',
          removePlugins: 'scayt,wsc,exportpdf',
          // PDF 내보내기 관련 설정 비활성화
          exportPdf_tokenUrl: '',
          exportPdf_url: '',
          // 알림 비활성화
          notification_duration: 0,
          // 버전 체크 비활성화
          versionCheck: false,
          // 알림 시스템 완전 비활성화
          on: {
            instanceReady: function(evt: any) {
              // 알림 영역 숨기기
              const notificationArea = document.getElementById('cke_notifications_area_content');
              if (notificationArea) {
                notificationArea.style.display = 'none';
              }
            },
            change: (evt: any) => {
              const data = evt.editor.getData()
              if (data !== formData.content) {
                setFormData(prev => ({ ...prev, content: data }))
              }
            }
          },
          toolbar: [
            { name: 'document', items: ['Source', '-', 'NewPage', 'Preview', 'Print', '-', 'Templates'] },
            { name: 'clipboard', items: ['Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', '-', 'Undo', 'Redo'] },
            { name: 'editing', items: ['Find', 'Replace', '-', 'SelectAll', '-', 'Scayt'] },
            { name: 'forms', items: ['Form', 'Checkbox', 'Radio', 'TextField', 'Textarea', 'Select', 'Button', 'ImageButton', 'HiddenField'] },
            '/',
            { name: 'basicstyles', items: ['Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', '-', 'CopyFormatting', 'RemoveFormat'] },
            { name: 'paragraph', items: ['NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'Blockquote', 'CreateDiv', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock', '-', 'BidiLtr', 'BidiRtl'] },
            { name: 'links', items: ['Link', 'Unlink', 'Anchor'] },
            { name: 'insert', items: ['Image', 'Flash', 'Table', 'HorizontalRule', 'Smiley', 'SpecialChar', 'PageBreak', 'Iframe'] },
            '/',
            { name: 'styles', items: ['Styles', 'Format', 'Font', 'FontSize'] },
            { name: 'colors', items: ['TextColor', 'BGColor'] },
            { name: 'tools', items: ['Maximize', 'ShowBlocks'] },
            { name: 'about', items: ['About'] }
          ]
        })
      }
    }

    // CKEditor 스크립트가 로드되지 않은 경우 로드
    if (typeof window !== 'undefined' && !(window as any).CKEDITOR) {
      const script = document.createElement('script')
      script.src = '/ckeditor/ckeditor.js'
      script.onload = loadCKEditor
      document.head.appendChild(script)
    } else {
      loadCKEditor()
    }

    return () => {
      if (ckEditorRef.current) {
        ckEditorRef.current.destroy()
      }
    }
  }, [])

  // Sync editor content when formData.content changes externally
  useEffect(() => {
    if (ckEditorRef.current && formData.content !== ckEditorRef.current.getData()) {
      ckEditorRef.current.setData(formData.content)
    }
  }, [formData.content])

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

  // 내용이 변경될 때마다 읽기 시간 업데이트
  useEffect(() => {
    const readTime = calculateReadTime(formData.content)
    setFormData(prev => ({
      ...prev,
      read_time_minutes: readTime
    }))
  }, [formData.content])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleKeywordAdd = () => {
    if (keywordInput.trim()) {
      setFormData(prev => ({
        ...prev,
        keywords: [...(prev.keywords || []), keywordInput.trim()]
      }))
      setKeywordInput('')
    }
  }

  const handleKeywordRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }))
  }

  const handleSaveDraft = async () => {
    try {
      const draftData = { ...formData, status: 'draft' as const }
      const response = await apiClient.createBlog(draftData)
      console.log('Draft saved:', response)
      alert('✅ 임시저장되었습니다!\n\n제목: ' + draftData.title + '\n포스트 ID: ' + response.id)
    } catch (error) {
      console.error('Draft save error:', error)
      alert('❌ 임시저장 실패: ' + (error as Error).message)
    }
  }

  const handlePublish = async () => {
    if (!formData.title || !formData.slug || !formData.content) {
      alert('⚠️ 필수 항목을 입력해주세요.\n- 제목\n- 슬러그\n- 본문 내용')
      return
    }
    
    try {
      const publishedData = {
        ...formData,
        status: 'published' as const,
        published_at: formData.published_at || new Date().toISOString()
      }
      const response = await apiClient.createBlog(publishedData)
      console.log('Published:', response)
      alert('🎉 발행되었습니다!\n\n제목: ' + publishedData.title + '\n포스트 ID: ' + response.id)
    } catch (error) {
      console.error('Publish error:', error)
      alert('❌ 발행 실패: ' + (error as Error).message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">블로그 글 작성</h1>
            <div className="flex gap-3">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Eye className="w-4 h-4" />
                미리보기
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="flex items-center gap-2 px-5 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Save className="w-4 h-4" />
                임시저장
              </button>
              <button
                type="button"
                onClick={handlePublish}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                발행하기
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  제목 *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="블로그 글 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  슬러그 *
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="url-friendly-slug"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  요약 설명 *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="블로그 글에 대한 간단한 설명을 입력하세요"
                />
              </div>
            </div>

            {/* 본문 에디터 (CKEditor 4.22.1) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                본문 내용 *
              </label>
              <div className="border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                <textarea
                  ref={editorRef}
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 resize-none text-gray-900 dark:text-gray-100"
                  placeholder="본문 내용을 입력하세요"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                발췌
              </label>
              <textarea
                name="excerpt"
                value={formData.excerpt}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="짧은 발췌문 (선택사항)"
              />
            </div>

            {/* 이미지 및 미디어 */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <ImageIcon className="w-5 h-5 mr-2" />
                커버 이미지
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    이미지 URL
                  </label>
                  <input
                    type="url"
                    name="cover_image"
                    value={formData.cover_image}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    이미지 대체 텍스트
                  </label>
                  <input
                    type="text"
                    name="cover_image_alt"
                    value={formData.cover_image_alt}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="이미지 설명"
                  />
                </div>
              </div>
            </div>

            {/* 분류 및 상태 */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">분류 및 설정</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    상태
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="draft">초안</option>
                    <option value="published">공개</option>
                    <option value="private">비공개</option>
                    <option value="scheduled">예약</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    포스트 타입
                  </label>
                  <select
                    name="post_type"
                    value={formData.post_type}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="post">일반 포스트</option>
                    <option value="page">페이지</option>
                    <option value="tutorial">튜토리얼</option>
                    <option value="news">뉴스</option>
                    <option value="assets">자산</option>
                    <option value="onchain">온체인 메트릭</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    작성자 ID
                  </label>
                  <input
                    type="number"
                    name="author_id"
                    value={formData.author_id ?? ''}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="작성자 ID"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    카테고리 ID
                  </label>
                  <input
                    type="number"
                    name="category_id"
                    value={formData.category_id ?? ''}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="카테고리 ID"
                  />
                </div>

                {/* Asset 연동 필드들 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Asset ID
                  </label>
                  <input
                    type="number"
                    name="asset_id"
                    value={formData.asset_id ?? ''}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="연동할 Asset ID"
                  />
                </div>

                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="sync_with_asset"
                      checked={formData.sync_with_asset}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Asset과 동기화
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="auto_sync_content"
                      checked={formData.auto_sync_content}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      자동 콘텐츠 동기화
                    </label>
                  </div>
                </div>

                {/* 구조 필드들 */}
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      부모 포스트 ID
                    </label>
                    <input
                      type="number"
                      name="post_parent"
                      value={formData.post_parent ?? ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="부모 포스트 ID"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      메뉴 순서
                    </label>
                    <input
                      type="number"
                      name="menu_order"
                      value={formData.menu_order}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="메뉴 순서"
                    />
                  </div>
                </div>

                {/* 보안 필드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    포스트 비밀번호
                  </label>
                  <input
                    type="password"
                    name="post_password"
                    value={formData.post_password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="비밀번호 보호 (선택사항)"
                  />
                </div>

                {/* 읽기 시간 표시 */}
                {formData.read_time_minutes && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      📖 예상 읽기 시간: {formData.read_time_minutes}분
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-700 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">추천 글로 설정</span>
                </label>
              </div>
            </div>

            {/* 키워드 */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                키워드
              </h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleKeywordAdd()
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="키워드 입력 후 추가 버튼 클릭 또는 Enter"
                />
                <button
                  type="button"
                  onClick={handleKeywordAdd}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  추가
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.keywords?.map((keyword, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleKeywordRemove(index)}
                      className="hover:text-blue-900 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* SEO 설정 */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">SEO 설정</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    메타 제목
                  </label>
                  <input
                    type="text"
                    name="meta_title"
                    value={formData.meta_title}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="검색 엔진에 표시될 제목"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    메타 설명
                  </label>
      <textarea
                    name="meta_description"
                    value={formData.meta_description}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="검색 엔진에 표시될 설명"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Canonical URL
                  </label>
                  <input
                    type="url"
                    name="canonical_url"
                    value={formData.canonical_url}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="https://example.com/original-post"
                  />
                </div>
              </div>
            </div>

            {/* 발행 일정 */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                발행 일정
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    발행일
                  </label>
                  <input
                    type="datetime-local"
                    name="published_at"
                    value={formData.published_at}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    예약 발행일
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduled_at"
                    value={formData.scheduled_at}
        onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}