'use client'

import React, { useState } from 'react'
import BaseEdit, { BaseEditProps, PostFormState } from './BaseEdit'
import PublishingBlock from './editorblock/PublishingBlock'
import ContentBlock from './editorblock/ContentBlock'
import SEOSettings from './editorblock/SEOSettings'

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
  // 블로그 특화 상태 관리 (향후 기능용)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // 향후 기능: 태그 관리 - DB 컬럼 없음
  // const [tagInput, setTagInput] = useState('')
  
  // 향후 기능: 태그 추가 - DB 컬럼 없음
  // const addTag = () => {
  //   if (tagInput.trim() && !blogState.tags.includes(tagInput.trim())) {
  //     setBlogState(prev => ({
  //       ...prev,
  //       tags: [...prev.tags, tagInput.trim()]
  //     }))
  //     setTagInput('')
  //   }
  // }

  // 향후 기능: 태그 제거 - DB 컬럼 없음
  // const removeTag = (tag: string) => {
  //   setBlogState(prev => ({
  //     ...prev,
  //     tags: prev.tags.filter(t => t !== tag)
  //   }))
  // }

  // 향후 기능: 블로그 상태 업데이트 - DB 컬럼 없음
  // const updateBlogState = (field: keyof typeof blogState, value: unknown) => {
  //   setBlogState(prev => ({
  //     ...prev,
  //     [field]: value
  //   }))
  // }

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
    if (data.keywords && data.keywords.length > 0) score += 15

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
    <BaseEdit
      postId={postId}
      mode={mode}
      postType="post"
      onSave={handleBlogSave}
      onCancel={onCancel}
      {...props}
    >
      {/* 퍼블리싱 블럭 */}
      <PublishingBlock
        status={formData.status}
        onStatusChange={(status) => updateFormData('status', status)}
        onPreview={() => console.log('미리보기')}
        onPublish={() => handleBlogSave({ ...formData, status: 'published' })}
        onSaveDraft={() => handleBlogSave({ ...formData, status: 'draft' })}
        saving={saving}
      />

      {/* 작성내용 블럭 */}
      <ContentBlock
        postType={formData.post_type}
        onPostTypeChange={(postType) => updateFormData('post_type', postType)}
        authorId={formData.author_id}
        onAuthorIdChange={(authorId) => updateFormData('author_id', authorId)}
        categoryId={formData.category_id}
        onCategoryIdChange={(categoryId) => updateFormData('category_id', categoryId)}
        postParent={formData.post_parent}
        onPostParentChange={(postParent) => updateFormData('post_parent', postParent)}
        postPassword={formData.post_password}
        onPostPasswordChange={(postPassword) => updateFormData('post_password', postPassword)}
        featured={formData.featured}
        onFeaturedChange={(featured) => updateFormData('featured', featured)}
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
