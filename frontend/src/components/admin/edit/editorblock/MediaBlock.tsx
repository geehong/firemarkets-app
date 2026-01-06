'use client'

import React, { useRef, useState } from 'react'
import { Image as ImageIcon, Link as LinkIcon, Upload as UploadIcon } from 'lucide-react'

interface MediaBlockProps {
    coverImage: string | null
    onCoverImageChange: (url: string | null) => void
    coverImageAlt: string | null
    onCoverImageAltChange: (alt: string | null) => void
    postInfo: any // To access source image URL
    postType?: string
    slug?: string
}

export default function MediaBlock({
    coverImage,
    onCoverImageChange,
    coverImageAlt,
    onCoverImageAltChange,
    postInfo,
    postType = 'posts',
    slug = 'untitled'
}: MediaBlockProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)

    // Find source image URL from postInfo
    const sourceImageUrl = postInfo?.image_url || postInfo?.post_info?.image_url

    const handleUseSourceImage = () => {
        if (sourceImageUrl) {
            onCoverImageChange(sourceImageUrl)
        }
    }

    const handleSelectImage = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('postType', postType)
            formData.append('slug', slug)

            const response = await fetch('/uploads/image', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('Upload failed')
            }

            const data = await response.json()
            if (data.success && data.url) {
                onCoverImageChange(data.url)
            }
        } catch (error) {
            console.error('Failed to upload image:', error)
            alert('이미지 업로드에 실패했습니다.')
        } finally {
            setIsUploading(false)
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    return (
        <div className="p-4 space-y-4">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />

            {/* Cover Image URL */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    커버 이미지 (Cover Image)
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={coverImage || ''}
                            onChange={(e) => onCoverImageChange(e.target.value || null)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="https://example.com/image.jpg"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <ImageIcon className="h-4 w-4 text-gray-400" />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSelectImage}
                        disabled={isUploading}
                        className="inline-flex items-center px-3 py-2 border border-blue-600 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none disabled:opacity-50"
                    >
                        {isUploading ? (
                            '업로드 중...'
                        ) : (
                            <>
                                <UploadIcon className="h-4 w-4 mr-2" />
                                선택
                            </>
                        )}
                    </button>

                    {sourceImageUrl && (
                        <button
                            type="button"
                            onClick={handleUseSourceImage}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                            title="원본 이미지 사용"
                        >
                            <LinkIcon className="h-4 w-4 mr-2 text-blue-500" />
                            원본
                        </button>
                    )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                    * '선택' 버튼을 누르면 로컬 파일을 업로드하여 자동으로 URL을 입력합니다.
                </p>
            </div>

            {/* Preview */}
            {coverImage && (
                <div className="mt-2 relative aspect-video w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={coverImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x400?text=Invalid+Image+URL'
                        }}
                    />
                </div>
            )}

            {/* Alt Text */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    대체 텍스트 (Alt Text)
                </label>
                <input
                    type="text"
                    value={coverImageAlt || ''}
                    onChange={(e) => onCoverImageAltChange(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="이미지 설명 (SEO)"
                />
            </div>
        </div>
    )
}
