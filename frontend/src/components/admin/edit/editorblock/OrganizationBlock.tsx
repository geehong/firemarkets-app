'use client'

import React from 'react'
import { useCategories, useTags, useSearchTags } from '@/hooks/data/usePosts'

interface OrganizationBlockProps {
    categoryId: number | null
    onCategoryIdChange: (id: number | null) => void
    tags: any[]
    onTagsChange: (tags: any[]) => void
    authorId: number | null
    authorUsername?: string | null
    postType: string
    onPostTypeChange: (type: any) => void
    // Additional fields if moved from ContentBlock
    postParent?: number | null
    onPostParentChange?: (id: number | null) => void
    featured?: boolean
    onFeaturedChange?: (val: boolean) => void
}

export default function OrganizationBlock({
    categoryId,
    onCategoryIdChange,
    tags,
    onTagsChange,
    authorId,
    authorUsername,
    postType,
    onPostTypeChange,
    postParent,
    onPostParentChange,
    featured,
    onFeaturedChange
}: OrganizationBlockProps) {
    const { data: categories, isLoading: categoriesLoading } = useCategories()

    return (
        <div className="p-4 space-y-4">
            {/* Category */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리 (Category)
                </label>
                <select
                    value={categoryId ?? ''}
                    onChange={(e) => onCategoryIdChange(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={categoriesLoading}
                >
                    <option value="">카테고리 선택</option>
                    {categories?.map((category: any) => (
                        <option key={category.id} value={category.id}>
                            {typeof category.name === 'string' ? category.name : (category.name?.ko || category.name?.en || '-')}
                        </option>
                    ))}
                </select>
            </div>

            {/* Post Type */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    포스트 타입 (Type)
                </label>
                <select
                    value={postType}
                    onChange={(e) => onPostTypeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="post">일반 포스트 (Post)</option>
                    <option value="news">뉴스 (News)</option>
                    <option value="brief_news">단신 뉴스 (Brief News)</option>
                    <option value="ai_draft_news">AI 분석 뉴스 (AI News)</option>
                    <option value="raw_news">원시 뉴스 (Raw News)</option>
                    <option value="page">페이지 (Page)</option>
                    <option value="tutorial">튜토리얼 (Tutorial)</option>
                    <option value="assets">자산 (Assets)</option>
                    <option value="onchain">온체인 (OnChain)</option>
                </select>
            </div>

            {/* Tags */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    태그 (Tags)
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                    {tags.map((tag: any, idx: number) => (
                        <span key={tag.id || idx} className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {tag.name || tag}
                            {/* Tag removal not fully implemented without tag detach logic */}
                        </span>
                    ))}
                    {tags.length === 0 && <span className="text-xs text-gray-400">태그 없음</span>}
                </div>
            </div>

            {/* Author */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    작성자 (Author)
                </label>
                <input
                    type="text"
                    value={authorUsername || (authorId ? `ID: ${authorId}` : '')}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600 cursor-not-allowed"
                />
            </div>

            {/* Featured Toggle */}
            {onFeaturedChange && (
                <div className="flex items-center pt-2">
                    <input
                        type="checkbox"
                        checked={featured}
                        onChange={(e) => onFeaturedChange(e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm text-gray-700 font-medium">
                        추천 게시물 (Featured)
                    </label>
                </div>
            )}
        </div>
    )
}
