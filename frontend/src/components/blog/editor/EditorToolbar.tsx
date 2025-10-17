'use client'

import React from 'react'

type AnyEditor = any

interface EditorToolbarProps {
  editor: AnyEditor | null
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  if (!editor) return null

  return (
    <div className="border-b p-2 flex flex-wrap gap-2 bg-white dark:bg-gray-800">
      <div className="flex gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded ${editor.isActive('bold') ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          type="button"
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded ${editor.isActive('italic') ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          type="button"
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded ${editor.isActive('bulletList') ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
          type="button"
        >
          • List
        </button>
      </div>
    </div>
  )
}

export default EditorToolbar


