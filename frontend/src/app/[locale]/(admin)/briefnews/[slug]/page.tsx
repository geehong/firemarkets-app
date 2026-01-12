import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { apiClient } from '@/lib/api'
import Link from 'next/link'

async function getBriefNewsData(slug: string) {
    try {
        const res: any = await apiClient.getPost(slug)
        return res
    } catch (error) {
        console.error('Failed to fetch brief news data:', error)
        return null
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
    const resolvedParams = await params
    const slug = resolvedParams.slug
    const locale = resolvedParams.locale || 'ko'
    const post = await getBriefNewsData(slug)

    if (!post) {
        return {
            title: 'Brief News Not Found | FireMarkets',
            description: 'The requested brief news could not be found.'
        }
    }

    const title = typeof post.title === 'string' ? post.title : (post.title?.[locale] || post.title?.en || post.title?.ko || slug)
    const desc = typeof post.description === 'string' ? post.description : (post.description?.[locale] || post.description?.en || post.description?.ko || '')

    return {
        title: `${title} | FireMarkets 단신`,
        description: desc,
    }
}

export default async function BriefNewsDetailPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
    const { slug, locale } = await params
    const post = await getBriefNewsData(slug)

    if (!post) {
        notFound()
    }

    // Parse post_info for source info
    let source = 'News'
    let originalUrl = ''
    let imageUrl = post.cover_image || ''

    try {
        if (typeof post.post_info === 'string') {
            const info = JSON.parse(post.post_info)
            source = info.source || source
            originalUrl = info.url || ''
            if (!imageUrl) imageUrl = info.image_url || ''
        } else if (typeof post.post_info === 'object' && post.post_info) {
            source = post.post_info.source || source
            originalUrl = post.post_info.url || ''
            if (!imageUrl) imageUrl = post.post_info.image_url || ''
        }
    } catch (e) { }

    const title = typeof post.title === 'string' ? post.title : (post.title?.[locale] || post.title?.en || post.title?.ko || slug)
    const description = typeof post.description === 'string' ? post.description : (post.description?.[locale] || post.description?.en || post.description?.ko || '')
    const content = locale === 'ko' ? (post.content_ko || post.content) : (post.content || post.content_ko)

    return (
        <main className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                {imageUrl && (
                    <div className="relative h-[300px] md:h-[400px] w-full">
                        <img
                            src={imageUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                )}
                <div className="p-6 md:p-8">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                            단신
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                            {new Date(post.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                        {source && source !== 'News' && (
                            <span className="text-gray-400 text-sm">
                                출처: {source}
                            </span>
                        )}
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        {title}
                    </h1>

                    {description && (
                        <p className="text-gray-600 dark:text-gray-300 text-lg mb-6 leading-relaxed">
                            {description}
                        </p>
                    )}

                    {content && (
                        <div
                            className="prose prose-lg dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    )}

                    {originalUrl && (
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <a
                                href={originalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                원문 보기
                            </a>
                        </div>
                    )}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex flex-wrap gap-2">
                                {post.tags.map((tag: any) => (
                                    <Link
                                        key={tag.id}
                                        href={`/tag/${tag.slug}`}
                                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        #{tag.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </article>

            {/* Back link */}
            <div className="mt-6 text-center">
                <Link href={`/${locale}/news/briefnews`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                    ← 뉴스 목록으로 돌아가기
                </Link>
            </div>
        </main>
    )
}
