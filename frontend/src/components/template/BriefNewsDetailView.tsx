'use client'

import Link from 'next/link'
import TableOfContents from './block/TableOfContents'

interface BriefNewsDetailViewProps {
    post: any;
    locale: string;
    title: string;
    description: string;
    content: string;
    imageUrl: string;
    source: string;
    originalUrl: string;
}

export default function BriefNewsDetailView({
    post,
    locale,
    title,
    description,
    content,
    imageUrl,
    source,
    originalUrl
}: BriefNewsDetailViewProps) {
    return (
        <main className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                {imageUrl && (
                    <div className="relative h-[300px] md:h-[450px] w-full">
                        <img
                            src={imageUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                    </div>
                )}
                <div className="p-6 md:p-10">
                    <div className="mb-6 flex flex-wrap items-center gap-3">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-500 text-white">
                            {locale === 'ko' ? '단신' : 'Brief'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                            {new Date(post.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                        {source && source !== 'News' && (
                            <span className="text-gray-400 dark:text-gray-500 text-sm flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                {locale === 'ko' ? '출처' : 'Source'}: {source}
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                        {title}
                    </h1>

                    {content && (
                        <div className="flex flex-col">
                            <TableOfContents contentSelector="#brief-news-content" />
                            <div
                                id="brief-news-content"
                                className="prose prose-lg dark:prose-invert max-w-none 
                                prose-headings:text-gray-900 dark:prose-headings:text-white
                                prose-p:text-gray-700 dark:prose-p:text-gray-300
                                prose-strong:text-gray-900 dark:prose-strong:text-white
                                prose-a:text-orange-500 hover:prose-a:text-orange-600
                                "
                                dangerouslySetInnerHTML={{ __html: content }}
                            />
                        </div>
                    )}

                    {originalUrl && (
                        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-700">
                            <a
                                href={originalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-sm"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                {locale === 'ko' ? '원문 확인하기' : 'View Original Source'}
                            </a>
                        </div>
                    )}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex flex-wrap gap-2">
                                {post.tags.map((tag: any) => (
                                    <Link
                                        key={tag.id}
                                        href={`/tag/${tag.slug}`}
                                        className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-full hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400 transition-all"
                                    >
                                        #{tag.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </article>

            {/* Navigation */}
            <div className="mt-10 flex justify-center">
                <Link
                    href={`/${locale}/news/briefnews`}
                    className="flex items-center gap-2 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400 font-medium transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {locale === 'ko' ? '뉴스 목록으로 돌아가기' : 'Back to News List'}
                </Link>
            </div>
        </main>
    )
}
