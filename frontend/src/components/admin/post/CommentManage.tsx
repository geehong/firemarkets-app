"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Trash2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuthNew';
import { getAdminComments, updateCommentStatus, deleteComment, Comment } from '@/api/comments';
import { format } from 'date-fns';
import Link from 'next/link';
import { parseLocalized } from '@/utils/parseLocalized';

const CommentManage: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { isAdmin, loading: authLoading } = useAuth();

    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    // State from URL or defaults
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
    const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
    const [pageSize, setPageSize] = useState(Number(searchParams.get('page_size')) || 20);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [localSearchInput, setLocalSearchInput] = useState(searchTerm);

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkAction, setBulkAction] = useState('approve');
    const [isProcessing, setIsProcessing] = useState(false);

    // Update URL helper
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

    // Sync state with URL
    useEffect(() => {
        const status = searchParams.get('status') || 'all';
        const page = Number(searchParams.get('page')) || 1;
        const size = Number(searchParams.get('page_size')) || 20;
        const search = searchParams.get('search') || '';

        if (status !== statusFilter) setStatusFilter(status);
        if (page !== currentPage) setCurrentPage(page);
        if (size !== pageSize) setPageSize(size);
        if (search !== searchTerm) {
            setSearchTerm(search);
            setLocalSearchInput(search);
        }
    }, [searchParams]);

    // Fetch Data
    const fetchData = async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const res = await getAdminComments(currentPage, pageSize, statusFilter === 'all' ? undefined : statusFilter, searchTerm);
            setComments(res.comments || []);
            setTotal(res.total || 0);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchData();
        }
    }, [authLoading, isAdmin, currentPage, pageSize, statusFilter, searchTerm]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearchInput !== searchTerm) {
                updateURL({ search: localSearchInput, page: 1 });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localSearchInput]);


    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(comments.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelect = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter(i => i !== id));
        }
    };

    const handleBulkAction = async () => {
        if (selectedIds.length === 0) return alert('선택된 항목이 없습니다.');
        if (!confirm(`선택한 ${selectedIds.length}개의 댓글을 처리하시겠습니까?`)) return;

        setIsProcessing(true);
        try {
            if (bulkAction === 'delete') {
                await Promise.all(selectedIds.map(id => deleteComment(id)));
            } else {
                // map action to status
                // options: approve -> approved, pending -> pending, trash -> trash, spam -> spam
                let status = 'pending';
                if (bulkAction === 'approve') status = 'approved';
                else if (bulkAction === 'trash') status = 'trash';
                else if (bulkAction === 'spam') status = 'spam';
                else if (bulkAction === 'pending') status = 'pending';

                await Promise.all(selectedIds.map(id => updateCommentStatus(id, status)));
            }
            setSelectedIds([]);
            fetchData();
            alert('처리되었습니다.');
        } catch (e) {
            console.error(e);
            alert('오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (authLoading) return <div className="p-8 text-center">Loading...</div>;
    if (!isAdmin) return <div className="p-8 text-red-600 text-center">Access Denied</div>;

    const totalPages = Math.ceil(total / pageSize) || 1;

    return (
        <div className="w-full p-6">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">댓글 관리</h1>
                </div>

                <div className="flex items-center gap-8 mb-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">총 {total}개 댓글</span>
                    <div className="flex items-center gap-2 ml-auto">
                        <input
                            type="text"
                            value={localSearchInput}
                            onChange={(e) => setLocalSearchInput(e.target.value)}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-white w-64"
                            placeholder="내용, 작성자 검색..."
                        />
                        <button onClick={fetchData} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md">
                            <Search className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs / Filters + Bulk Actions Area matching BlogManage style somewhat but separating filters */}
            <div className="mb-4">
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Bulk Actions */}
                    <div className="flex items-center gap-2">
                        <select
                            value={bulkAction}
                            onChange={(e) => setBulkAction(e.target.value)}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-white"
                        >
                            <option value="approve">승인 (Approve)</option>
                            <option value="pending">대기 (Pending)</option>
                            <option value="spam">스팸 (Spam)</option>
                            <option value="trash">휴지통 (Trash)</option>
                            <option value="delete">영구 삭제 (Delete)</option>
                        </select>
                        <button
                            onClick={handleBulkAction}
                            disabled={isProcessing || selectedIds.length === 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm disabled:opacity-50"
                        >
                            {isProcessing ? '처리중...' : '실행'}
                        </button>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => updateURL({ status: e.target.value, page: 1 })}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-white"
                        >
                            <option value="all">모든 상태</option>
                            <option value="pending">승인 대기</option>
                            <option value="approved">승인됨</option>
                            <option value="spam">스팸</option>
                            <option value="trash">휴지통</option>
                        </select>
                    </div>

                    {/* Pagination Size */}
                    <div className="ml-auto flex items-center gap-2">
                        <select
                            value={pageSize}
                            onChange={(e) => updateURL({ page_size: Number(e.target.value), page: 1 })}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-white"
                        >
                            <option value={10}>10개</option>
                            <option value={20}>20개</option>
                            <option value={50}>50개</option>
                            <option value={100}>100개</option>
                        </select>

                        {/* Pagination Controls */}
                        <div className="flex items-center gap-1">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => updateURL({ page: Math.max(1, currentPage - 1) })}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-sm">{currentPage} / {totalPages}</span>
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => updateURL({ page: Math.min(totalPages, currentPage + 1) })}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 uppercase">
                        <tr>
                            <th className="p-4 w-4">
                                <input type="checkbox" onChange={(e) => handleSelectAll(e.target.checked)} checked={comments.length > 0 && selectedIds.length === comments.length} />
                            </th>
                            <th className="p-4">작성자</th>
                            <th className="p-4">내용</th>
                            <th className="p-4">관련 포스트</th>
                            <th className="p-4">작성일</th>
                            <th className="p-4">상태</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center">Loading...</td></tr>
                        ) : comments.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center">No comments found.</td></tr>
                        ) : (
                            comments.map(comment => (
                                <tr key={comment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(comment.id)}
                                            onChange={(e) => handleSelect(comment.id, e.target.checked)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="font-semibold text-gray-900 dark:text-white">{comment.author_name || 'Anonymous'}</div>
                                        <div className="text-xs text-gray-500">{comment.author_email}</div>
                                    </td>
                                    <td className="p-4 max-w-md">
                                        <div className="truncate mb-1 font-medium" title={comment.content}>{comment.content}</div>
                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className="text-xs text-gray-500">Replies: {comment.replies.length}</div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {comment.post ? (
                                            <Link href={`/posts/${comment.post.id}`} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1">
                                                {parseLocalized(comment.post.title, 'ko') || `Post #${comment.post_id}`}
                                            </Link>
                                        ) : (
                                            <span className="text-gray-400">Post #${comment.post_id}</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {format(new Date(comment.created_at), 'yyyy-MM-dd HH:mm')}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${comment.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                            comment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                comment.status === 'spam' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                            }`}>
                                            {comment.status.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CommentManage;
