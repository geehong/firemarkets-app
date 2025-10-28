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
}

export default function BlogEdit({
  postId,
  mode = 'create',
  onSave,
  onCancel,
  categoryId,
  authorId,
  ...props 
}: BlogEditProps) {
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
    post_type: 'post',
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
  const [saving, setSaving] = useState(false)
  const [handleSave, setHandleSave] = useState<((status: 'draft' | 'published') => Promise<void>) | null>(null)
  const [baseEditSaving, setBaseEditSaving] = useState(false)

  // 폼 데이터 업데이트 함수
  const updateFormData = (field: keyof PostFormState, value: string | number | boolean | string[] | { ko: string; en: string } | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 블로그 저장 핸들러
  const handleBlogSave = (data: PostFormState) => {
    console.log('📝 Blog save triggered:', data)
    
    // 블로그 특화 데이터 처리
    const blogData = {
      ...data,
      post_type: 'post' as const,
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

  return (
    <BaseEdit
      postId={postId}
      mode={mode}
      postType="post"
      onSave={handleBlogSave}
      onCancel={onCancel}
      onHandleSave={setHandleSave}
      onSavingChange={setBaseEditSaving}
      {...props}
    >
      {/* 퍼블리싱 블럭 */}
      <PublishingBlock
        status={formData.status}
        onStatusChange={(status) => updateFormData('status', status)}
        onPreview={() => console.log('미리보기')}
        onSave={handleSave || (async () => {})}
        saving={baseEditSaving}
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
