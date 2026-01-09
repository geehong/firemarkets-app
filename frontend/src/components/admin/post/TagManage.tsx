"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Trash2, Pencil, Plus, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/auth/useAuthNew';
import { getAdminTags, createTag, updateTag, deleteTag, PostTag } from '@/api/tags';
import { format } from 'date-fns';
import { Modal } from '@/components/ui/modal';

const TagManage: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { isAdmin, loading: authLoading } = useAuth();

    // Data State
    const [tags, setTags] = useState<PostTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    // Filter/Pagination State
    const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
    const [pageSize, setPageSize] = useState(Number(searchParams.get('page_size')) || 20);
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [localSearchInput, setLocalSearchInput] = useState(searchTerm);
    const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'usage_count');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('order') as 'asc' | 'desc') || 'desc');

    // UI State
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<PostTag | null>(null);
    const [modalFormData, setModalFormData] = useState({ name: '', slug: '' });
    const [modalError, setModalError] = useState('');

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
        const page = Number(searchParams.get('page')) || 1;
        const size = Number(searchParams.get('page_size')) || 20;
        const search = searchParams.get('search') || '';
        const sort = searchParams.get('sort_by') || 'usage_count';
        const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc';

        if (page !== currentPage) setCurrentPage(page);
        if (size !== pageSize) setPageSize(size);
        if (search !== searchTerm) setLocalSearchInput(search); // Sync input only on external change
        if (search !== searchTerm) setSearchTerm(search);
        if (sort !== sortBy) setSortBy(sort);
        if (order !== sortOrder) setSortOrder(order);
    }, [searchParams]);

    // Fetch Data
    const fetchData = async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const res = await getAdminTags(currentPage, pageSize, searchTerm, sortBy, sortOrder);
            setTags(res.tags || []);
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
    }, [authLoading, isAdmin, currentPage, pageSize, searchTerm, sortBy, sortOrder]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearchInput !== searchTerm) {
                updateURL({ search: localSearchInput, page: 1 });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localSearchInput]);

    // Selection Handlers
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(tags.map(t => t.id));
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

    // Sorting
    const handleSort = (column: string) => {
        if (sortBy === column) {
            updateURL({ order: sortOrder === 'asc' ? 'desc' : 'asc' });
        } else {
            updateURL({ sort_by: column, order: 'desc' });
        }
    };

    // Modal Actions
    const openCreateModal = () => {
        setEditingTag(null);
        setModalFormData({ name: '', slug: '' });
        setModalError('');
        setIsModalOpen(true);
    };

    const openEditModal = (tag: PostTag) => {
        setEditingTag(tag);
        setModalFormData({ name: tag.name, slug: tag.slug });
        setModalError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError('');
        setIsProcessing(true);
        try {
            if (editingTag) {
                await updateTag(editingTag.id, modalFormData.name, modalFormData.slug);
            } else {
                await createTag(modalFormData.name, modalFormData.slug);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            console.error(err);
            setModalError(err.message || 'Failed to save tag');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this tag?')) return;
        try {
            await deleteTag(id);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to delete tag');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} tags?`)) return;
        setIsProcessing(true);
        try {
            await Promise.all(selectedIds.map(id => deleteTag(id)));
            setSelectedIds([]);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to delete tags');
        } finally {
            setIsProcessing(false);
        }
    };

    // Auto-generate slug
    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]+/g, '-') // Allow Korean chars
            .replace(/^-+|-+$/g, '');
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setModalFormData(prev => ({
            ...prev,
            name,
            slug: editingTag ? prev.slug : generateSlug(name) // Only auto-gen slug on create
        }));
    };

    if (authLoading) return <div className="p-8 text-center">Loading...</div>;
    if (!isAdmin) return <div className="p-8 text-red-600 text-center">Access Denied</div>;

    const totalPages = Math.ceil(total / pageSize) || 1;

    return (
        <div className="w-full p-6">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">태그 관리 (Tag Management)</h1>
                    <button
                        onClick={openCreateModal}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        새 태그 추가
                    </button>
                </div>

                <div className="flex items-center gap-8 mb-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">총 {total}개 태그</span>
                    <div className="flex items-center gap-2 ml-auto">
                        <input
                            type="text"
                            value={localSearchInput}
                            onChange={(e) => setLocalSearchInput(e.target.value)}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-white w-64"
                            placeholder="태그 검색..."
                        />
                        <button onClick={fetchData} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md">
                            <Search className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="mb-4 flex items-center gap-4 flex-wrap">
                {/* Bulk Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleBulkDelete}
                        disabled={selectedIds.length === 0 || isProcessing}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm disabled:opacity-50 flex items-center gap-1"
                    >
                        <Trash2 className="w-3 h-3" /> 삭제
                    </button>
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
                        <span className="text-sm text-gray-600 dark:text-gray-300">{currentPage} / {totalPages}</span>
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

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 uppercase">
                        <tr>
                            <th className="p-4 w-4">
                                <input type="checkbox" onChange={(e) => handleSelectAll(e.target.checked)} checked={tags.length > 0 && selectedIds.length === tags.length} />
                            </th>
                            <th className="p-4 cursor-pointer" onClick={() => handleSort('name')}>
                                <div className="flex items-center gap-1">이름 <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="p-4 cursor-pointer" onClick={() => handleSort('slug')}>
                                <div className="flex items-center gap-1">슬러그 <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="p-4 cursor-pointer" onClick={() => handleSort('usage_count')}>
                                <div className="flex items-center gap-1">사용 횟수 <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="p-4 cursor-pointer" onClick={() => handleSort('created_at')}>
                                <div className="flex items-center gap-1">생성일 <ArrowUpDown className="w-3 h-3" /></div>
                            </th>
                            <th className="p-4 text-center">작업</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center">Loading...</td></tr>
                        ) : tags.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center">No tags found.</td></tr>
                        ) : (
                            tags.map(tag => (
                                <tr key={tag.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(tag.id)}
                                            onChange={(e) => handleSelect(tag.id, e.target.checked)}
                                        />
                                    </td>
                                    <td className="p-4 font-semibold">{tag.name}</td>
                                    <td className="p-4 text-gray-500">{tag.slug}</td>
                                    <td className="p-4">{tag.usage_count}</td>
                                    <td className="p-4 text-gray-500">{format(new Date(tag.created_at), 'yyyy-MM-dd')}</td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button onClick={() => openEditModal(tag)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="수정">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <a
                                            href={`/tag/${tag.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                                            title="보기"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </a>
                                        <button onClick={() => handleDelete(tag.id)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="삭제">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} className="max-w-md w-full p-6">
                <div className="mb-6">
                    <h2 className="text-xl font-bold">{editingTag ? '태그 수정' : '새 태그 추가'}</h2>
                </div>

                {modalError && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {modalError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이름</label>
                        <input
                            type="text"
                            required
                            value={modalFormData.name}
                            onChange={handleNameChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">슬러그</label>
                        <input
                            type="text"
                            required
                            value={modalFormData.slug}
                            onChange={(e) => setModalFormData({ ...modalFormData, slug: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                        >
                            {isProcessing ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TagManage;
