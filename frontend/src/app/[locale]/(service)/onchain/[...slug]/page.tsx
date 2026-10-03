import OnChainMainView from '@/components/onchain/OnChainMainView'
import { Metadata } from 'next'
import { getCanonicalUrl, getLanguageAlternates } from '@/lib/seo'

interface PageProps {
    params: Promise<{
        locale: string;
        slug: string[];
    }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale, slug } = await params;
    const metricSlug = Array.isArray(slug) ? slug.join('/') : (slug || '');
    const formattedTitle = metricSlug
        .split('/')
        .pop()
        ?.replace(/_/g, ' ')
        .replace(/-/g, ' ')
        .toUpperCase() || 'Analytics';
    
    const path = `/onchain/${metricSlug}`;
    const alternates = {
        canonical: getCanonicalUrl(locale, path),
        languages: getLanguageAlternates(path),
    };

    return {
        title: `${formattedTitle} - Bitcoin & Crypto On-Chain Chart | FireMarkets`,
        description: `Explore live ${formattedTitle} on-chain chart, real-time market metrics, historical trends, and crypto analytics on FireMarkets.`,
        alternates,
        openGraph: {
            title: `${formattedTitle} - FireMarkets On-Chain Analytics`,
            description: `Live ${formattedTitle} chart and crypto market analysis on FireMarkets.`,
            siteName: 'FireMarkets',
            type: 'website',
        },
    };
}

export default async function OnChainPage({ params }: PageProps) {
    const { locale, slug } = await params;

    return (
        <div className="p-6">
            <OnChainMainView locale={locale} />
        </div>
    );
}

