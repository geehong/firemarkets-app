'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { parseLocalized } from '@/utils/parseLocalized'
import Link from 'next/link'
import { usePosts } from '@/hooks/data/usePosts'
import { NewsCard } from '@/components/widgets/NewsCard'
import { DefaultBlogListCard } from '@/components/widgets/DefaultBlogListCard'
import { BriefNewsListTable } from '@/components/tables/BriefNewsListTable'
import { getFallbackImage } from '@/utils/fallbackImage'
import Pagination from '@/components/tables/Pagination'

type PostType = 'all' | 'post' | 'news' | 'brief_news'

export default function TagPage() {
    const params = useParams()
    const slug = params?.slug as string
    const locale = (params?.locale as string) || 'ko'

    const [tag, setTag] = useState<any>(null)
    const [activeType, setActiveType] = useState<PostType>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 12

    // Virtual tag state
    const [isVirtual, setIsVirtual] = useState(false);

    // Fetch tag info
    useEffect(() => {
        const fetchTag = async () => {
            try {
                // Try to find exact tag match
                const tags = await apiClient.request(`/posts/tags/search?q=${encodeURIComponent(slug)}&limit=10`)
                if (tags && Array.isArray(tags)) {
                    const found = tags.find((t: any) => t.slug === slug)
                    if (found) {
                        setTag(found)
                        setIsVirtual(false)
                        return
                    }
                }

                // If not found, treat as virtual tag (search query)
                setTag({ name: decodeURIComponent(slug), slug: slug, isVirtual: true })
                setIsVirtual(true)
            } catch (error) {
                console.error('Failed to fetch tag:', error)
                // Fallback to virtual tag on error
                setTag({ name: decodeURIComponent(slug), slug: slug, isVirtual: true })
                setIsVirtual(true)
            }
        }
        if (slug) fetchTag()
    }, [slug])

    // Common props for usePosts
    const commonParams = {
        status: 'published',
        // If virtual, use 'search' param. If real tag, use 'tag' param.
        ...(isVirtual ? { search: decodeURIComponent(slug) } : { tag: slug }),
        sort_by: 'created_at',
        order: 'desc' as const
    }

    // Fetch posts - for individual tabs
    const { data, isLoading } = usePosts({
        ...commonParams,
        page: currentPage,
        page_size: pageSize,
        post_type: activeType !== 'all' ? activeType : undefined,
    })

    // Fetch each type separately for "all" tab
    const { data: blogData, isLoading: blogLoading } = usePosts({
        ...commonParams,
        page: 1,
        page_size: 6,
        post_type: 'post',
    })

    const { data: newsData, isLoading: newsLoading } = usePosts({
        ...commonParams,
        page: 1,
        page_size: 4,
        post_type: 'news',
    })

    const { data: briefData, isLoading: briefLoading } = usePosts({
        ...commonParams,
        page: 1,
        page_size: 10,
        post_type: 'brief_news',
    })

    const posts = data?.posts || []
    const total = data?.total || 0
    const totalPages = Math.ceil(total / pageSize)

    // Separate data for "all" tab
    const blogPosts = blogData?.posts || []
    const newsPosts = newsData?.posts || []
    const briefPosts = briefData?.posts || []
    const allTabLoading = blogLoading || newsLoading || briefLoading

    // Reset page when type changes
    useEffect(() => {
        setCurrentPage(1)
    }, [activeType, slug])

    // Calculate counts
    const blogCount = blogData?.total || 0
    const newsCount = newsData?.total || 0
    const briefCount = briefData?.total || 0
    const allCount = blogCount + newsCount + briefCount

    const tabs: { key: PostType; label: string }[] = [
        { key: 'all', label: `전체 (${allCount})` },
        { key: 'post', label: `블로그 (${blogCount})` },
        { key: 'news', label: `뉴스 (${newsCount})` },
        { key: 'brief_news', label: `단신 (${briefCount})` },
    ]

    if (!tag && !slug) { // Only show not found if no slug provided
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Tag Not Found</h1>
                <Link href="/blog" className="text-blue-600 hover:underline">
                    Browse all posts
                </Link>
            </div>
        )
    }

    // === RENDER: ALL TAB (like Dashboard) ===
    const renderAllTab = () => {
        // Use separately fetched data for each section

        return (
            <div className="space-y-8">
                {/* Blog Section */}
                {blogPosts.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-5 border border-slate-100 dark:border-gray-700">
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="text-slate-800 dark:text-white font-semibold flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-gradient-to-b from-green-500 to-teal-500 rounded-full"></span>
                                블로그 ({blogPosts.length})
                            </h3>
                            <button onClick={() => setActiveType('post')} className="text-sm text-teal-500 hover:text-teal-600 font-medium">
                                View All
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {blogPosts.slice(0, 6).map((post: any) => {
                                const title = parseLocalized(post.title, locale)
                                const desc = parseLocalized(post.description, locale)
                                return (
                                    <DefaultBlogListCard
                                        key={post.id}
                                        id={post.id}
                                        title={title}
                                        summary={desc || ''}
                                        author={post.author?.username || 'Admin'}
                                        date={new Date(post.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US')}
                                        image={post.cover_image}
                                        category={post.category?.name || 'Blog'}
                                        href={`/blog/${post.slug}`}
                                    />
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* News Section */}
                {newsPosts.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-5 border border-slate-100 dark:border-gray-700">
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="text-slate-800 dark:text-white font-semibold flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-violet-500 rounded-full"></span>
                                뉴스 ({newsPosts.length})
                            </h3>
                            <button onClick={() => setActiveType('news')} className="text-sm text-violet-500 hover:text-violet-600 font-medium">
                                View All
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {newsPosts.slice(0, 4).map((post: any) => {
                                const postTitle = parseLocalized(post.title, locale)
                                const imageUrl = post.cover_image || getFallbackImage({ ...post, category: post.category || undefined })
                                return (
                                    <Link key={post.id} href={`/news/${post.slug}`} className="group flex flex-col h-full hover:-translate-y-1 transition-transform duration-200">
                                        <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-700">
                                            <img src={imageUrl!} alt={postTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                                                News
                                            </div>
                                        </div>
                                        <h4 className="text-slate-800 dark:text-white font-medium line-clamp-2 mb-2 group-hover:text-violet-500 transition-colors">{postTitle}</h4>
                                        <div className="flex items-center justify-between mt-auto text-xs text-slate-500 dark:text-gray-400">
                                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Brief News Section */}
                {briefPosts.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-5 border border-slate-100 dark:border-gray-700">
                        <div className="flex justify-between items-end mb-4">
                            <h3 className="text-slate-800 dark:text-white font-semibold flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></span>
                                단신 ({briefPosts.length})
                            </h3>
                            <button onClick={() => setActiveType('brief_news')} className="text-sm text-orange-500 hover:text-orange-600 font-medium">
                                View All
                            </button>
                        </div>
                        <BriefNewsListTable data={briefPosts.slice(0, 10)} />
                    </div>
                )}

                {blogPosts.length === 0 && newsPosts.length === 0 && briefPosts.length === 0 && !allTabLoading && (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">No posts found for this tag.</p>
                    </div>
                )}
            </div>
        )
    }

    // === RENDER: BLOG/NEWS TAB (with pagination) ===
    const renderListTab = () => {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post: any) => {
                        const title = parseLocalized(post.title, locale)
                        const desc = parseLocalized(post.description, locale)
                        const href = activeType === 'news' ? `/news/${post.slug}` : `/blog/${post.slug}`

                        if (activeType === 'post') {
                            return (
                                <DefaultBlogListCard
                                    key={post.id}
                                    id={post.id}
                                    title={title}
                                    summary={desc || ''}
                                    author={post.author?.username || 'Admin'}
                                    date={new Date(post.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US')}
                                    image={post.cover_image}
                                    category={post.category?.name || 'Blog'}
                                    href={href}
                                />
                            )
                        }

                        return (
                            <NewsCard
                                key={post.id}
                                title={title}
                                summary={desc || ''}
                                source="News"
                                time={new Date(post.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US')}
                                image={post.cover_image}
                                slug={post.slug}
                                author={post.author?.username || 'Admin'}
                                category={post.category?.name}
                                href={href}
                            />
                        )
                    })}
                </div>

                {posts.length === 0 && !isLoading && (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">No posts found.</p>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex justify-center mt-8">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>
        )
    }

    // === RENDER: BRIEF NEWS TAB (table style) ===
    const renderBriefTab = () => {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-5 border border-slate-100 dark:border-gray-700">
                <BriefNewsListTable data={posts} />

                {posts.length === 0 && !isLoading && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        No brief news found.
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex justify-center mt-6">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="w-full p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    #{tag?.name || slug}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    {total} posts
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveType(tab.key)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeType === tab.key
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {(activeType === 'all' ? allTabLoading : isLoading) ? (
                <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <>
                    {activeType === 'all' && renderAllTab()}
                    {(activeType === 'post' || activeType === 'news') && renderListTab()}
                    {activeType === 'brief_news' && renderBriefTab()}
                </>
            )}
        </div>
    )
}
