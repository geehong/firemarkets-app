import PostList from '@/components/post/PostList'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Blog | FireMarkets Admin',
    description: 'Manage and view blog posts.',
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    return (
        <main className="container mx-auto px-4 py-8">
            <PostList locale={locale} cardType="default" />
        </main>
    )
}
