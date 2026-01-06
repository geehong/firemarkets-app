'use client'

import React, { useState } from 'react'
import { ChevronDownIcon } from '@/icons/index'
import { useBlogCategories } from '@/hooks/data/olduseBlog'

interface BlogCategoriesProps {
  activeCategorySlug?: string
  onCategorySelect?: (categorySlug: string) => void
  className?: string
}

const BlogCategories: React.FC<BlogCategoriesProps> = ({
  activeCategorySlug,
  onCategorySelect,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false)

  // 훅 사용
  const { categories, loading } = useBlogCategories()

  const handleCategoryClick = (categorySlug: string) => {
    if (onCategorySelect) {
      onCategorySelect(categorySlug)
    }
    setIsOpen(false)
  }

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        카테고리
      </h3>

      {/* 데스크톱 버전 */}
      <div className="hidden md:block">
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => handleCategoryClick('')}
              className={`w-full text-left py-2 px-3 rounded-md transition-colors duration-200 ${!activeCategorySlug
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
            >
              전체 ({categories.reduce((sum, cat) => sum + (cat.blog_count || 0), 0)})
            </button>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <button
                onClick={() => handleCategoryClick(category.slug)}
                className={`w-full text-left py-2 px-3 rounded-md transition-colors duration-200 ${activeCategorySlug === category.slug
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
              >
                {category.name} ({category.blog_count || 0})
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 모바일 버전 */}
      <div className="md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between py-2 px-3 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <span className="text-gray-700 dark:text-gray-300">
            {activeCategorySlug
              ? categories.find(cat => cat.slug === activeCategorySlug)?.name || '카테고리 선택'
              : '전체'
            }
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
              }`}
          />
        </button>

        {isOpen && (
          <div className="mt-2 space-y-1">
            <button
              onClick={() => handleCategoryClick('')}
              className={`w-full text-left py-2 px-3 rounded-md transition-colors duration-200 ${!activeCategorySlug
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
            >
              전체 ({categories.reduce((sum, cat) => sum + (cat.blog_count || 0), 0)})
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.slug)}
                className={`w-full text-left py-2 px-3 rounded-md transition-colors duration-200 ${activeCategorySlug === category.slug
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
              >
                {category.name} ({category.blog_count || 0})
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BlogCategories