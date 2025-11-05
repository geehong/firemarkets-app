"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuthNew';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

const BlogManageButton: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  // 로그인하지 않은 사용자에게는 버튼을 표시하지 않음
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="mb-6 flex justify-end">
      <Link
        href="/blog/manage"
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
      >
        <Cog6ToothIcon className="w-4 h-4" />
        글관리
      </Link>
    </div>
  );
};

export default BlogManageButton;










