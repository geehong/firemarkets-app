'use client'

import React from 'react'
import dynamic from 'next/dynamic'

// Dynamic imports for editors
const SimpleTiptapEditor = dynamic(() => import('../SimpleTiptapEditor'), { ssr: false })
const SimpleQuillEditor = dynamic(() => import('../SimpleQuillEditor'), { ssr: false })
const SimpleEditorJS = dynamic(() => import('../SimpleEditorJS'), { ssr: false })
const SimpleSummernote = dynamic(() => import('../SimpleSummernote'), { ssr: false })
const SimpleToastUiEditor = dynamic(() => import('../SimpleToastUiEditor'), { ssr: false })

interface MainContentBlockProps {
    title: { ko: string; en: string } | string
    onTitleChange: (value: string) => void
    slug: string
    onSlugChange: (value: string) => void
    onGenerateSlug: () => void
    description: { ko: string; en: string } | string
    onDescriptionChange: (value: string) => void
    content: string
    onContentChange: (value: string) => void
    activeLanguage: 'ko' | 'en'
    editorType: string
    videoUrl?: string // Optional if needed later
    toastUiPreviewStyle?: 'vertical' | 'tab' | 'vertical-stack'
}

export default function MainContentBlock({
    title,
    onTitleChange,
    slug,
    onSlugChange,
    onGenerateSlug,
    description,
    onDescriptionChange,
    content,
    onContentChange,
    activeLanguage,
    editorType,
    toastUiPreviewStyle
}: MainContentBlockProps) {

    // Helper to get string value for current language safely
    const getValue = (field: any) => {
        if (typeof field === 'string') return field
        if (typeof field === 'object' && field !== null) {
            return field[activeLanguage] || ''
        }
        return ''
    }

    const currentTitle = getValue(title)
    const currentDescription = getValue(description)

    return (
        <div>
            {/* Title */}
            <div className="p-6 border-b">
                <input
                    type="text"
                    value={currentTitle}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="w-full text-2xl font-semibold border-none outline-none placeholder-gray-300"
                    placeholder="제목을 입력하세요..."
                />
            </div>

            {/* Slug */}
            <div className="px-6 py-3 border-b bg-gray-50">
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 font-medium">슬러그:</span>
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => onSlugChange(e.target.value)}
                        className="flex-1 text-sm border-none bg-transparent outline-none text-gray-600 font-mono"
                        placeholder="url-slug"
                    />
                    <button
                        type="button"
                        onClick={onGenerateSlug}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-2 py-1 rounded"
                    >
                        자동 생성
                    </button>
                </div>
            </div>

            {/* Description */}
            <div className="p-6 border-b">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    설명 (Description) - {activeLanguage === 'ko' ? '한국어' : 'English'}
                </label>
                <textarea
                    value={currentDescription}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    rows={3}
                    className="w-full border-none outline-none resize-none text-gray-700 bg-gray-50 p-2 rounded"
                    placeholder="포스트 설명을 입력하세요..."
                />
            </div>

            {/* Content Editor */}
            <div className="p-6">
                <div className="mb-2 flex justify-between items-end">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        본문 (Content) - {activeLanguage === 'ko' ? '한국어' : 'English'}
                    </label>
                </div>

                {editorType === 'tiptap' && (
                    <SimpleTiptapEditor
                        value={content}
                        onChange={onContentChange}
                        placeholder="본문을 입력하세요..."
                        height={500}
                    />
                )}
                {editorType === 'quill' && (
                    <SimpleQuillEditor
                        key={activeLanguage} // Force re-render on lang change for Quill
                        value={content}
                        onChange={onContentChange}
                        placeholder="본문을 입력하세요..."
                        height={500}
                    />
                )}
                {editorType === 'editorjs' && (
                    <SimpleEditorJS
                        key={activeLanguage}
                        value={content}
                        onChange={onContentChange}
                        height={500}
                    />
                )}
                {editorType === 'summernote' && (
                    <SimpleSummernote
                        key={activeLanguage}
                        value={content}
                        onChange={onContentChange}
                        height={500}
                    />
                )}
                {editorType === 'toastui' && (
                    <SimpleToastUiEditor
                        key={activeLanguage}
                        value={content}
                        onChange={onContentChange}
                        height="500px"
                        previewStyle={toastUiPreviewStyle}
                    />
                )}
            </div>
        </div>
    )
}
