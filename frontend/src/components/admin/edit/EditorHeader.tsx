'use client'

import React from 'react'
import { Layout, Check, ChevronDown, Eye, Trash2 } from 'lucide-react'

export interface EditorBlockVisibility {
    publishing: boolean
    organization: boolean
    sync: boolean
    postInfo: boolean
    media: boolean
    seo: boolean
    aiAnalysis: boolean
    financial: boolean
    assetInfo: boolean
    shortcode: boolean
}

interface EditorHeaderProps {
    mode: 'create' | 'edit'
    activeLanguage: 'ko' | 'en'
    status: string // Add status prop
    onActiveLanguageChange: (lang: 'ko' | 'en') => void
    editorType: string
    onEditorTypeChange: (type: string) => void
    toastUiPreviewStyle?: 'vertical' | 'tab' | 'vertical-stack'
    onToastUiPreviewStyleChange?: (style: 'vertical' | 'tab' | 'vertical-stack') => void
    saving: boolean
    onSave: (status: string) => void
    onCancel: () => void
    onDelete?: () => void
    onPreview?: () => void
    blockVisibility: EditorBlockVisibility
    onToggleBlock: (blockKey: keyof EditorBlockVisibility) => void
}

export default function EditorHeader({
    mode,
    activeLanguage,
    status, // Accept prop
    onActiveLanguageChange,
    editorType,
    onEditorTypeChange,
    toastUiPreviewStyle,
    onToastUiPreviewStyleChange,
    saving,
    onSave,
    onCancel,
    onDelete,
    onPreview,
    blockVisibility,
    onToggleBlock
}: EditorHeaderProps) {
    const [isBlockMenuOpen, setIsBlockMenuOpen] = React.useState(false)

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            if (!target.closest('.block-menu-container')) {
                setIsBlockMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const editors = [
        { id: 'tinymce', name: 'TinyMCE' },
        { id: 'tiptap', name: 'Tiptap' },
        { id: 'quill', name: 'Quill' },
        { id: 'summernote', name: 'Summernote' },
        { id: 'editorjs', name: 'Editor.js' },
        { id: 'toastui', name: 'Toast UI' },
    ]

    const blockLabels: Record<keyof EditorBlockVisibility, string> = {
        publishing: '게시 (Publishing)',
        organization: '분류 (Organization)',
        sync: '동기화 (Sync)',
        postInfo: '포스트 정보 (Post Info)',
        media: '미디어 (Media)',
        seo: 'SEO 설정',
        aiAnalysis: 'AI 분석 (AI Analysis)',
        financial: '재무 데이터 (Financial)',
        assetInfo: '자산 정보 (Asset Info)',
        shortcode: '숏코드 삽입 (Shortcodes)'
    }

    return (
        <div className="bg-white border-b px-4 lg:px-6 py-4 sticky top-0 z-50 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">

                {/* Left Side: Title & Settings */}
                <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-4">
                    <h1 className="text-lg lg:text-xl font-semibold text-gray-800">
                        {mode === 'create' ? '새 포스트 작성' : '포스트 편집'}
                    </h1>

                    <div className="flex space-x-2 items-center">
                        {/* Editor Selector */}
                        <select
                            value={editorType}
                            onChange={(e) => onEditorTypeChange(e.target.value)}
                            className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {editors.map(editor => (
                                <option key={editor.id} value={editor.id}>
                                    {editor.name}
                                </option>
                            ))}
                        </select>

                        {/* Toast UI Settings */}
                        {editorType === 'toastui' && onToastUiPreviewStyleChange && (
                            <select
                                value={toastUiPreviewStyle}
                                onChange={(e) => onToastUiPreviewStyleChange(e.target.value as any)}
                                className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="vertical">좌우 분할</option>
                                <option value="tab">탭 분할</option>
                                <option value="vertical-stack">상하 분할</option>
                            </select>
                        )}

                        {/* Language Switch */}
                        <div className="flex rounded-md shadow-sm" role="group">
                            <button
                                type="button"
                                onClick={() => onActiveLanguageChange('ko')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-l-md border ${activeLanguage === 'ko'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                한국어
                            </button>
                            <button
                                type="button"
                                onClick={() => onActiveLanguageChange('en')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-r-md border-t border-b border-r ${activeLanguage === 'en'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                English
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Actions & Block Menu */}
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 items-center">

                    {/* Block Visibility Menu */}
                    <div className="relative block-menu-container">
                        <button
                            type="button"
                            onClick={() => setIsBlockMenuOpen(!isBlockMenuOpen)}
                            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <Layout className="w-4 h-4 mr-2" />
                            블록 선택
                            <ChevronDown className="w-4 h-4 ml-1" />
                        </button>

                        {isBlockMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                <div className="py-1" role="menu">
                                    {Object.entries(blockLabels).map(([key, label]) => (
                                        <button
                                            key={key}
                                            onClick={() => onToggleBlock(key as keyof EditorBlockVisibility)}
                                            className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            role="menuitem"
                                        >
                                            <div className={`mr-3 flex h-5 w-5 items-center justify-center rounded border ${blockVisibility[key as keyof EditorBlockVisibility]
                                                ? 'bg-blue-600 border-blue-600'
                                                : 'border-gray-300 bg-white'
                                                }`}>
                                                {blockVisibility[key as keyof EditorBlockVisibility] && (
                                                    <Check className="h-3.5 w-3.5 text-white" />
                                                )}
                                            </div>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-6 w-px bg-gray-300 hidden sm:block mx-2"></div>

                    {/* Delete (Trash) Button - Only in Edit mode */}
                    {mode === 'edit' && onDelete && (
                         <button
                            type="button"
                            onClick={onDelete}
                            title="삭제"
                            className="p-2 text-red-600 border border-transparent hover:bg-red-50 rounded transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}

                    {/* Preview Button (Icon) */}
                    {onPreview && (
                         <button
                            type="button"
                            onClick={onPreview}
                            title="미리보기"
                            className="p-2 text-gray-600 border border-transparent hover:bg-gray-100 rounded transition-colors"
                        >
                            <Eye className="w-5 h-5" />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            // In edit mode, respect the current status (from dropdown)
                            // In create mode, default to published
                            const targetStatus = mode === 'edit' ? status : 'published'
                            onSave(targetStatus)
                        }}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                    >
                        {saving ? '저장 중...' : (mode === 'edit' ? '저장' : '발행')}
                    </button>
                </div>
            </div>
        </div>
    )
}
