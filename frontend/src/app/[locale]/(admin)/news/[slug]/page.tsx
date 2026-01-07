import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { apiClient } from '@/lib/api'
import PostDetailedView from '@/components/template/PostDetailedView'

async function getNewsData(slug: string) {
    try {
        const res: any = await apiClient.getPost(slug)
        // Ensure fetched item is actually a news type if strictness is required,
        // but generally getting by slug is enough.
        return res
    } catch (error) {
        console.error('Failed to fetch news data:', error)
        return null
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
    const resolvedParams = await params
    const slug = resolvedParams.slug
    const locale = resolvedParams.locale || 'ko'
    const news = await getNewsData(slug)

    if (!news) {
        return {
            title: 'News Not Found | FireMarkets',
            description: 'The requested news could not be found.'
        }
    }

    const title = typeof news.title === 'string' ? news.title : (news.title?.[locale] || news.title?.en || news.title?.ko || slug)
    const desc = typeof news.description === 'string' ? news.description : (news.description?.[locale] || news.description?.en || news.description?.ko || '')

    return {
        title: `${title} | FireMarkets News`,
        description: desc,
    }
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
    const { slug, locale } = await params
    const news = await getNewsData(slug)

    if (!news) {
        notFound()
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <PostDetailedView post={news} locale={locale} />
        </main>
    )
}
