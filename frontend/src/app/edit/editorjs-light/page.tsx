"use client";

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// EditorJSLight를 동적으로 import하여 SSR 문제 해결
const EditorJSLight = dynamic(() => import('@/components/edit/EditorJSLight'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-gray-500">Loading EditorJS Light...</div>
    </div>
  )
});

export default function EditorJSLightPage() {
  const [editorJSData, setEditorJSData] = useState(null);

  const handleEditorJSChange = useCallback((data: any) => {
    setEditorJSData(data);
    console.log('EditorJS Light data changed:', data);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Editor.js Light
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                최적화된 경량 버전 - 필수 도구만 포함 (메모리 사용량 대폭 감소)
              </p>
              <div className="mt-2 p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <p className="text-green-800 dark:text-green-200 text-sm">
                  💡 최적화 효과: 도구 13개 → 4개 (69% 감소), 메모리 사용량 대폭 감소
                </p>
              </div>
            </div>

            <div className="mb-6">
              <EditorJSLight
                initialData={editorJSData}
                onChange={handleEditorJSChange}
                height={600}
              />
            </div>

            {editorJSData && (
              <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  EditorJS Light JSON Data:
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
