'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface PostInfoBlockProps {
    postId?: number
    postInfo: any
    onChange?: (newInfo: any) => void
}

export default function PostInfoBlock({ postId, postInfo, onChange }: PostInfoBlockProps) {
    const [jsonText, setJsonText] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isJsonOpen, setIsJsonOpen] = useState(false)

    // Sync JSON text with postInfo prop
    useEffect(() => {
        if (postInfo) {
            setJsonText(JSON.stringify(postInfo, null, 2))
        } else {
            setJsonText('{}')
        }
    }, [postInfo])

    const handleFieldChange = (field: string, value: string) => {
        if (!onChange) return

        const newInfo = {
            ...(postInfo || {}),
            [field]: value
        }
        onChange(newInfo)
    }

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value
        setJsonText(newValue)

        try {
            const parsed = JSON.parse(newValue)
            setError(null)
            if (onChange) {
                onChange(parsed)
            }
        } catch (err) {
            setError('Invalid JSON format')
        }
    }

    // Header logic removed as it's now handled by BaseEdit via BlockWrapper

    return (
        <div className="p-4 space-y-4">
            {/* Specific Fields */}
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        출처 (Source)
                    </label>
                    <input
                        type="text"
                        value={postInfo?.source || ''}
                        onChange={(e) => handleFieldChange('source', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="e.g. Bloomberg"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        작성자 (Author)
                    </label>
                    <input
                        type="text"
                        value={postInfo?.author || ''}
                        onChange={(e) => handleFieldChange('author', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="e.g. John Doe"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL
                    </label>
                    <input
                        type="url"
                        value={postInfo?.url || ''}
                        onChange={(e) => handleFieldChange('url', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="https://example.com/article"
                    />
                </div>
            </div>

            {/* Collapsible Raw JSON */}
            <div className="border-t pt-2 mt-2">
                <button
                    type="button"
                    onClick={() => setIsJsonOpen(!isJsonOpen)}
                    className="flex items-center text-xs font-medium text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                    {isJsonOpen ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                    {isJsonOpen ? '고급 설정 접기 (Raw JSON)' : '고급 설정 펼치기 (Raw JSON)'}
                </button>

                {isJsonOpen && (
                    <div className="mt-3 transition-all">
                        <textarea
                            value={jsonText}
                            onChange={handleJsonChange}
                            className={`w-full h-48 font-mono text-xs border rounded p-2 focus:outline-none focus:ring-2 ${error ? 'border-red-300 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-200'
                                }`}
                            placeholder="{}"
                        />
                        {error && (
                            <p className="mt-1 text-xs text-red-500">
                                {error}
                            </p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                            주의: JSON을 직접 수정하면 위 필드 값도 변경될 수 있습니다.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
