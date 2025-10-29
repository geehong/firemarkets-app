"use client";

import React from 'react';
import Link from 'next/link';

export default function EditPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                에디터 선택
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                사용할 에디터를 선택하세요
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* CKEditor */}
              <Link href="/edit/ckeditor">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">CK</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      CKEditor
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Professional WYSIWYG editor with advanced features
                    </p>
                  </div>
                </div>
              </Link>

              {/* Quill Editor */}
              <Link href="/edit/quill">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">Q</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Quill Editor
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Modern rich text editor with resizable interface
                    </p>
                  </div>
                </div>
              </Link>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
