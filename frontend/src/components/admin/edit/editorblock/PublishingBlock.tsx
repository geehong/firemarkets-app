'use client'

import React from 'react'

interface PublishingBlockProps {
  status: 'draft' | 'published' | 'private' | 'scheduled' | 'archived'
  onStatusChange: (status: 'draft' | 'published' | 'private' | 'scheduled' | 'archived') => void
  publishedAt?: string
  onPublishedAtChange: (date: string) => void
  onPreview: () => void
  onSave: (status: string) => Promise<void>
  saving?: boolean
  mode?: 'create' | 'edit'
}

export default function PublishingBlock({
  status,
  onStatusChange,
  publishedAt,
  onPublishedAtChange,
  onPreview,
  onSave,
  saving = false,
  mode = 'create'
}: PublishingBlockProps) {
  // Format date for datetime-local input (YYYY-MM-DDThh:mm)
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toISOString().slice(0, 16)
  }

  return (
    <div className="p-4 space-y-4">
      {/* 1. Status Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          상태 (Status)
        </label>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="draft">초안 (Draft)</option>
          <option value="published">공개 (Public)</option>
          <option value="private">비공개 (Private)</option>
          <option value="scheduled">예약 (Reserved)</option>
          <option value="archived">보관됨 (Archived)</option>
        </select>
      </div>

      {/* 2. Date Selection (Conditional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {status === 'scheduled' ? '예약 일시 (Reserved Date)' : '발행 일시 (Publish Date)'}
        </label>

        {status === 'scheduled' ? (
          <div className="space-y-2">
            <input
              type="datetime-local"
              value={formatDate(publishedAt)}
              onChange={(e) => onPublishedAtChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <p className="text-xs text-gray-500">
              * 설정한 시간에 자동으로 발행됩니다.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 px-3 py-2 rounded border border-gray-200 text-sm text-gray-600 flex justify-between items-center">
            <span>
              {status === 'draft' ? '임시 저장됨' : '즉시 발행 (현재 시간)'}
            </span>
            <span className="text-xs text-gray-400">
              {new Date().toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* 3. Action Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <button
          type="button"
          onClick={onPreview}
          className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-medium text-sm"
        >
          미리보기
        </button>
        <button
          type="button"
          onClick={() => {
            const targetStatus = mode === 'edit' ? status : 'published'
            onSave(targetStatus)
          }}
          disabled={saving}
          className={`flex-1 px-3 py-2 text-white rounded disabled:opacity-50 transition-colors font-medium text-sm shadow-sm ${status === 'scheduled'
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {saving ? '처리 중...' : (status === 'scheduled' ? '예약 발행' : (mode === 'edit' ? '저장' : '발행하기'))}
        </button>
      </div>

      <button
        type="button"
        onClick={() => onSave('draft')}
        disabled={saving}
        className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium"
      >
        {saving ? '저장 중...' : '임시저장'}
      </button>
    </div>
  )
}
