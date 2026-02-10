"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, Bot, Eye, RefreshCw, Eraser } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuthNew';
import { nanoid } from 'nanoid';
import { parseLocalized } from '@/utils/parseLocalized';
import { useLocale } from 'next-intl';
import { usePosts, useDeletePost, useUpdatePost, useMergePosts, useCleanupPosts, Post } from '@/hooks/data/usePosts';

const BlogManage: React.FC<{ postType?: string, pageTitle?: string, defaultStatus?: string }> = ({
  postType = 'post',
  pageTitle,
  defaultStatus = 'all'
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locale = useLocale();
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();

  const typeList = postType.split(',').map(t => t.trim());

  // Initialize state from URL params or defaults
  const [currentPostType, setCurrentPostType] = useState(searchParams.get('post_type') || (typeList.includes('all') ? 'all' : typeList[0]));
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || defaultStatus);
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get('page_size')) || 10);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [localSearchInput, setLocalSearchInput] = useState(searchTerm);
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('order') as 'asc' | 'desc') || 'desc');

  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState('delete');
  const [isMerging, setIsMerging] = useState(false); // Add loading state
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  // Helper to update URL
  const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || (key === 'page' && value === 1)) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  useEffect(() => {
    console.log('[BlogManage] Component Mounted');
    return () => console.log('[BlogManage] Component Unmounted');
  }, []);

  // Auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, authLoading, router]);

  // Sync state when URL params change (e.g. back button)
  useEffect(() => {
    const pType = searchParams.get('post_type') || (typeList.includes('all') ? 'all' : (typeList.includes(currentPostType) ? currentPostType : typeList[0]));
    const status = searchParams.get('status') || defaultStatus;

    // Page: Default to 1 if not present
    const pageParam = searchParams.get('page');
    const page = pageParam ? Number(pageParam) : 1;

    const pSize = Number(searchParams.get('page_size')) || 10;
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort_by') || 'created_at';
    const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc';

    if (pType !== currentPostType) setCurrentPostType(pType);
    if (status !== statusFilter) setStatusFilter(status);
    if (page !== currentPage) setCurrentPage(page);
    if (pSize !== pageSize) setPageSize(pSize);
    if (search !== searchTerm) {
      setSearchTerm(search);
      setLocalSearchInput(search);
    }
    if (sort !== sortBy) setSortBy(sort);
    if (order !== sortOrder) setSortOrder(order);
  }, [searchParams, typeList, defaultStatus, currentPostType, statusFilter, currentPage, pageSize, searchTerm, sortBy, sortOrder]);

  // Debounce search update REMOVED per user request for manual trigger
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     if (localSearchInput !== searchTerm) {
  //       updateURL({ search: localSearchInput, page: 1 });
  //     }
  //   }, 500);
  //
  //   return () => clearTimeout(timer);
  // }, [localSearchInput, searchTerm, updateURL]);

  // Hooks
  const { data, isLoading, isError, error, refetch, isRefetching } = usePosts({
    page: currentPage,
    page_size: pageSize,
    post_type: currentPostType === 'all' ? undefined : currentPostType,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchTerm,
    author_id: (!isAdmin && user?.id) ? user.id : undefined,
    sort_by: sortBy,
    order: sortOrder,
  });

  const deletePostMutation = useDeletePost();
  const updatePostMutation = useUpdatePost();
  const mergePostsMutation = useMergePosts();
  const cleanupPostsMutation = useCleanupPosts();

  // Handle 401 Error in usePosts
  useEffect(() => {
    if (isError && error) {
      // @ts-ignore
      const msg = error?.message || '';
      if (msg.includes('401')) {
        // Redirect or logout logic could go here
        console.warn("Unauthorized access detected (401).");
      }
    }
  }, [isError, error]);

  const blogs = (data as any)?.posts || [];
  const totalBlogs = (data as any)?.total || 0;
  const totalPages = (data as any)?.total_pages || 1;

  const handleStateChange = (updates: Record<string, any>) => {
    // Update local state is handled by useEffect on searchParams, 
    // BUT for immediate UI feedback we might set state too? 
    // Actually relying on useEffect above is safer for single source of truth,
    // but adds a slight delay. Let's update URL and let useEffect sync state.
    // However, for inputs (search), we need local state.

    // Logic: Trigger updateURL -> searchParams change -> useEffect -> updates state.
    updateURL(updates);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      handleStateChange({ order: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      handleStateChange({ sort_by: column, order: 'desc' });
    }
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-400" />;
    return <ArrowUpDown className={`w-3 h-3 h-3 ml-1 ${sortOrder === 'asc' ? 'text-blue-500 rotate-180' : 'text-blue-500'}`} />;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPosts(blogs.map((blog: any) => blog.id));
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

  const handleCleanup = useCallback(async () => {
    console.log('[BlogManage] handleCleanup (API Call) started immediately');
    
    setIsCleaning(true);
    setCleanupResult(null);
    try {
      const result = await cleanupPostsMutation.mutateAsync();
      console.log('[BlogManage] Cleanup successfully completed', result);
      
      // @ts-ignore
      const msg = result.message || '정리 완료';
      setCleanupResult(msg);
      
      // Auto-hide result after 3 seconds
      setTimeout(() => setCleanupResult(null), 3000);
      
      refetch(); // Refresh list to show changes
    } catch (err) {
      console.error('[BlogManage] Cleanup error:', err);
      // @ts-ignore
      setCleanupResult(`Error: ${err.message || 'Fail'}`);
      setTimeout(() => setCleanupResult(null), 5000);
    } finally {
      setIsCleaning(false);
    }
  }, [cleanupPostsMutation, refetch]);

  const handleRefresh = () => {
    refetch();
  };

  const handleBulkAction = async () => {
    if (selectedPosts.length === 0) {
      alert('선택된 포스트가 없습니다.');
      return;
    }

    if (!confirm(`선택한 ${selectedPosts.length}개의 포스트를 ${bulkAction === 'delete' ? '삭제' : '발행'}하시겠습니까?`)) {
      return;
    }

    try {
      if (bulkAction === 'delete') {
        await Promise.all(selectedPosts.map(id => deletePostMutation.mutateAsync(id)));
        setSelectedPosts([]);
      } else if (bulkAction === 'publish') {
        // @ts-ignore
        await Promise.all(selectedPosts.map(id =>
          updatePostMutation.mutateAsync({ postId: id, postData: { status: 'published' } })
        ));
        setSelectedPosts([]);
      } else if (bulkAction === 'ai_merge') {
        if (selectedPosts.length < 2) {
          alert('병합하려면 최소 2개의 포스트를 선택해야 합니다.');
          return;
        }

        // AI Merge 실행
        setIsMerging(true);

        try {
          const newPost = await mergePostsMutation.mutateAsync(selectedPosts);

          if (newPost && newPost.id) {
            // 1. Delete source posts (as requested)
            // We do this in parallel. If one fails, we still proceed with the new post but alert?
            // User said "merged 2+ posts are immediately deleted".
            try {
              await Promise.all(selectedPosts.map(id => deletePostMutation.mutateAsync(id)));
              console.log('[BlogManage] Source posts deleted after merge:', selectedPosts);
            } catch (delErr) {
              console.error('[BlogManage] Failed to delete source posts:', delErr);
              alert('병합은 완료되었으나 원본 포스트 삭제 중 오류가 발생했습니다.');
            }

            // 2. Prepare updates for the New Post
            // - Slug: English title (auto-generated)
            // - Status: 'archived'
            // - Post Type: 'ai_draft_news'
            
            // Generate slug
            let slugTitle = '';
            // @ts-ignore
            if (typeof newPost.title === 'string') {
               // @ts-ignore
               slugTitle = newPost.title;
            } else if (newPost.title && typeof newPost.title === 'object') {
               // @ts-ignore
               slugTitle = newPost.title.en || newPost.title.ko || '';
            }

            const cleanSlug = slugTitle
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .trim()
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-');
            
            const finalSlug = cleanSlug || `merge-${nanoid(10)}`;

            // Call Update
            await updatePostMutation.mutateAsync({
              postId: newPost.id,
              postData: {
                slug: finalSlug,
                status: 'archived',
                post_type: 'ai_draft_news'
                // Tickers, keywords, tags are hopefully handled by the backend merge or 
                // extracted by the 'ai_draft_news' editor logic later. 
                // If backend merge puts them in post_info, they will be saved.
              }
            });

            // 3. Open in New Window
            const routePrefix = (typeList.includes('page') || currentPostType === 'page') ? 'page' : 'post';
            window.open(`/admin/${routePrefix}/edit/${newPost.id}`, '_blank');
            
            // Refresh current list to remove deleted posts
            setSelectedPosts([]);
            refetch();

          } else {
              alert('병합에 실패했습니다 (결과 없음).');
          }
        } catch (err) {
          console.error('[BlogManage] Merge error:', err);
          alert('병합 작업 중 오류가 발생했습니다.');
        } finally {
          setIsMerging(false);
        }
      } else if (bulkAction === 'publish_brief') {
        setIsMerging(true); // Reuse merging loading state for UI feedback
        try {
          await Promise.all(selectedPosts.map(id => {
            const post = blogs.find((b: any) => b.id === id);
            if (!post) return;
            // Default extract from post_info or existing fields
            // Assuming post_info is available in the list data (it should be if included in API)
            // If post_info is a string, parse it.
            let imageUrl: string | null = null;
            if (post) {
              // @ts-ignore
              const info = typeof post.post_info === 'string' ? JSON.parse(post.post_info) : post.post_info;
              // User request: explicit use of image_url. If null, set cover_image to null.
              imageUrl = info?.image_url || null;
            }

            // Generate English slug from title
            let slugTitle = '';
            // @ts-ignore
            if (typeof post.title === 'string') {
              // @ts-ignore
              slugTitle = post.title;
            } else if (post?.title && typeof post.title === 'object') {
              // @ts-ignore
              slugTitle = post.title.en || post.title.ko || '';
            }

            let newSlug = slugTitle
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars
              .trim()
              .replace(/\s+/g, '-') // Replace spaces with -
              .replace(/-+/g, '-'); // Merge multiple -

            if (!newSlug || newSlug.length < 5) {
              newSlug = `brief-${nanoid(10)}`;
            } else {
              // 슬러그 중복을 방지하기 위해 짧은 고유 ID 추가
              newSlug = `${newSlug.substring(0, 80)}-${nanoid(6)}`;
            }

            return updatePostMutation.mutateAsync({
              postId: id,
              postData: {
                status: 'published',
                post_type: 'brief_news',
                category_id: 2, // 투자 가이드 ID
                slug: newSlug,
                cover_image: imageUrl // Explicitly set cover_image (can be null)
              }
            });
          }));
          setSelectedPosts([]);
          alert('선택된 뉴스들이 단신으로 발행되었습니다.');
        } finally {
          setIsMerging(false);
          refetch(); // Refresh list to show updates
        }
      }
    } catch (err) {
      console.error('Bulk action error:', err);
      setIsMerging(false);
      // @ts-ignore
      alert(`작업 중 오류가 발생했습니다: ${err.message || 'Unknown error'}`);
    }
  };

  const handleEditPost = (postId: number) => {
    if (!postId) return;
    const routePrefix = (typeList.includes('page') || currentPostType === 'page') ? 'page' : 'post';
    window.open(`/admin/${routePrefix}/edit/${postId}`, '_blank');
  };

  const handleDeletePost = async (postId: number) => {
    if (!confirm('정말로 이 포스트를 삭제하시겠습니까?')) {
      return;
    }
    try {
      await deletePostMutation.mutateAsync(postId);
    } catch (error) {
      console.error('Delete post error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

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

  if (!isAuthenticated) return null;

  return (
    <div className="w-full p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {pageTitle || (currentPostType === 'post' ? '블로그 관리' : '페이지 관리')}
            </h1>
          </div>

          <div className="flex items-center gap-2">


            <button
              onClick={() => router.push(`/admin/${typeList.includes('post') ? 'post' : 'page'}/create?post_type=${currentPostType}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              새글추가
            </button>
          </div>
        </div>

        <div className="flex items-center gap-8 mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            총 {totalBlogs}개 포스트
          </span>

          <span className="text-xs text-blue-600 dark:text-blue-400">
            {statusFilter === 'all'
              ? '모든 상태'
              : `${statusFilter === 'published' ? '발행됨' : statusFilter === 'draft' ? '초안' : '보관됨'} 상태`
            }
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isAdmin ? '(관리자)' : '(내 작성글)'}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <input
              type="text"
              value={localSearchInput}
              onChange={(e) => setLocalSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateURL({ search: localSearchInput, page: 1 });
                }
              }}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-white w-64"
              placeholder="제목 검색..."
            />
            <button
              onClick={() => updateURL({ search: localSearchInput, page: 1 })}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm flex items-center gap-1"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

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
              <option value="ai_merge">AI 병합 (Merge)</option>
              {/* Only show brief option if mainly raw_news or relevant context */}
              <option value="publish_brief">단신 발행 (Brief)</option>
            </select>
            <button
              onClick={handleBulkAction}
              disabled={isMerging}
              className={`text-white px-3 py-1 rounded-md text-sm ${isMerging
                ? 'bg-gray-400 cursor-not-allowed'
                : bulkAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {isMerging ? '처리중...' : '적용'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => handleStateChange({ status: e.target.value, page: 1 })}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-white"
            >
              <option value="all">모든 상태</option>
              <option value="published">발행됨</option>
              <option value="draft">초안</option>
              <option value="archived">보관됨</option>
            </select>
          </div>

          <div>
            {typeList.length > 1 && (
              <select
                value={currentPostType}
                onChange={(e) => handleStateChange({ post_type: e.target.value, page: 1 })}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-white font-medium"
              >
                {typeList.map(type => (
                  <option key={type} value={type}>
                    {type.toUpperCase().replace('_', ' ')}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              className={`p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors ${isRefetching || isLoading ? 'animate-spin' : ''}`}
              title="새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Cleanup Button - Immediate Execution */}
            {(typeList.includes('news') || typeList.includes('raw_news') || currentPostType === 'all' || typeList.includes('all')) && (
              <div className="relative flex items-center gap-2">
                {cleanupResult && (
                  <span className="text-xs font-medium text-blue-600 animate-in fade-in slide-in-from-right-2 duration-300 whitespace-nowrap bg-blue-50 px-2 py-1 rounded border border-blue-200 shadow-sm">
                    {cleanupResult}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[BlogManage] Cleanup button clicked - immediate execution');
                    handleCleanup();
                  }}
                  disabled={isCleaning}
                  className={`p-1.5 rounded-lg flex items-center justify-center border transition-all duration-200 bg-red-100 hover:bg-red-200 text-red-700 border-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 dark:border-red-800 ${isCleaning ? 'animate-spin cursor-not-allowed opacity-50' : ''}`}
                  title={locale === 'ko' ? "불량 뉴스 정리 (빈 내용, 오역 등)" : "Clean News (Empty content, translation errors, etc.)"}
                >
                  <Eraser className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>

            <select
              value={pageSize}
              onChange={(e) => handleStateChange({ page_size: Number(e.target.value), page: 1 })}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-white"
            >
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
              <option value={250}>250개</option>
              <option value={500}>500개</option>
              <option value={1000}>1000개</option>
            </select>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
            <button
              disabled={currentPage === 1}
              onClick={() => handleStateChange({ page: Math.max(1, currentPage - 1) })}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 dark:text-gray-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => handleStateChange({ page: Math.min(totalPages, currentPage + 1) })}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 dark:text-gray-300"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {
        isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        )
      }

      {
        isError && (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">Error loading posts: {error instanceof Error ? error.message : 'Unknown error'}</p>
            <button
              onClick={() => refetch()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )
      }

      {
        !isLoading && !isError && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      checked={blogs.length > 0 && selectedPosts.length === blogs.length}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      제목 {renderSortIcon('title')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('post_type')}
                  >
                    <div className="flex items-center">
                      타입 {renderSortIcon('post_type')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">카테고리</th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      상태 {renderSortIcon('status')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center">
                      작성일 {renderSortIcon('created_at')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('published_at')}
                  >
                    <div className="flex items-center">
                      발행일 {renderSortIcon('published_at')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">액션</th>
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
                  blogs.map((blog: any) => (
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
                          className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                          onClick={() => handleEditPost(blog.id)}
                        >
                          {parseLocalized(blog.title, locale)}
                          {blog.post_type.startsWith('ai_') && (
                            <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" aria-label="AI Generated" />
                          )}
                        </h3>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 w-fit ${blog.post_type.startsWith('ai_')
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-gray-100 dark:bg-gray-700'
                          }`}>
                          {blog.post_type.startsWith('ai_') && <Bot className="w-3 h-3" />}
                          {blog.post_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {blog.category?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${blog.status === 'published'
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
                        {blog.published_at ? new Date(blog.published_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditPost(blog.id)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900 rounded"
                            title="에디터"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <a
                            href={blog.post_type === 'news' ? `/news/${blog.slug}` : blog.post_type === 'brief_news' ? `/news/briefnews/${blog.slug}` : `/blog/${blog.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900 rounded"
                            title="보기"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeletePost(blog.id)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900 rounded"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )
      }
    </div >
  );
};

export default BlogManage;