import AssetsMainView from '@/components/assets/AssetsMainView'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Financial Assets | FireMarkets',
    description: 'Explore real-time data for Stocks, Crypto, ETFs, and Commodities. Use our comprehensive screener to find the best investment opportunities.',
}

export default async function AssetsPage(
    props: {
        params: Promise<{ locale: string }>
    }
) {
    const params = await props.params;

    const {
        locale
    } = params;

    return (
        <div className="space-y-6">
            <AssetsMainView locale={locale} />
            
            {/* SEO Content for AdSense */}
            <div className="w-full px-4 pb-8">
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100">Global Financial Assets Market</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Access real-time pricing, historical data, and technical analysis for thousands of global financial assets. 
                        Whether you are tracking the S&P 500 stocks, analyzing Bitcoin&apos;s on-chain metrics, or monitoring commodity futures, 
                        FireMarkets provides the data you need. Filter assets by sector, performance, and volume to discover market movers.
                    </p>
                 </div>
            </div>
        </div>
    )
}
