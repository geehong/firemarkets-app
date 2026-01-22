import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { apiClient } from '@/lib/api'
import AssetHeader from '@/components/assets/AssetHeader'
import AssetDetailedView from '@/components/template/AssetDetailedView'

// Fetch asset data using V2 API
async function getAssetData(slug: string) {
    try {
        const v2Overview = await apiClient.v2GetOverview(slug)
        if (!v2Overview || !v2Overview.asset_id) {
            return null
        }
        
        // Return merged data from v2 API
        return {
            ...v2Overview,
            type_name: v2Overview.asset_type,
            name: v2Overview.name || slug,
            ticker: v2Overview.ticker || slug,
            // Spread numeric_data if exists
            ...(v2Overview.numeric_data || {}),
        }
    } catch (error) {
        console.error('Failed to fetch asset data:', error)
        return null
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params
    const asset = await getAssetData(slug)

    if (!asset) {
        return {
            title: 'Asset Not Found | FireMarkets',
            description: 'The requested asset could not be found.'
        }
    }

    const name = asset.name || slug
    const ticker = asset.ticker || slug

    return {
        title: `${name} (${ticker}) - Price, Data | FireMarkets`,
        description: asset.description || `Live price and analysis for ${name} (${ticker}).`,
    }
}

export default async function AssetPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
    const { slug, locale } = await params
    const asset = await getAssetData(slug)

    // Check if asset is excluded
    if (asset && (asset.ticker === 'USDC' || asset.ticker === 'USDT')) {
        notFound()
    }

    if (!asset) {
        notFound()
    }

    return (
        <main className="w-full py-8">
            <AssetDetailedView asset={asset} locale={locale} />
        </main>
    )
}
