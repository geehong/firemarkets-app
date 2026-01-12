import PostList from '@/components/post/PostList'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Brief News | FireMarkets',
    description: 'Latest quick financial news updates.',
}

export default async function BriefNewsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    return (
        <main className="container mx-auto px-4 py-8">
            <section>
                <PostList locale={locale} postType="brief_news" title="Brief News" filterStatus="published" cardType="brief" itemsPerPage={12} showSearch={true} />
            </section>
        </main>
    )
}
