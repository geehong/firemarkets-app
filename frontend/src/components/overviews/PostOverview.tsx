'use client'

import React, { useState } from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import Badge from '@/components/ui/badge/Badge'
import Alert from '@/components/ui/alert/Alert'
import Button from '@/components/ui/button/Button'
import { formatDate } from '@/utils/date'
import { useLocalizedContent } from '@/hooks/useLocalizedContent'

interface PostOverviewProps {
  className?: string
  postData?: {
    id: number
    title: string
    slug: string
    description?: string
    excerpt?: string
    content?: string
    content_ko?: string
    cover_image?: string
    cover_image_alt?: string
    meta_title?: string
    meta_description?: string
    keywords?: string[]
    canonical_url?: string
    status: string
    created_at: string
    updated_at: string
    published_at?: string
  } | null
}

const PostOverview: React.FC<PostOverviewProps> = ({ className, postData }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const selectedContent = useLocalizedContent(postData?.content, postData?.content_ko)
  
  if (!postData) {
    return (
      <div className={className}>
        <Alert 
          variant="info"
          title="No Content Available"
          message="No post content available for this asset."
        />
      </div>
    )
  }
  
  // Content 길이 체크 (500자 기준)
  const shouldShowToggle = selectedContent && selectedContent.length > 500
  const displayContent = shouldShowToggle && !isExpanded 
    ? selectedContent.substring(0, 500) + '...'
    : selectedContent

  // 상태별 배지 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success'
      case 'draft':
        return 'warning'
      case 'scheduled':
        return 'info'
      case 'private':
        return 'light'
      default:
        return 'light'
    }
  }

  // 상태별 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return 'Published'
      case 'draft':
        return 'Draft'
      case 'scheduled':
        return 'Scheduled'
      case 'private':
        return 'Private'
      default:
        return status
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 포스트 헤더 정보 */}
      <ComponentCard title={postData.title}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <p className="text-gray-500">
              Post ID: {postData.id} • Slug: {postData.slug}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge color={getStatusColor(postData.status)}>
              {getStatusText(postData.status)}
            </Badge>
            {postData.published_at && (
              <Badge color="info">
                Published: {formatDate(postData.published_at)}
              </Badge>
            )}
          </div>
        </div>
        
        {/* 커버 이미지 */}
        {postData.cover_image && (
          <div className="mb-4">
            <img 
              src={postData.cover_image} 
              alt={postData.cover_image_alt || postData.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}
        
        {/* 설명 */}
        {postData.description && (
          <div className="mb-4">
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              {postData.description}
            </p>
          </div>
        )}
        
        {/* 요약 */}
        {postData.excerpt && (
          <div className="mb-4">
            <h4 className="font-medium mb-2">Excerpt</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              {postData.excerpt}
            </p>
          </div>
        )}
      </ComponentCard>

      {/* SEO 정보 */}
      {(postData.meta_title || postData.meta_description || postData.keywords || postData.canonical_url) && (
        <ComponentCard title="SEO Information">
          <div className="space-y-4">
            {postData.meta_title && (
              <div>
                <h4 className="font-medium mb-2">Meta Title</h4>
                <p className="text-sm text-gray-600">{postData.meta_title}</p>
              </div>
            )}
            
            {postData.meta_description && (
              <div>
                <h4 className="font-medium mb-2">Meta Description</h4>
                <p className="text-sm text-gray-600">{postData.meta_description}</p>
              </div>
            )}
            
            {postData.keywords && postData.keywords.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {postData.keywords.map((keyword, index) => (
                    <Badge key={index} color="light">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {postData.canonical_url && (
              <div>
                <h4 className="font-medium mb-2">Canonical URL</h4>
                <a 
                  href={postData.canonical_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {postData.canonical_url}
                </a>
              </div>
            )}
          </div>
        </ComponentCard>
      )}

      {/* 콘텐츠 미리보기 */}
      {selectedContent && (
        <ComponentCard title="Content Preview">
          <div className="prose prose-sm max-w-none">
            <div 
              className="text-sm text-gray-600 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: displayContent
              }}
            />
            {shouldShowToggle && (
              <div className="mt-4 flex items-center justify-between">
                <Badge color="info">
                  {isExpanded ? `${selectedContent.length} characters` : `${selectedContent.length} characters total`}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="ml-4"
                >
                  {isExpanded ? '접기' : '더보기'}
                </Button>
              </div>
            )}
          </div>
        </ComponentCard>
      )}

      {/* 타임스탬프 정보 */}
      <ComponentCard title="Post Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Timestamps</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span>{formatDate(postData.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated:</span>
                <span>{formatDate(postData.updated_at)}</span>
              </div>
              {postData.published_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Published:</span>
                  <span>{formatDate(postData.published_at)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Post Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">ID:</span>
                <span>{postData.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Slug:</span>
                <span className="font-mono text-xs">{postData.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <Badge color={getStatusColor(postData.status)} size="sm">
                  {getStatusText(postData.status)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </ComponentCard>
    </div>
  )
}

export default PostOverview
