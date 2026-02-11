'use client'

import React, { useRef, useState } from 'react'
import { Image as ImageIcon, Link as LinkIcon, Upload as UploadIcon } from 'lucide-react'
import { tokenService } from '@/services/tokenService'

interface MediaBlockProps {
    coverImage: string | null
    onCoverImageChange: (url: string | null) => void
    coverImageAlt: string | null
    onCoverImageAltChange: (alt: string | null) => void
    postInfo: any // To access source image URL
    postType?: string
    slug?: string
    onUploadComplete?: (url: string) => void
}

export default function MediaBlock({
    coverImage,
    onCoverImageChange,
    coverImageAlt,
    onCoverImageAltChange,
    postInfo,
    postType = 'posts',
    slug = 'untitled',
    onUploadComplete
}: MediaBlockProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)

    // Find source image URL from postInfo
    const sourceImageUrl = postInfo?.image_url || postInfo?.post_info?.image_url

    const handleUseSourceImage = async () => {
        if (!sourceImageUrl) return

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('imageUrl', sourceImageUrl)
            formData.append('postType', postType)
            formData.append('slug', slug)

            const response = await fetch('/uploads/image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokenService.getAccessToken()}`
                },
                body: formData,
            })

            if (!response.ok) {
                throw new Error('Upload failed')
            }

            const data = await response.json()
            if (data.success && data.url) {
                onCoverImageChange(data.url)
                if (onUploadComplete) onUploadComplete(data.url)
            }
        } catch (error) {
            console.error('Failed to save source image:', error)
            alert('외부 이미지를 저장하는데 실패했습니다.')
            // Fallback: use external URL directly if saving fails
            onCoverImageChange(sourceImageUrl)
            if (onUploadComplete) onUploadComplete(sourceImageUrl)
        } finally {
            setIsUploading(false)
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
                headers: {
                    'Authorization': `Bearer ${tokenService.getAccessToken()}`
                },
                body: formData,
            })

            if (!response.ok) {
                throw new Error('Upload failed')
            }

            const data = await response.json()
            if (data.success && data.url) {
                onCoverImageChange(data.url)
                if (onUploadComplete) onUploadComplete(data.url)
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
                            disabled={isUploading}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50"
                            title="원본 이미지 저장 및 사용"
                        >
                            <LinkIcon className={`h-4 w-4 mr-2 ${isUploading ? 'text-gray-400' : 'text-blue-500'}`} />
                            {isUploading ? '처리 중...' : '원본'}
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
                            // Fallback to a simple gray placeholder SVG data URI
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20400%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_1%20text%20%7B%20fill%3A%23AAAAAA%3Bfont-weight%3Abold%3Bfont-family%3AArial%2C%20Helvetica%2C%20Open%20Sans%2C%20sans-serif%2C%20monospace%3Bfont-size%3A40pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_1%22%3E%3Crect%20width%3D%22800%22%20height%3D%22400%22%20fill%3D%22%23EEEEEE%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dy%3D%22.3em%22%20text-anchor%3D%22middle%22%3EInvalid%20Image%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E'
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
