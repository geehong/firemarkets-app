'use client'

import React, { useState, useEffect } from 'react'

interface BlogEditorProps {
  content?: string
  onChange?: (content: string) => void
}

// Minimal editor scaffold (placeholder for Tiptap)
const BlogEditor: React.FC<BlogEditorProps> = ({ content = '', onChange }) => {
  const [value, setValue] = useState<string>(content)

  useEffect(() => {
    setValue(content)
  }, [content])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value
    setValue(next)
    onChange?.(next)
  }

  return (
    <div className="w-full">
      <textarea
        value={value}
        onChange={handleChange}
        className="w-full min-h-[300px] p-3 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        placeholder="여기에 블로그 내용을 입력하세요..."
      />
    </div>
  )
}

export default BlogEditor


