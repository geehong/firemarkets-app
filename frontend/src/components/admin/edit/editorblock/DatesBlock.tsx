'use client'

import React from 'react'

interface DatesBlockProps {
    createdAt: string
    updatedAt: string
    publishedAt?: string
    onPublishedAtChange: (date: string) => void
    scheduledAt?: string
    onScheduledAtChange?: (date: string) => void
}

export default function DatesBlock({
    createdAt,
    updatedAt,
    publishedAt,
    onPublishedAtChange,
    scheduledAt,
    onScheduledAtChange
}: DatesBlockProps) {
    // Format date for datetime-local input (YYYY-MM-DDThh:mm)
    const formatDate = (dateString?: string) => {
        if (!dateString) return ''
        return new Date(dateString).toISOString().slice(0, 16)
    }

    return (
        <div className="p-4 space-y-3">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    발행일 (Published)
                </label>
                <input
                    type="datetime-local"
                    value={formatDate(publishedAt)}
                    onChange={(e) => onPublishedAtChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
            </div>

            {onScheduledAtChange && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        예약일 (Scheduled)
                    </label>
                    <input
                        type="datetime-local"
                        value={formatDate(scheduledAt)}
                        onChange={(e) => onScheduledAtChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        수정일 (Updated)
                    </label>
                    <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded">
                        {updatedAt ? new Date(updatedAt).toLocaleString() : '-'}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        작성일 (Created)
                    </label>
                    <div className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded">
                        {createdAt ? new Date(createdAt).toLocaleString() : '-'}
                    </div>
                </div>
            </div>
        </div>
    )
}
