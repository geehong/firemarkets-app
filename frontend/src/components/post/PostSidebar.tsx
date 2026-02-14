'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePosts } from '@/hooks/data/usePosts'
import { parseLocalized } from '@/utils/parseLocalized'
import AdUnit from "@/components/ads/AdUnit";
import SidebarAdsWidget from '@/components/layout/SidebarAdsWidget';

interface PostSidebarProps {
    locale: string;
    postType?: string;
    ticker?: string;
}

const SidebarWidget: React.FC<{
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
}> = ({ title, children, actions }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6 last:mb-0">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {title}
                </h3>
                {actions && (
                    <div className="flex items-center gap-1">
                        {actions}
                    </div>
                )}
            </div>
            {children}
        </div>
    )
}

const PostSidebar: React.FC<PostSidebarProps> = ({ locale, postType, ticker }) => {
    const router = useRouter()
    const sidebarRef = useRef<HTMLElement>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Pagination State
    const [page, setPage] = useState(1)
    const pageSize = 5

    // 1. Search Logic
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchTerm.trim()) {
            router.push(`/${locale}/news?search=${encodeURIComponent(searchTerm)}`)
        }
    }

    // 2. Fetch Posts with Pagination
    const ALLOWED_TYPES = 'news,post,brief_news';
    
    // Determine which type to fetch. If postType is one of the allowed ones, we can use it,
    // otherwise default to the full allowed set.
    let fetchType = ALLOWED_TYPES;
    if (postType === 'blog' || postType === 'post') fetchType = 'post';
    else if (postType === 'news') fetchType = 'news';
    else if (postType === 'brief_news') fetchType = 'brief_news';

    // A. Main query: Filter by ticker if available, else by determined type
    const { data: postsData, isLoading: isPostsLoading } = usePosts({
        page,
        page_size: pageSize,
        post_type: ticker ? ALLOWED_TYPES : fetchType,
        ticker: ticker,
    })

    // B. Filling query: Get recent general posts if ticker-based results are insufficient
    const { data: recentPostsData, isLoading: isRecentLoading } = usePosts({
        page: 1,
        page_size: 10,
        post_type: ALLOWED_TYPES,
    }, { 
        enabled: !!ticker && (!(postsData as any) || ((postsData as any)?.posts?.length || 0) < 5)
    })

    // Combine posts
    const tickerPosts = (postsData as any)?.posts || []
    let displayPosts = tickerPosts
    
    if (ticker && displayPosts.length < 5 && (recentPostsData as any)?.posts) {
        const existingIds = new Set(displayPosts.map((p: any) => p.id))
        const fillPosts = (recentPostsData as any).posts.filter((p: any) => !existingIds.has(p.id))
        displayPosts = [...displayPosts, ...fillPosts].slice(0, 5)
    }

    const totalPages = (postsData as any)?.total_pages || 1
    const isLoading = isPostsLoading || (ticker && isRecentLoading && tickerPosts.length === 0)

    const handlePrevPage = () => {
        if (page > 1) setPage(p => p - 1)
    }

    const handleNextPage = () => {
        if (page < totalPages) setPage(p => p + 1)
    }

    // Dynamic Title Logic
    const getRecentTitle = () => {
        if (ticker) return locale === 'ko' ? `${ticker} 관련 소식` : `Related to ${ticker}`
        if (postType === 'news') return locale === 'ko' ? '최근 뉴스' : 'Recent News'
        if (postType === 'brief_news') return locale === 'ko' ? '최근 단신' : 'Recent Briefs'
        if (postType === 'blog') return locale === 'ko' ? '최근 포스트' : 'Recent Posts'
        return locale === 'ko' ? '최근 글' : 'Recent Posts'
    }

    // 4. Recent Comments (Placeholder)
    const recentComments: any[] = []

    return (
        <aside ref={sidebarRef} className="w-full">
            {/* 1. Search Widget */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
                <form onSubmit={handleSearch} className="relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={locale === 'ko' ? '검색어를 입력하세요...' : 'Search...'}
                        className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    <button
                        type="submit"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                </form>
            </div>

            {/* Ad Unit - Vertical */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6 flex justify-center">
                <AdUnit 
                    slot="6390982941" 
                    format="auto" 
                    responsive={true}
                    style={{ minHeight: '300px', width: '100%', display: 'block' }}
                    label="Advertisement"
                />
            </div>

            {/* 3. Recent Posts Widget */}
            <SidebarWidget
                title={getRecentTitle()}
                actions={
                    <>
                        <button
                            onClick={handlePrevPage}
                            disabled={page === 1}
                            className={`p-1 rounded-md transition-colors ${page === 1 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={handleNextPage}
                            disabled={page >= totalPages} // Show next if likely more pages
                            className={`p-1 rounded-md transition-colors ${page >= totalPages ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed hidden' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                }
            >
                <div className="space-y-4 min-h-[300px]">
                    {isLoading ? (
                        <div className="animate-pulse space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex gap-3">
                                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        displayPosts.length > 0 ? (
                            displayPosts.map((post: any) => (
                                <div key={post.id} className="flex gap-3 group">
                                    {/* Thumbnail (Optional) */}
                                    {post.cover_image && (
                                        <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700">
                                            <img
                                                src={post.cover_image}
                                                alt={parseLocalized(post.title, locale)}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                    )}
                                    <div className="flex flex-col justify-center">
                                        <Link
                                            href={post.post_type === 'news' ? `/${locale}/news/${post.slug}` :
                                                post.post_type === 'brief_news' ? `/${locale}/news/briefnews/${post.slug}` :
                                                    `/${locale}/blog/${post.slug}`}
                                            className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2 leading-snug transition-colors"
                                        >
                                            {parseLocalized(post.title, locale)}
                                        </Link>
                                        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            {new Date(post.created_at).toLocaleDateString(locale)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No posts found.</p>
                        )
                    )}
                </div>
            </SidebarWidget>

            {/* 4. Recent Comments Widget */}
            {recentComments.length > 0 && (
                <SidebarWidget title={locale === 'ko' ? '최근 댓글' : 'Recent Comments'}>
                    <div className="space-y-3">
                        {/* Map comments here */}
                    </div>
                </SidebarWidget>
            )}
            {/* Global Ads Widget (Stacked) */}
            <div className="mt-8">
                <SidebarAdsWidget />
            </div>
        </aside>
    )
}

export default PostSidebar
