
import { apiClient } from '@/lib/api'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import DashBoardHomeMainView from '@/components/dashboard/DashBoardHomeMainView';

interface PageProps {
    params: Promise<{
        locale: string
    }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    try {
        // Fetch home post specifically
        const post = await apiClient.getHomePost()

        if (!post || post.post_type !== 'page') {
            return {
                title: 'FireMarkets',
            }
        }

        const resolvedParams = await params;
        const locale = resolvedParams.locale;

        // @ts-ignore
        let title = typeof post.title === 'string' ? post.title : (post.title?.[locale] || post.title?.en || 'FireMarkets')
        // @ts-ignore
        let description = typeof post.description === 'string' ? post.description : (post.description?.[locale] || post.description?.en || '')

        // Fallback for short descriptions
        if (description.length < 50) {
            description = "FireMarkets provides real-time financial data, on-chain analytics, and advanced charting for crypto and traditional markets. Your gateway to smarter trading decisions.";
        }

        return {
            title: `${title} - Realtime Crypto & Financial Data Platform`,
            description: description,
            openGraph: {
                title: `${title} - FireMarkets`,
                description: description,
                siteName: 'FireMarkets',
                type: 'website',
            }
        }
    } catch (error) {
        return {
            title: 'FireMarkets - Realtime Financial Data',
            description: 'FireMarkets provides professional-grade financial data, real-time charts, and on-chain analytics for crypto and traditional assets.',
        }
    }
}

export default async function HomePage({ params }: PageProps) {
    let post;

    try {
        // Use the new getHomePost method
        post = await apiClient.getHomePost()
        // console.log('[DEBUG] HomePage post content:', JSON.stringify(post, null, 2))
    } catch (error) {
        console.error('Failed to fetch home page:', error)
        // If getting home post fails, we might check if 'main-page' exists fallback logic, but backend handles fallback to 'home' slug.
        // If still fails, it means no home page configured.
        notFound()
    }

    if (!post) {
        notFound()
    }

    const resolvedParams = await params;
    const locale = resolvedParams.locale === 'en' ? 'en' : 'ko';

    // JSON-LD Structured Data
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'FireMarkets',
        alternateName: ['Fire Markets', 'FireMarkets Data'],
        url: 'https://firemarkets.net',
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://firemarkets.net/search?q={search_term_string}'
            },
            'query-input': 'required name=search_term_string'
        }
    }

    const orgJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'FireMarkets Disrupter',
        url: 'https://firemarkets.net',
        logo: 'https://firemarkets.net/images/logo/logo.svg',
        sameAs: [
            'https://facebook.com/firemarkets',
            'https://twitter.com/firemarkets',
            'https://instagram.com/firemarkets',
            'https://linkedin.com/company/firemarkets',
            'https://youtube.com/firemarkets'
        ]
    }

    let content = post.content
    if (locale === 'ko' && post.content_ko) {
        content = post.content_ko
    }

    // @ts-ignore
    const title = typeof post.title === 'string' ? post.title : (post.title?.[locale] || post.title?.en || '')

    return (
        <div className=" w-full">
            {/* JSON-LD Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
            />

            {/* Added H1 for SEO (Hidden visually but present) */}
            <h1 className="sr-only">
                {title || 'FireMarkets - Realtime Crypto & Financial Data Platform'}
            </h1>

            <DashBoardHomeMainView />
        </div>
    )
}
