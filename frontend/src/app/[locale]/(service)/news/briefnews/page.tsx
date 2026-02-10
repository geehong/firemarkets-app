import PostList from '@/components/post/PostList'
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    return {
        title: locale === 'ko' ? '마켓 시그널 (AI Briefs) | FireMarkets' : 'Market Signals (AI Briefs) | FireMarkets',
        description: locale === 'ko' ? '실시간 AI 분석 시장 신호 및 단신 업데이트' : 'Real-time AI-generated market signals and brief news updates.',
    }
}

export default async function BriefNewsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    return (
        <main className="w-full py-8 space-y-12">
            <section>
                <div className="flex flex-col mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent mb-2">
                        {locale === 'ko' ? "마켓 시그널 (AI Briefs)" : "Market Signals (AI Briefs)"}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        {locale === 'ko' 
                            ? "AI가 실시간으로 분석한 주요 시장 뉴스와 시그널을 확인하세요." 
                            : "Check out real-time market news and signals analyzed by AI."}
                    </p>
                </div>
                <PostList 
                    locale={locale} 
                    postType="brief_news" 
                    showTitle={false} 
                    showPagination={true} 
                    filterStatus="published" 
                    cardType="brief" 
                    itemsPerPage={12} 
                    showSearch={true}
                />
            </section>
        </main>
    )
}
