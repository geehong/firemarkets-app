"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAutoLocalization } from '@/contexts/AutoLocalizationContext';
import { useAuth } from '@/hooks/useAuthNew';
// import { usePermissions } from '@/hooks/usePermissions';
// import { filterAccessibleBlogs } from '@/utils/ownershipFilter';
// import PermissionGate from '@/components/PermissionGate';

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
  author_id?: number;
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
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState('delete');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
      
      // 상태 필터 적용 - 'all'일 때는 status 파라미터를 보내지 않음 (모든 상태 조회)
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      // 관리자가 아닌 경우 자신의 글만 필터링
      if (!isAdmin && user?.id) {
        params.append('author_id', user.id.toString());
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
      
      console.log('🔍 [BlogManage] API 요청 URL:', url);
      console.log('🔍 [BlogManage] 요청 파라미터:', Object.fromEntries(params));
      console.log('🔍 [BlogManage] 사용자 정보:', { 
        userId: user?.id, 
        role: user?.role, 
        isAdmin 
      });
      
      const response = await fetch(url);
      
      console.log('🔍 [BlogManage] API 응답 상태:', response.status);
      console.log('🔍 [BlogManage] API 응답 헤더:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [BlogManage] API 에러 응답:', errorText);
        throw new Error('Failed to fetch blogs');
      }

      const data = await response.json();
      console.log('✅ [BlogManage] API 응답 데이터:', data);
      console.log('✅ [BlogManage] 포스트 개수:', data.posts?.length || 0);
      
      // 자동으로 다국어 데이터 변환
      const localizedPosts = localizeArray(data.posts || []);
      console.log('🔄 [BlogManage] 로컬라이제이션 후 포스트:', localizedPosts);
      
      // API에서 이미 필터링되었으므로 바로 설정
      setBlogs(localizedPosts as Blog[]);
      setTotalBlogs(localizedPosts.length);
      
      // 상태별 카운트 계산 (현재 필터링된 결과 기준)
      const published = localizedPosts.filter((post: any) => post.status === 'published').length;
      const draft = localizedPosts.filter((post: any) => post.status === 'draft').length;
      setPublishedCount(published);
      setDraftCount(draft);
      
      console.log('📊 [BlogManage] 최종 결과:', {
        totalBlogs: localizedPosts.length,
        publishedCount: published,
        draftCount: draft,
        statusFilter,
        isAdmin
      });
    } catch (err) {
      console.error('❌ [BlogManage] fetchBlogs 에러:', err);
      console.error('❌ [BlogManage] 에러 타입:', typeof err);
      console.error('❌ [BlogManage] 에러 스택:', err instanceof Error ? err.stack : 'No stack');
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      console.log('🏁 [BlogManage] fetchBlogs 완료');
    }
  }, [localizeArray, searchTerm, categoryFilter, tagFilter, statusFilter, user, isAdmin]);

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

  const handleEditPost = (postId: number) => {
    console.log('Edit post:', postId);
    // 포스트 편집 페이지로 이동
    router.push(`/blog/editor/${postId}`);
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('정말로 이 포스트를 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      console.log('Delete post:', postId);
      // TODO: 실제 삭제 API 호출
      // await deletePost(postId);
      // fetchBlogs(); // 목록 새로고침
    } catch (error) {
      console.error('Delete post error:', error);
    }
  };

  // 인증 상태 확인
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/admin/signin');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    console.log('🔄 [BlogManage] useEffect 실행:', { 
      isAuthenticated, 
      loading: authLoading,
      user: user?.username,
      role: user?.role 
    });
    
    if (isAuthenticated) {
      console.log('✅ [BlogManage] 인증됨, fetchBlogs 호출');
      fetchBlogs();
    } else {
      console.log('❌ [BlogManage] 인증되지 않음, fetchBlogs 건너뜀');
    }
  }, [fetchBlogs, isAuthenticated, authLoading, user]);

  // 로딩 중이거나 인증되지 않은 경우
  if (authLoading) {
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
                  {/* <PermissionGate requiredPermission="write"> */}
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                      <PlusIcon className="w-4 h-4" />
                      새글추가
                    </button>
                  {/* </PermissionGate> */}
        </div>
        
        {/* 상태 통계 */}
        <div className="flex items-center gap-8 mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            전체[{totalBlogs}] | 발행됨[{publishedCount}] | 초안[{draftCount}] | 임시[0]
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {statusFilter === 'all' 
              ? '모든 상태 표시됨' 
              : `${statusFilter === 'published' ? '발행됨' : statusFilter === 'draft' ? '초안' : '보관됨'} 상태만 표시됨`
            }
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isAdmin 
              ? '(관리자 권한)' 
              : '(내가 작성한 글만)'
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
                    {/* <PermissionGate requiredPermission="delete"> */}
                      <button
                        onClick={handleBulkAction}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                      >
                        적용
                      </button>
                    {/* </PermissionGate> */}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-white"
            >
              <option value="all">모든 상태</option>
              <option value="published">발행됨</option>
              <option value="draft">초안</option>
              <option value="archived">보관됨</option>
            </select>

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
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {blogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No posts available
                  </td>
                </tr>
              ) : (
                blogs.map((blog) => {
                  return (
                    <tr key={blog.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedPosts.includes(blog.id)}
                          onChange={(e) => handleSelectPost(blog.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <h3 
                          className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                          onClick={() => handleEditPost(blog.id)}
                        >
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
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditPost(blog.id)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900 rounded"
                          title="수정"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(blog.id)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900 rounded"
                          title="삭제"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
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