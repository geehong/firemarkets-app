'use client'

import React, { useState } from 'react'

interface SEOSettingsProps {
  keywords: string[] | null
  onKeywordsChange: (keywords: string[] | null) => void
  metaTitle: { ko: string; en: string }
  onMetaTitleChange: (metaTitle: { ko: string; en: string }) => void
  metaDescription: { ko: string; en: string }
  onMetaDescriptionChange: (metaDescription: { ko: string; en: string }) => void
  canonicalUrl: string | null
  onCanonicalUrlChange: (canonicalUrl: string | null) => void
  activeLanguage: 'ko' | 'en'
}

export default function SEOSettings({
  keywords,
  onKeywordsChange,
  metaTitle,
  onMetaTitleChange,
  metaDescription,
  onMetaDescriptionChange,
  canonicalUrl,
  onCanonicalUrlChange,
  activeLanguage
}: SEOSettingsProps) {
  const [keywordInput, setKeywordInput] = useState('')

  const safeKeywords = Array.isArray(keywords)
    ? keywords
    : (typeof keywords === 'string'
      ? (keywords as string).split(',').map(k => k.trim()).filter(Boolean)
      : [])

  const addKeyword = () => {
    if (keywordInput.trim() && !safeKeywords.includes(keywordInput.trim())) {
      onKeywordsChange([...safeKeywords, keywordInput.trim()])
      setKeywordInput('')
    }
  }

  const removeKeyword = (keyword: string) => {
    onKeywordsChange(safeKeywords.filter(k => k !== keyword))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    }
  }

  return (
    <div className="p-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          키워드
        </label>
        <div className="flex flex-wrap gap-1 mb-2">
          {safeKeywords.map((keyword, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
            >
              {keyword}
              <button
                type="button"
                onClick={() => removeKeyword(keyword)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="키워드 추가"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            추가
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          메타 제목 ({activeLanguage === 'ko' ? '한국어' : 'English'})
        </label>
        <input
          type="text"
          value={metaTitle?.[activeLanguage] || ''}
          onChange={(e) => onMetaTitleChange({
            ...(metaTitle || { ko: '', en: '' }),
            [activeLanguage]: e.target.value
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="SEO 제목"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          메타 설명 ({activeLanguage === 'ko' ? '한국어' : 'English'})
        </label>
        <textarea
          rows={2}
          value={metaDescription?.[activeLanguage] || ''}
          onChange={(e) => onMetaDescriptionChange({
            ...(metaDescription || { ko: '', en: '' }),
            [activeLanguage]: e.target.value
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="SEO 설명"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Canonical URL
        </label>
        <input
          type="url"
          value={canonicalUrl ?? ''}
          onChange={(e) => onCanonicalUrlChange(e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://example.com"
        />
      </div>
    </div>
  )
}
