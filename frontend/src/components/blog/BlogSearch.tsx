'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface BlogSearchProps {
  onSearch: (searchTerm: string) => void
  placeholder?: string
  className?: string
}

const BlogSearch: React.FC<BlogSearchProps> = ({
  onSearch,
  placeholder = "블로그 글 검색...",
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // 디바운스된 검색
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      onSearch(searchTerm)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchTerm, onSearch])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleClear = () => {
    setSearchTerm('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear()
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon 
            className={`h-5 w-5 transition-colors ${
              isFocused 
                ? 'text-blue-500' 
                : 'text-gray-400'
            }`} 
          />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`
            block w-full pl-10 pr-10 py-3 border rounded-lg
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-500 dark:placeholder-gray-400
            border-gray-300 dark:border-gray-600
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            dark:focus:ring-blue-400 dark:focus:border-blue-400
            transition-colors duration-200
            ${isFocused ? 'shadow-lg' : 'shadow-sm'}
          `}
        />
        
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            type="button"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
          </button>
        )}
      </div>

      {/* 검색어 하이라이트 */}
      {searchTerm && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium">"{searchTerm}"</span>로 검색 중...
        </div>
      )}
    </div>
  )
}

export default BlogSearch
