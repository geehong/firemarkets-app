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
                <div className="flex justify-between items-end mb-6">
                    <h2 className="text-2xl font-bold">Brief News</h2>
                    <a href={`/${locale}/news/briefnews`} className="text-blue-600 hover:underline text-sm font-medium">
                        View All Brief News →
                    </a>
                </div>
                <PostList locale={locale} postType="brief_news" showTitle={false} showPagination={false} filterStatus="published" cardType="brief" itemsPerPage={6} />
            </section>
        </main>
    )
}
