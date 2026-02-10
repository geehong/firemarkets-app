'use client'

import React, { useState } from 'react'
import BaseEdit, { BaseEditProps, PostFormState } from './BaseEdit'
import PublishingBlock from './editorblock/PublishingBlock'
import ContentBlock from './editorblock/ContentBlock'
import SEOSettings from './editorblock/SEOSettings'
import PostInfoBlock from './editorblock/PostInfoBlock'

interface BlogEditProps extends Omit<BaseEditProps, 'postType'> {
  // BlogEdit 특화 props
  categoryId?: number
  authorId?: number
  postType?: 'post' | 'page' | 'news' | 'assets' | 'onchain' | 'raw_news'
  initialData?: any
}

export default function BlogEdit({
  postId,
  mode = 'create',
  onSave,
  onCancel,
  categoryId,
  authorId,
  postType = 'post',
  ...props
}: BlogEditProps) {
  // BaseEdit에서 받아온 formData와 updateFormData 함수
  const [formData, setFormData] = useState<PostFormState>({
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
    tags: [],
    post_info: null
  } as unknown as PostFormState)

  const [activeLanguage] = useState<'ko' | 'en'>('ko')
  const handleSaveRef = React.useRef<((status: 'draft' | 'published') => Promise<void>) | null>(null)
  const [baseEditSaving, setBaseEditSaving] = useState(false)
  const [updateFormData, setUpdateFormData] = useState<((field: keyof PostFormState, value: string | number | boolean | string[] | { ko: string; en: string } | null) => void) | null>(null)

  // 안정적인 handleSave 함수
  const stableHandleSave = React.useCallback((status: string) => {
    if (handleSaveRef.current) {
      return handleSaveRef.current(status as 'draft' | 'published')
    }
    return Promise.resolve()
  }, [])

  // BaseEdit의 updateFormData 함수를 받아서 저장
  const handleUpdateFormData = React.useCallback((fn: (field: keyof PostFormState, value: string | number | boolean | string[] | { ko: string; en: string } | null) => void) => {
    setUpdateFormData(() => fn)
  }, [])

  // 실제 폼 데이터 업데이트 함수
  const updateFormDataField = React.useCallback((field: keyof PostFormState, value: string | number | boolean | string[] | { ko: string; en: string } | null) => {
    if (updateFormData) {
      updateFormData(field, value)
    }
  }, [updateFormData])

  // 블로그 저장 핸들러
  const handleBlogSave = (data: PostFormState) => {
    console.log('📝 Blog save triggered:', data)

    // 블로그 특화 데이터 처리
    const blogData = {
      ...data,
      post_type: data.post_type || postType,
      // 블로그 특화 필드들은 customFields에 포함
      customFields: {
        // 향후 기능들을 위한 placeholder
        tags: [],
        seoScore: 0,
        readabilityScore: 0,
        wordCount: 0,
        readingTime: 0,
        isPinned: false,
        allowComments: true,
        allowLikes: true,
        allowShares: true,
        visibility: 'public',
        accessLevel: 'free',
        seriesId: null,
        seriesOrder: 0
      }
    }

    if (onSave) {
      onSave(blogData)
    }
  }

  // 미리보기 핸들러
  const handlePreview = () => {
    console.log('🔍 Preview button clicked. FormData:', formData)
    
    if (!formData.slug) {
      alert('슬러그가 없습니다. 저장 후 다시 시도해주세요.')
      return
    }

    let prefix = '/blog'
    if (formData.post_type === 'news' || formData.post_type === 'raw_news' || formData.post_type === 'ai_draft_news') {
      prefix = '/news'
    } else if (formData.post_type === 'brief_news') {
      prefix = '/news/briefnews'
    } else if (formData.post_type === 'onchain') {
      prefix = '/onchain'
    } else if (formData.post_type === 'assets') {
      prefix = '/blog' 
    }

    const url = `/ko${prefix}/${formData.slug}`
    console.log('🔗 Opening preview URL:', url)
    
    // Attempt to open
    const newWindow = window.open(url, '_blank')
    if (!newWindow) {
      alert('팝업 차단이 감지되었습니다. 팝업을 허용해주세요.')
    }
  }

  return (
    <BaseEdit
      postId={postId}
      mode={mode}
      postType={postType}
      onSave={handleBlogSave}
      onCancel={onCancel}
      onHandleSave={(fn) => { handleSaveRef.current = fn }}
      onSavingChange={setBaseEditSaving}
      onFormDataChange={setFormData}
      onRegisterUpdateFormData={handleUpdateFormData}
      initialData={props.initialData}
      onPreview={handlePreview}
      {...props}
    >

      {/* 작성내용 블럭 */}
      <ContentBlock
        postType={formData.post_type}
        onPostTypeChange={(postType) => updateFormDataField('post_type', postType)}
        authorId={formData.author_id || null}
        authorUsername={formData.author?.username || null}
        categoryId={formData.category_id || null}
        onCategoryIdChange={(categoryId) => updateFormDataField('category_id', categoryId)}
        postParent={formData.post_parent || null}
        onPostParentChange={(postParent) => updateFormDataField('post_parent', postParent)}
        postPassword={formData.post_password || null}
        onPostPasswordChange={(postPassword) => updateFormDataField('post_password', postPassword)}
        featured={formData.featured}
        onFeaturedChange={(featured) => updateFormDataField('featured', featured)}
      />

      {/* Post Info 블럭 (추가 정보 표시) */}
      <PostInfoBlock
        postId={postId ? Number(postId) : undefined}
        postInfo={formData.post_info}
        onChange={(newInfo) => updateFormDataField('post_info', newInfo)}
      />

      {/* SEO 설정 */}
      <SEOSettings
        keywords={formData.keywords}
        onKeywordsChange={(keywords) => updateFormDataField('keywords', keywords)}
        metaTitle={formData.meta_title}
        onMetaTitleChange={(metaTitle) => updateFormDataField('meta_title', metaTitle)}
        metaDescription={formData.meta_description}
        onMetaDescriptionChange={(metaDescription) => updateFormDataField('meta_description', metaDescription)}
        canonicalUrl={formData.canonical_url}
        onCanonicalUrlChange={(canonicalUrl) => updateFormDataField('canonical_url', canonicalUrl)}
        activeLanguage={activeLanguage}
      />
    </BaseEdit>
  )
}
