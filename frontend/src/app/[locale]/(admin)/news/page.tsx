import PostList from '@/components/post/PostList'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'News | FireMarkets',
    description: 'Latest financial news and AI insights.',
}

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    return (
        <main className="container mx-auto px-4 py-8 space-y-12">
            <section>
                <PostList locale={locale} postType="news" title="Financial News & Insights" filterStatus="published" />
            </section>

            <section className="border-t border-gray-200 dark:border-gray-800 pt-8">
                <PostList locale={locale} postType="brief_news" title="Brief News" filterStatus="published" cardType="brief" itemsPerPage={6} />
            </section>
        </main>
    )
}
