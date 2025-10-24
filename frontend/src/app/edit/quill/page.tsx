"use client";

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// QuillEdit를 동적으로 import하여 SSR 문제 해결
const QuillEdit = dynamic(() => import('@/components/edit/QuillEdit'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-gray-500">Loading Quill Editor...</div>
    </div>
  )
});

export default function QuillPage() {
  const [content, setContent] = useState("Welcome to Quill Editor!");

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    console.log('Quill content changed:', newContent);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Quill Editor
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Modern rich text editor with advanced features and resizable interface
              </p>
            </div>

            <div className="mb-6">
              <QuillEdit
                initialValue={content}
                onChange={handleContentChange}
                height={600}
              />
            </div>

            <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Quill Content Preview:
              </h3>
              <div
                className="prose max-w-none text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
