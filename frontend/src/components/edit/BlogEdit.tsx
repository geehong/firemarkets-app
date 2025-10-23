'use client'

import React, { useState } from 'react'
import BaseEdit, { BaseEditProps, PostFormState } from './BaseEdit'

interface BlogEditProps extends Omit<BaseEditProps, 'postType'> {
  // BlogEdit 특화 props
  categoryId?: number
  authorId?: number
  tags?: string[]
  featuredImage?: string
  featuredImageAlt?: string
  readingTime?: number
  viewCount?: number
  likeCount?: number
  commentCount?: number
  socialShares?: {
    facebook?: number
    twitter?: number
    linkedin?: number
    total?: number
  }
  seoScore?: number
  readabilityScore?: number
  wordCount?: number
  lastModified?: string
  publishSchedule?: string
  isDraft?: boolean
  isPublished?: boolean
  isArchived?: boolean
  isFeatured?: boolean
  isPinned?: boolean
  allowComments?: boolean
  allowLikes?: boolean
  allowShares?: boolean
  visibility?: 'public' | 'private' | 'password' | 'members'
  accessLevel?: 'free' | 'premium' | 'vip'
  relatedPosts?: number[]
  seriesId?: number
  seriesOrder?: number
  customFields?: Record<string, unknown>
}

export default function BlogEdit({ 
  postId, 
  mode = 'create', 
  onSave,
  onCancel,
  categoryId: _categoryId, // eslint-disable-line @typescript-eslint/no-unused-vars
  authorId: _authorId, // eslint-disable-line @typescript-eslint/no-unused-vars
  tags = [],
  featuredImage = '',
  featuredImageAlt = '',
  readingTime = 0,
  viewCount = 0,
  likeCount = 0,
  commentCount = 0,
  socialShares = {},
  seoScore = 0,
  readabilityScore = 0,
  wordCount = 0,
  lastModified = '',
  publishSchedule = '',
  isDraft = true,
  isPublished = false,
  isArchived = false,
  isFeatured = false,
  isPinned = false,
  allowComments = true,
  allowLikes = true,
  allowShares = true,
  visibility = 'public',
  accessLevel = 'free',
  relatedPosts = [],
  seriesId,
  seriesOrder = 0,
  customFields = {},
  ...props 
}: BlogEditProps) {
  // 블로그 특화 상태 관리
  const [blogState, setBlogState] = useState({
    tags,
    featuredImage,
    featuredImageAlt,
    readingTime,
    viewCount,
    likeCount,
    commentCount,
    socialShares,
    seoScore,
    readabilityScore,
    wordCount,
    lastModified,
    publishSchedule,
    isDraft,
    isPublished,
    isArchived,
    isFeatured,
    isPinned,
    allowComments,
    allowLikes,
    allowShares,
    visibility,
    accessLevel,
    relatedPosts,
    seriesId,
    seriesOrder,
    customFields
  })

  // 태그 관리
  const [tagInput, setTagInput] = useState('')
  
  // 태그 추가
  const addTag = () => {
    if (tagInput.trim() && !blogState.tags.includes(tagInput.trim())) {
      setBlogState(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  // 태그 제거
  const removeTag = (tag: string) => {
    setBlogState(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  // 블로그 상태 업데이트
  const updateBlogState = (field: keyof typeof blogState, value: unknown) => {
    setBlogState(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // SEO 점수 계산
  const calculateSEOScore = (data: PostFormState) => {
    let score = 0
    const maxScore = 100

    // 제목 길이 체크 (30-60자)
    const titleLength = data.title.ko.length
    if (titleLength >= 30 && titleLength <= 60) score += 20

    // 메타 설명 길이 체크 (120-160자)
    const metaDescLength = data.meta_description.ko.length
    if (metaDescLength >= 120 && metaDescLength <= 160) score += 20

    // 키워드 존재 여부
    if (data.keywords.length > 0) score += 15

    // 내용 길이 체크 (최소 300자)
    const contentLength = data.content_ko.length
    if (contentLength >= 300) score += 20

    // 이미지 alt 텍스트
    if (data.cover_image_alt) score += 10

    // 슬러그 최적화
    if (data.slug && data.slug.length > 0) score += 15

    return Math.min(score, maxScore)
  }

  // 가독성 점수 계산
  const calculateReadabilityScore = (content: string) => {
    if (!content) return 0
    
    // 간단한 가독성 점수 계산 (문장 길이, 단락 수 등)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const words = content.split(/\s+/).filter(w => w.length > 0)
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0)
    
    const avgWordsPerSentence = words.length / sentences.length
    const avgSentencesPerParagraph = sentences.length / paragraphs.length
    
    let score = 100
    
    // 문장당 단어 수가 많으면 감점
    if (avgWordsPerSentence > 20) score -= 20
    if (avgWordsPerSentence > 30) score -= 30
    
    // 단락당 문장 수가 많으면 감점
    if (avgSentencesPerParagraph > 8) score -= 15
    
    return Math.max(0, score)
  }

  // 단어 수 계산
  const calculateWordCount = (content: string) => {
    if (!content) return 0
    const textContent = content.replace(/<[^>]*>/g, '')
    const koreanChars = textContent.match(/[가-힣]/g) || []
    const englishWords = textContent.match(/[a-zA-Z]+/g) || []
    return koreanChars.length + englishWords.length
  }

  // BlogEdit 특화 저장 로직
  const handleBlogSave = (data: PostFormState) => {
    // SEO 및 가독성 점수 계산
    const seoScore = calculateSEOScore(data)
    const readabilityScore = calculateReadabilityScore(data.content_ko)
    const wordCount = calculateWordCount(data.content_ko)
    const readingTime = Math.ceil(wordCount / 200) // 분당 200단어 기준

    // 실제 API 구조에 맞춘 데이터 준비
    const blogData = {
      ...data,
      post_type: 'post' as const,
      // API에서 실제로 지원하는 필드들만 포함
      featured: blogState.isFeatured,
      // 추가적인 편집용 필드들은 customFields에 포함
      customFields: {
        ...blogState.customFields,
        tags: blogState.tags,
        seoScore,
        readabilityScore,
        wordCount,
        readingTime,
        isPinned: blogState.isPinned,
        allowComments: blogState.allowComments,
        allowLikes: blogState.allowLikes,
        allowShares: blogState.allowShares,
        visibility: blogState.visibility,
        accessLevel: blogState.accessLevel,
        seriesId: blogState.seriesId,
        seriesOrder: blogState.seriesOrder
      }
    }
    
    console.log('📝 Blog data prepared:', {
      seoScore,
      readabilityScore,
      wordCount,
      readingTime,
      tags: blogState.tags,
      isFeatured: blogState.isFeatured,
      visibility: blogState.visibility
    })
    
    if (onSave) {
      onSave(blogData)
    }
  }

  return (
    <div className="space-y-6">
      {/* 블로그 특화 컨트롤 패널 */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">블로그 설정</h3>
        
        {/* 태그 관리 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            태그
          </label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="태그를 입력하고 Enter를 누르세요"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              추가
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {blogState.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 블로그 상태 설정 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={blogState.isFeatured}
                onChange={(e) => updateBlogState('isFeatured', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">추천 포스트</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={blogState.isPinned}
                onChange={(e) => updateBlogState('isPinned', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">상단 고정</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={blogState.allowComments}
                onChange={(e) => updateBlogState('allowComments', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">댓글 허용</span>
            </label>
          </div>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={blogState.allowLikes}
                onChange={(e) => updateBlogState('allowLikes', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">좋아요 허용</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={blogState.allowShares}
                onChange={(e) => updateBlogState('allowShares', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">공유 허용</span>
            </label>
          </div>
        </div>

        {/* 가시성 설정 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            가시성
          </label>
          <select
            value={blogState.visibility}
            onChange={(e) => updateBlogState('visibility', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="public">공개</option>
            <option value="private">비공개</option>
            <option value="password">비밀번호 보호</option>
            <option value="members">회원만</option>
          </select>
        </div>

        {/* 접근 레벨 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            접근 레벨
          </label>
          <select
            value={blogState.accessLevel}
            onChange={(e) => updateBlogState('accessLevel', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="free">무료</option>
            <option value="premium">프리미엄</option>
            <option value="vip">VIP</option>
          </select>
        </div>

        {/* 시리즈 설정 */}
        {(blogState.seriesId || seriesId) && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시리즈 순서
            </label>
            <input
              type="number"
              value={blogState.seriesOrder}
              onChange={(e) => updateBlogState('seriesOrder', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="시리즈 내 순서"
            />
          </div>
        )}
      </div>

      {/* BaseEdit 컴포넌트 */}
      <BaseEdit
        postId={postId}
        mode={mode}
        postType="post"
        onSave={handleBlogSave}
        onCancel={onCancel}
        {...props}
      />
    </div>
  )
}
