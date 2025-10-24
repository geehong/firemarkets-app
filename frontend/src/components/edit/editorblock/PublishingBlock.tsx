'use client'

import React from 'react'

interface PublishingBlockProps {
  status: 'draft' | 'published' | 'private' | 'scheduled'
  onStatusChange: (status: 'draft' | 'published' | 'private' | 'scheduled') => void
  onPreview: () => void
  onPublish: () => void
  onSaveDraft: () => void
  saving?: boolean
}

export default function PublishingBlock({
  status,
  onStatusChange,
  onPreview,
  onPublish,
  onSaveDraft,
  saving = false
}: PublishingBlockProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b px-4 py-3 bg-gray-50">
        <h3 className="font-semibold text-gray-900">퍼블리싱</h3>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            상태
          </label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as 'draft' | 'published' | 'private' | 'scheduled')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="draft">초안</option>
            <option value="published">공개</option>
            <option value="private">비공개</option>
            <option value="scheduled">예약</option>
          </select>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <button
            type="button"
            onClick={onPreview}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            미리보기
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={saving}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '발행 중...' : '발행'}
          </button>
        </div>
        
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          className="w-full px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '저장 중...' : '임시저장'}
        </button>
      </div>
    </div>
  )
}
