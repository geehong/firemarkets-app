"use client";

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// EditorJS를 동적으로 import하여 SSR 문제 해결
const EditorJS = dynamic(() => import('@/components/edit/EditorJS'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-gray-500">Loading Editor.js...</div>
    </div>
  )
});

export default function EditorJSPage() {
  const [editorJSData, setEditorJSData] = useState(null);

  const handleEditorJSChange = useCallback((data: any) => {
    setEditorJSData(data);
    console.log('EditorJS data changed:', data);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Editor.js
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Modern block-style editor with clean JSON output
              </p>
            </div>

            <div className="mb-6">
              <EditorJS
                initialData={editorJSData}
                onChange={handleEditorJSChange}
                height={600}
              />
            </div>

            {editorJSData && (
              <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Editor.js JSON Data:
                </h3>
                <pre className="bg-gray-800 text-green-400 p-4 rounded-lg overflow-auto text-sm">
                  {JSON.stringify(editorJSData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
