'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import { parseLocalized } from '@/utils/parseLocalized'
import Pagination from '@/components/tables/Pagination'
import { NewsCard } from '@/components/widgets/NewsCard'
import { BriefNewsCard } from '@/components/widgets/BriefNewsCard'
import { DefaultBlogListCard } from '@/components/widgets/DefaultBlogListCard'

interface Post {
    id: number
    title: string | { ko?: string; en?: string }
    slug: string
    content?: string
    content_ko?: string
    description?: string | { ko?: string; en?: string }
    status: string
    created_at: string
    updated_at: string
    author?: {
        id: number
        username: string
    }
    category?: {
        id: number
        name: string
    }
    tags?: Array<{
        id: number
        name: string
    }>
    cover_image?: string
    post_type?: string
    post_info?: any // JSON or string
}

interface PostListProps {
    locale: string;
    postType?: string;
    title?: string;
    filterStatus?: string;
    cardType?: 'news' | 'default' | 'brief';
    itemsPerPage?: number;
}

const PostList: React.FC<PostListProps> = ({
    locale,
    postType = 'post',
    title: pageTitle,
    filterStatus,
    cardType = 'news',
    itemsPerPage: initialItemsPerPage = 9
}) => {
    const router = useRouter()
    const pathname = usePathname()
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const effectiveStatus = filterStatus === undefined ? 'published' : filterStatus;

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage)
    const [totalItems, setTotalItems] = useState(0)

    const fetchPosts = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data: any = await apiClient.getPosts({
                page: currentPage,
                page_size: itemsPerPage,
                status: effectiveStatus || undefined,
                post_type: postType
            })

            if (data && data.posts) {
                setPosts(data.posts)
                setTotalItems(data.total || data.posts.length)
            } else {
                setPosts([])
                setTotalItems(0)
            }
        } catch (err: any) {
            console.error('Failed to fetch posts:', err)
            setError('Failed to load blog posts.')
        } finally {
            setLoading(false)
        }
    }, [currentPage, itemsPerPage, effectiveStatus, postType])

    useEffect(() => {
        fetchPosts()
    }, [fetchPosts])

    if (loading) {
        return <div className="p-8 text-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    {pageTitle || (postType === 'news' ? 'Latest News' : 'Blog Posts')}
                </h1>
            </div>

            {posts.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">No posts found.</p>
                </div>
            ) : (
                <div className={`grid grid-cols-1 ${cardType === 'brief' ? 'md:grid-cols-2 lg:grid-cols-2 gap-4' : 'md:grid-cols-3 gap-8'}`}>
                    {posts.map((post) => {
                        const title = parseLocalized(post.title as any, locale)
                        const desc = parseLocalized(post.description as any, locale)

                        // Construct path - default to current path + slug, but cleanup trailing slash
                        const currentPath = pathname ? pathname.replace(/\/$/, '') : '';
                        const href = `${currentPath}/${post.slug}`;

                        if (cardType === 'brief') {
                            let info: any = {};
                            try {
                                if (typeof post.post_info === 'string') {
                                    info = JSON.parse(post.post_info);
                                } else if (typeof post.post_info === 'object') {
                                    info = post.post_info || {};
                                }
                            } catch (e) {
                                console.error('Error parsing post_info', e);
                            }

                            const sourceName = info.source || post.author?.username || 'News';
                            const authorName = info.author || post.author?.username;

                            return (
                                <BriefNewsCard
                                    key={post.id}
                                    title={title}
                                    summary={desc || ""}
                                    source={sourceName}
                                    author={authorName}
                                    slug={post.slug}
                                    publishedAt={post.created_at}
                                />
                            )
                        }

                        if (cardType === 'default') {
                            return (
                                <DefaultBlogListCard
                                    key={post.id}
                                    id={post.id}
                                    title={title}
                                    summary={desc || ""}
                                    author={post.author?.username || 'Admin'}
                                    date={new Date(post.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US')}
                                    image={post.cover_image}
                                    category={post.category?.name || (postType === 'news' ? 'News' : 'Blog')}
                                    href={href}
                                />
                            )
                        }

                        return (
                            <NewsCard
                                key={post.id}
                                title={title}
                                summary={desc || ""}
                                source={post.post_type === 'news' ? 'News' : 'FireMarkets'}
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
            )}

            {totalItems > itemsPerPage && (
                <div className="flex justify-center mt-12">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(totalItems / itemsPerPage)}
                        onPageChange={(page) => setCurrentPage(page)}
                    />
                </div>
            )}
        </div>
    )
}

export default PostList
