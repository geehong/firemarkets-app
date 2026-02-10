'use client'

import React, { useState } from 'react'
import ComponentCard from '@/components/common/ComponentCard'
import Link from 'next/link'
import AdminDataInspector from '@/components/common/AdminDataInspector'
import { useAuth } from '@/hooks/auth/useAuthNew'
import Badge from '@/components/ui/badge/Badge'
import PostContent from '../post/PostContent'
import { parseLocalized } from '@/utils/parseLocalized'
import BaseTemplateView from './BaseTemplateView'
import PostComments from '@/components/post/PostComments'
import PostSidebar from '@/components/post/PostSidebar'
import OnChainGuide from '@/components/post/OnChainGuide'

import FireMarketsAnalysis from '../post/FireMarketsAnalysis'
import Disclaimer from '@/components/common/Disclaimer'

interface PostDetailedViewProps {
    post: any
    locale: string
}

const PostHeader: React.FC<{ post: any; locale: string }> = ({ post, locale }) => {
    const title = parseLocalized(post.title, locale)
    const categoryName = post.category ? post.category.name : 'Uncategorized'
    const status = post.status

    return (
        <ComponentCard
            title={
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="font-bold text-lg">{title}</span>
                    </div>
                </div>
            }
        >
            {post.cover_image && (
                <div className="mb-6 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                    <img
                        src={post.cover_image}
                        alt={post.cover_image_alt || title}
                        className="w-full h-auto max-h-[500px] object-cover"
                    />
                </div>
            )}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                    <p className="text-gray-500 dark:text-gray-400">
                        {categoryName} • {new Date(post.created_at).toLocaleDateString(locale)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge color={status === 'published' ? 'success' : 'warning'}>
                        {status}
                    </Badge>
                </div>
            </div>
        </ComponentCard>
    )
}

const PostInfoCard: React.FC<{ post: any; locale: string }> = ({ post, locale }) => {
    const postInfo = typeof post.post_info === 'string' ? JSON.parse(post.post_info) : (post.post_info || {});
    const author = postInfo.author || post.author?.username || 'Unknown';
    const source = postInfo.source || 'Unknown';
    const tickers = postInfo.tickers || [];
    const externalId = postInfo.external_id || '-';

    return (
        <ComponentCard title="Post Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Metadata</h4>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Author:</span>
                            <span className="font-medium">{author}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Source:</span>
                            <span className="font-medium">{source}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Slug:</span>
                            <span className="font-medium truncate max-w-[200px]" title={post.slug}>{post.slug}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Category:</span>
                            <span className="font-medium">{post.category?.name || '-'}</span>
                        </div>
                        {/* 원문 링크 추가 (요청 사항) */}
                        {postInfo.url && (
                            <div className="mt-4">
                                <a
                                    href={postInfo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline text-sm"
                                >
                                    View Original Article &rarr;
                                </a>
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Tags / Tickers</h4>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
                        {tickers.length > 0 ? (
                            tickers.map((t: string, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded text-xs font-semibold">
                                    {t}
                                </span>
                            ))
                        ) : null}

                        {post.tags && post.tags.length > 0 ? (
                            post.tags.map((tag: any) => (
                                <span key={tag.id} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{tag.name}</span>
                            ))
                        ) : null}

                        {tickers.length === 0 && (!post.tags || post.tags.length === 0) && (
                            <span className="text-gray-500">-</span>
                        )}
                    </div>
                </div>
            </div>
        </ComponentCard>
    )
}

const PostDetailedView: React.FC<PostDetailedViewProps> = ({ post, locale }) => {
    const { isAdmin } = useAuth()

    // Data Parsing
    const title = parseLocalized(post.title, locale)
    const categoryName = post.category ? post.category.name : 'Uncategorized'
    const status = post.status
    const postInfo = typeof post.post_info === 'string' ? JSON.parse(post.post_info) : (post.post_info || {})
    const authorName = postInfo.author || post.author?.username || 'Unknown'

    // Content Parsing
    let content = '';
    if (locale === 'ko' && post.content_ko) {
        content = post.content_ko;
    } else if (typeof post.content === 'object') {
        content = parseLocalized(post.content, locale);
    } else {
        content = post.content || post.content_en || '';
    }

    // Prepare Tabs
    const tabs = [
        {
            id: 'article',
            label: 'Article',
            content: (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 overflow-hidden">
                        <PostContent content={content} />
                        
                        {post.post_type === 'onchain' && (
                            <OnChainGuide locale={locale} />
                        )}
                    </div>
                    
                    {/* FireMarkets Analysis Section for News, Blog, and Post */}
                    {(post.post_type === 'news' || post.post_type === 'blog' || post.post_type === 'post') && (
                        <FireMarketsAnalysis postInfo={postInfo} locale={locale} />
                    )}

                    {/* Author Profile Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center overflow-hidden">
                                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">GH</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Geehong</h3>
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium font-outfit uppercase tracking-wider">FireMarkets Chief Analyst</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Specializing in on-chain data analysis and global market trends. Providing deep insights into the digital asset ecosystem.
                                </p>
                            </div>
                        </div>
                    </div>

                    <PostInfoCard post={post} locale={locale} />
                    
                    {/* Disclaimer Component */}
                    <Disclaimer />

                    {/* Comments Section */}
                    <PostComments postId={post.id} locale={locale} />
                </div>
            )
        },
        ...(isAdmin ? [{
            id: 'details',
            label: 'Details',
            content: (
                <div>
                    <div className="mb-6">
                        <Link
                            href={`/${locale}/admin/post/edit/${post.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            {post.post_type === 'news' ? 'Edit News' : (post.post_type === 'onchain' ? 'Edit OnChain' : 'Edit Blog')}
                        </Link>
                    </div>
                    <AdminDataInspector
                        data={post}
                        isLoading={false}
                        error={null}
                        title="Raw Blog Data"
                        locale={locale}
                    />
                </div>
            )
        }] : []),
    ]

    return (
        <BaseTemplateView
            locale={locale}
            seo={{
                title: title,
                // Use excerpt or description for meta description logic (displayed as lead)
                description: parseLocalized(post.description, locale) || parseLocalized(post.excerpt, locale),
                keywords: post.tags?.map((t: any) => t.name)
            }}
            header={{
                title: title,
                category: { name: categoryName },
                status: {
                    label: status,
                    color: status === 'published' ? 'success' : 'warning'
                },
                publishedAt: post.published_at,
                author: { name: authorName },
                coverImage: post.cover_image,
                // breadcrumbs: [
                //     { label: 'Admin', href: `/${locale}/admin` },
                //     { label: 'News', href: `/${locale}/admin/news` },
                //     { label: title, href: '#' }
                // ]
            }}
            tabs={tabs}
            sidebar={<PostSidebar locale={locale} postType={post.post_type} />}
        />
    )
}

export default PostDetailedView
