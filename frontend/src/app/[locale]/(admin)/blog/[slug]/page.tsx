import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { apiClient } from '@/lib/api'
import PostDetailedView from '@/components/template/PostDetailedView'

async function getBlogData(slug: string) {
    try {
        const res: any = await apiClient.getPost(slug)
        // Adjust based on actual API response structure. 
        // BlogList used getPosts which returned { posts: [] }.
        // getPost likely returns the post object directly or { post: ... }
        // Let's assume it returns the post object or we need to handle it.
        // Checking api.ts: return this.request(`/posts/slug/${slug}`);
        return res
    } catch (error) {
        console.error('Failed to fetch blog data:', error)
        return null
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
    const resolvedParams = await params
    const slug = resolvedParams.slug
    const locale = resolvedParams.locale || 'ko'
    const blog = await getBlogData(slug)

    if (!blog) {
        return {
            title: 'Post Not Found | FireMarkets',
            description: 'The requested post could not be found.'
        }
    }

    // Assuming title is object or string
    const title = typeof blog.title === 'string' ? blog.title : (blog.title?.[locale] || blog.title?.en || blog.title?.ko || slug)
    const desc = typeof blog.description === 'string' ? blog.description : (blog.description?.[locale] || blog.description?.en || blog.description?.ko || '')

    return {
        title: `${title} | FireMarkets Blog`,
        description: desc,
    }
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
    const { slug, locale } = await params
    const blog = await getBlogData(slug)

    if (!blog) {
        notFound()
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <PostDetailedView post={blog} locale={locale} />
        </main>
    )
}
