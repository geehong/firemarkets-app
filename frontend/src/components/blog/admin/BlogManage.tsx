"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAutoLocalization } from '@/contexts/AutoLocalizationContext';
import { useAuth } from '@/hooks/useAuthNew';
import { usePermissions } from '@/hooks/usePermissions';
import { filterAccessibleBlogs } from '@/utils/ownershipFilter';
import PermissionGate from '@/components/PermissionGate';

interface Blog {
  id: number;
  title: string | { ko?: string; en?: string };
  slug: string;
  content?: string;
  content_ko?: string;
  description?: string | { ko?: string; en?: string };
  excerpt?: string | { ko?: string; en?: string };
  status: string;
  created_at: string;
  updated_at: string;
  view_count?: number;
  author?: {
    id: number;
    username: string;
    email: string;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  tags?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

const BlogManage: React.FC = () => {
  const router = useRouter();
  const { localizeArray } = useAutoLocalization();
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState('delete');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: '1',
        page_size: '50',
        post_type: 'post'
      });
      
      // 관리자가 아닌 경우 자신의 글만 필터링
      if (!isAdmin) {
        params.append('user_id', user?.id?.toString() || '1');
      }
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (categoryFilter) {
        params.append('category', categoryFilter);
      }
      if (tagFilter) {
        params.append('tag', tagFilter);
      }
      
      const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_API_BASE || 'https://backend.firemarkets.net/api/v1';
      const url = `${BACKEND_BASE}/posts/?${params}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch blogs');
      }

      const data = await response.json();
      
      // 자동으로 다국어 데이터 변환
      const localizedPosts = localizeArray(data.posts || []);
      
      // 소유권 기반 필터링
      const ownershipFilter = {
        userId: user?.id || 1,
        userRole: user?.role || 'user',
        userPermissions: user?.permissions || []
      };
      
      const accessiblePosts = filterAccessibleBlogs(localizedPosts, ownershipFilter);
      setBlogs(accessiblePosts as Blog[]);
      setTotalBlogs(accessiblePosts.length);
      
      // 상태별 카운트 계산
      const published = accessiblePosts.filter((post: any) => post.status === 'published').length;
      const draft = accessiblePosts.filter((post: any) => post.status === 'draft').length;
      setPublishedCount(published);
      setDraftCount(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching blogs:', err);
    } finally {
      setLoading(false);
    }
  }, [localizeArray, searchTerm, categoryFilter, tagFilter, user]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPosts(blogs.map(blog => blog.id));
    } else {
      setSelectedPosts([]);
    }
  };

  const handleSelectPost = (postId: number, checked: boolean) => {
    if (checked) {
      setSelectedPosts([...selectedPosts, postId]);
    } else {
      setSelectedPosts(selectedPosts.filter(id => id !== postId));
    }
  };

  const handleBulkAction = () => {
    console.log('Bulk action:', bulkAction, 'on posts:', selectedPosts);
    // TODO: 실제 API 호출로 일괄 액션 실행
  };

  const handleSearch = () => {
    fetchBlogs();
  };

  // 인증 상태 확인
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/admin/signin');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBlogs();
    }
  }, [fetchBlogs, isAuthenticated]);

  // 로딩 중이거나 인증되지 않은 경우
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="mt-3 text-sm text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // 리다이렉션 중
  }

  return (
    <div className="w-full p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            블로그 관리
          </h1>
          <PermissionGate requiredPermission="write">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              새글추가
            </button>
          </PermissionGate>
        </div>
        
        {/* 상태 통계 */}
        <div className="flex items-center gap-8 mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            전체[{totalBlogs}] | 발행됨[{publishedCount}] | 초안[{draftCount}] | 임시[0]
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {isAdmin 
              ? '모든 블로그 표시됨 (관리자 권한)' 
              : '내가 작성한 블로그만 표시됨'
            }
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-white"
              placeholder="검색어 입력"
            />
            <button 
              onClick={handleSearch}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm flex items-center gap-1"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
              검색
            </button>
          </div>
        </div>
      </div>

      {/* 필터 및 액션 */}
      <div className="mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-white"
            >
              <option value="delete">삭제</option>
              <option value="publish">발행</option>
            </select>
            <PermissionGate requiredPermission="delete">
              <button
                onClick={handleBulkAction}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
              >
                적용
              </button>
            </PermissionGate>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-white"
            >
              <option value="">블로그</option>
              <option value="page">페이지</option>
            </select>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-white"
            >
              <option value="">암호화폐</option>
              <option value="bubble">버블</option>
              <option value="onchain">온체인</option>
            </select>
          </div>

          <div className="ml-auto">
            <span className="text-sm text-gray-600 dark:text-gray-400">페이징</span>
          </div>
        </div>
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">Error loading posts: {error}</p>
          <button
            onClick={fetchBlogs}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* 테이블 */}
      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">제목</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">키워드</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">개요</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">태그</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">상태</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">작성일</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">발행일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {blogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No posts available
                  </td>
                </tr>
              ) : (
                blogs.map((blog) => {
                  return (
                    <tr key={blog.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        {(isAdmin || blog.author_id === user?.id) && (
                          <input
                            type="checkbox"
                            checked={selectedPosts.includes(blog.id)}
                            onChange={(e) => handleSelectPost(blog.id, e.target.checked)}
                            className="rounded border-gray-300"
                          />
                        )}
                      </td>
                    <td className="px-4 py-3">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {typeof blog.title === 'string' ? blog.title : blog.title?.en || blog.title?.ko || 'Untitled'}
                      </h3>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {blog.category?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {typeof blog.description === 'string' ? blog.description : blog.description?.en || blog.description?.ko || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {blog.tags && blog.tags.length > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {blog.tags.map(tag => tag.name).join(', ')}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        blog.status === 'published' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {blog.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(blog.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {blog.status === 'published' ? new Date(blog.updated_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BlogManage;