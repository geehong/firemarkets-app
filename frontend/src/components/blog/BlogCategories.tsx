'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface Category {
  id: number
  name: string
  slug: string
  description?: string
  blog_count?: number
}

interface BlogCategoriesProps {
  selectedCategory: string
  onCategorySelect: (category: string) => void
  className?: string
}

const BlogCategories: React.FC<BlogCategoriesProps> = ({
  selectedCategory,
  onCategorySelect,
  className = ""
}) => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  // 카테고리 데이터 가져오기
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // 실제 API 엔드포인트로 교체 필요
        const response = await fetch('/api/v1/blog-categories/')
        if (response.ok) {
          const data = await response.json()
          setCategories(data.categories || [])
        } else {
          // 임시 데이터 (API가 준비되지 않은 경우)
          setCategories([
            { id: 1, name: '시장 분석', slug: 'market-analysis', blog_count: 12 },
            { id: 2, name: '투자 가이드', slug: 'investment-guide', blog_count: 8 },
            { id: 3, name: '암호화폐', slug: 'cryptocurrency', blog_count: 15 },
            { id: 4, name: '주식', slug: 'stocks', blog_count: 6 },
            { id: 5, name: '경제 뉴스', slug: 'economic-news', blog_count: 10 },
            { id: 6, name: '기술 분석', slug: 'technical-analysis', blog_count: 7 }
          ])
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
        // 에러 시 기본 카테고리 설정
        setCategories([
          { id: 1, name: '시장 분석', slug: 'market-analysis', blog_count: 12 },
          { id: 2, name: '투자 가이드', slug: 'investment-guide', blog_count: 8 },
          { id: 3, name: '암호화폐', slug: 'cryptocurrency', blog_count: 15 }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const handleCategorySelect = (categorySlug: string) => {
    onCategorySelect(categorySlug)
    setIsOpen(false)
  }

  const selectedCategoryName = categories.find(cat => cat.slug === selectedCategory)?.name || '전체'

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* 데스크톱 버전 */}
      <div className="hidden md:block">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCategorySelect('')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            전체
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.slug)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.slug
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {category.name}
              {category.blog_count && (
                <span className="ml-1 text-xs opacity-75">
                  ({category.blog_count})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 모바일 버전 */}
      <div className="md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-left"
        >
          <span className="text-gray-700 dark:text-gray-300">
            {selectedCategoryName}
          </span>
          <ChevronDownIcon 
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
            <div className="py-2">
              <button
                onClick={() => handleCategorySelect('')}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  !selectedCategory
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                전체
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category.slug)}
                  className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                    selectedCategory === category.slug
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{category.name}</span>
                    {category.blog_count && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {category.blog_count}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BlogCategories
