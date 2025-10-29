'use client'

import React from 'react'
import { useCategories } from '@/hooks/usePosts'

interface ContentBlockProps {
  postType: 'post' | 'page' | 'tutorial' | 'news' | 'assets' | 'onchain'
  onPostTypeChange: (postType: 'post' | 'page' | 'tutorial' | 'news' | 'assets' | 'onchain') => void
  authorId: number | null
  authorUsername?: string | null
  categoryId: number | null
  onCategoryIdChange: (categoryId: number | null) => void
  postParent: number | null
  onPostParentChange: (postParent: number | null) => void
  postPassword: string | null
  onPostPasswordChange: (postPassword: string | null) => void
  featured: boolean
  onFeaturedChange: (featured: boolean) => void
}

export default function ContentBlock({
  postType,
  onPostTypeChange,
  authorId,
  authorUsername,
  categoryId,
  onCategoryIdChange,
  postParent,
  onPostParentChange,
  postPassword,
  onPostPasswordChange,
  featured,
  onFeaturedChange
}: ContentBlockProps) {
  // 카테고리 목록 조회
  const { data: categories, isLoading: categoriesLoading } = useCategories()
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b px-4 py-3 bg-gray-50">
        <h3 className="font-semibold text-gray-900">작성내용</h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            포스트 타입
          </label>
          <select
            value={postType}
            onChange={(e) => onPostTypeChange(e.target.value as 'post' | 'page' | 'tutorial' | 'news' | 'assets' | 'onchain')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            작성자
          </label>
          <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600">
            {authorUsername || `ID: ${authorId}` || '작성자 없음'}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            카테고리
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
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            부모 포스트 ID
          </label>
          <input
            type="number"
            value={postParent ?? ''}
            onChange={(e) => onPostParentChange(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="부모 포스트 ID"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            포스트 비밀번호
          </label>
          <input
            type="password"
            value={postPassword ?? ''}
            onChange={(e) => onPostPasswordChange(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="비밀번호 보호 (선택사항)"
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => onFeaturedChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label className="ml-2 text-sm text-gray-700">
            추천 글로 설정
          </label>
        </div>
        </div>
      </div>
    </div>
  )
}
