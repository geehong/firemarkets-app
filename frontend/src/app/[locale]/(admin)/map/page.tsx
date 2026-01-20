import PerformanceTreeMapWrapper from "@/components/charts/treemap/PerformanceTreeMapWrapper";
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Crypto Market Map | FireMarkets',
    description: 'Visualize the entire cryptocurrency market performance with our interactive heatmap. Track trends, gainers, and losers at a glance.',
}

export default function MapPage() {
    return (
        <div className="p-4 md:p-6 2xl:p-10">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-title-md2 font-semibold text-black dark:text-white">
                    Market Map
                </h2>
            </div>

            <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
                <PerformanceTreeMapWrapper height={800} />
                <div className="mt-6 mb-4 text-sm text-gray-500 dark:text-gray-400">
                    <h3 className="font-semibold mb-2">About Market Map</h3>
                    <p>
                        This interactive heatmap visualizes the performance of top cryptocurrencies by market capitalization. 
                        The size of each block represents the market share, while the color indicates the price change over the selected period. 
                        Green indicates positive performance, while red indicates negative performance. Use this tool to quickly identify market trends and opportunities.
                    </p>
                </div>
            </div>
        </div>
    );
}
