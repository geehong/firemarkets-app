"use client";

import React, { useState } from 'react';
import BlogEditor from '@/components/blog/editor/BlogEditor';

export default function CreateBlogPost() {
  const [blogData, setBlogData] = useState({
    title: '',
    description: '',
    content: '',
    status: 'draft',
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">새 글 작성</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <input
          type="text"
          placeholder="제목을 입력하세요..."
          className="w-full text-xl font-semibold border rounded px-3 py-2 mb-4 bg-white dark:bg-gray-800"
          value={blogData.title}
          onChange={(e) => setBlogData({ ...blogData, title: e.target.value })}
        />

        <input
          type="text"
          placeholder="설명을 입력하세요..."
          className="w-full border rounded px-3 py-2 mb-4 bg-white dark:bg-gray-800"
          value={blogData.description}
          onChange={(e) => setBlogData({ ...blogData, description: e.target.value })}
        />

        <BlogEditor
          content={blogData.content}
          onChange={(content) => setBlogData({ ...blogData, content })}
        />
      </div>
    </div>
  );
}


