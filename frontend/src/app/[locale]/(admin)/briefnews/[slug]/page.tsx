import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { apiClient } from '@/lib/api'
import BriefNewsDetailView from '@/components/template/BriefNewsDetailView'

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
        <BriefNewsDetailView
            post={post}
            locale={locale}
            title={title}
            description={description}
            content={content}
            imageUrl={imageUrl}
            source={source}
            originalUrl={originalUrl}
        />
    )
}
