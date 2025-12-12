
'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamic imports to avoid SSR issues
const SimpleTiptapEditor = dynamic(() => import('@/components/edit/SimpleTiptapEditor'), { ssr: false })
const SimpleQuillEditor = dynamic(() => import('@/components/edit/SimpleQuillEditor'), { ssr: false })
const SimpleEditorJS = dynamic(() => import('@/components/edit/SimpleEditorJS'), { ssr: false })
const SimpleSummernote = dynamic(() => import('@/components/edit/SimpleSummernote'), { ssr: false })

export default function EditPage() {
  const [activeTab, setActiveTab] = useState('tiptap')
  const [content, setContent] = useState('<p>Hello World! Edit me.</p>')

  const editors = [
    { id: 'tiptap', name: 'Tiptap' },
    { id: 'quill', name: 'React Quill' },
    { id: 'editorjs', name: 'Editor.js' },
    { id: 'summernote', name: 'Summernote' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Editor Comparison</h1>

      <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
        <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
          {editors.map((editor) => (
            <li key={editor.id} className="me-2">
              <button
                onClick={() => setActiveTab(editor.id)}
                className={`inline-block p-4 border-b-2 rounded-t-lg ${activeTab === editor.id
                    ? 'text-blue-600 border-blue-600 active dark:text-blue-500 dark:border-blue-500'
                    : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                  }`}
              >
                {editor.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="w-full">
          <h2 className="text-lg font-semibold mb-2">Editor View ({editors.find(e => e.id === activeTab)?.name})</h2>
          <div className="bg-white rounded-lg shadow-sm">
            {activeTab === 'tiptap' && (
              <SimpleTiptapEditor value={content} onChange={setContent} height={400} />
            )}
            {activeTab === 'quill' && (
              <SimpleQuillEditor value={content} onChange={setContent} height={400} />
            )}
            {activeTab === 'editorjs' && (
              <SimpleEditorJS value={content} onChange={setContent} height={400} />
            )}
            {activeTab === 'summernote' && (
              <SimpleSummernote value={content} onChange={setContent} height={400} />
            )}
          </div>
        </div>

        <div className="w-full">
          <h2 className="text-lg font-semibold mb-2">Data View (Real-time)</h2>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg h-[400px] overflow-auto font-mono text-xs shadow-inner">
            <pre>{content}</pre>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        <p className="font-bold">Note:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li><strong>Tiptap & Quill & Summernote:</strong> Produce HTML string.</li>
          <li><strong>Editor.js:</strong> Produces JSON block data. I implemented basic handling but it might look different in "Data View".</li>
          <li><strong>State Sharing:</strong> Content is shared between Tiptap, Quill, and Summernote. Editor.js might overwrite or fail to parse HTML string initial data properly as it expects JSON.</li>
        </ul>
      </div>
    </div>
  )
}
