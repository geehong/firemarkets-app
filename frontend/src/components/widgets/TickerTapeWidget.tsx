"use client";

import React, { useMemo } from 'react';
import { useRealtimePrices } from '@/hooks/data/useSocket';
import { useTreemapLive } from '@/hooks/assets/useAssets';
import widgetData from './TickerTapeWidgetData.json';

// --- Types ---
// --- Types ---
type AssetType = 'crypto' | 'stock' | 'etf' | 'commodity';

interface TickerItemProps {
    ticker: string;
    type: AssetType;
    treemapAsset?: any; // Data from useTreemapLive
}

// --- Helper Components ---

const TickerItem: React.FC<TickerItemProps> = ({ ticker, type, treemapAsset }) => {
    // Unified Data Fetching Strategy:
    // 1. Base data (price, change) comes from `treemapAsset` (snapshot from API).
    // 2. Live data comes from `useRealtimePrices` (WebSocket).
    // 3. Fallback: If WS is loading/disconnected, show treemapAsset data.

    const { latestPrice, isConnected } = useRealtimePrices(ticker);

    // Determine values to display
    // Priority: Live WS Data > Treemap Snapshot Data > Default 0

    // Check if we have valid live data
    const hasLiveData = isConnected && latestPrice && latestPrice.price !== undefined;

    const currentPrice = hasLiveData
        ? latestPrice.price
        : (treemapAsset?.current_price || 0);

    const currentChange = hasLiveData && latestPrice.changePercent !== undefined
        ? latestPrice.changePercent
        : (treemapAsset?.price_change_percentage_24h || 0);

    // If we have absolutely no data (no treemap, no live), show loading or placeholders
    if (!treemapAsset && !hasLiveData) {
        return <span className="mx-4 text-gray-400 text-xs">{ticker} ...</span>;
    }

    const isPositive = (currentChange || 0) >= 0;

    return (
        <div className={`flex items-center ${widgetData.settings.gapClass} space-x-2 whitespace-nowrap`}>
            {/* Ticker Symbol */}
            <span className={`font-bold text-gray-800 dark:text-gray-200 ${widgetData.settings.fontSizeClass}`}>
                {ticker}
            </span>

            {/* Price */}
            <span className={`font-medium text-gray-800 dark:text-gray-200 ${widgetData.settings.fontSizeClass}`}>
                {/* Format: Crypto uses more decimals if needed, Stocks standard 2 */}
                ${currentPrice?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: type === 'crypto' && currentPrice < 1 ? 6 : 2
                })}
            </span>

            {/* Change % */}
            <span className={`${isPositive ? 'text-green-500' : 'text-red-500'} font-medium ${widgetData.settings.fontSizeClass}`}>
                {isPositive ? '▲' : '▼'} {Math.abs(currentChange).toFixed(2)}%
            </span>

            {/* Separator */}
            <span className="text-gray-300 dark:text-gray-600">|</span>
        </div>
    );
};


// --- Main Widget ---

export const TickerTapeWidget: React.FC = () => {
    // Configuration driven by JSON
    const { tickers, settings } = widgetData;

    // Fetch Base Data using useTreemapLive (same as SparklineTable)
    const { data: treemapData } = useTreemapLive({
        sort_by: "market_cap",
        sort_order: "desc",
    });

    // Flatten the grouped JSON structure
    const flatTickers = useMemo(() => {
        return Object.entries(tickers).flatMap(([type, symbols]) =>
            symbols.map(symbol => ({ symbol, type: type as AssetType }))
        );
    }, [tickers]);

    // Map treemap data to tickers for efficient lookup
    const treemapAssetMap = useMemo(() => {
        const map: Record<string, any> = {};
        const data = (treemapData as any)?.data;
        if (data) {
            data.forEach((asset: any) => {
                const key = asset.ticker || asset.asset_identifier; // consistent with SparklineTable
                if (key) map[key] = asset;
            });
        }
        return map;
    }, [treemapData]);

    return (
        <>
            <style>{`
                @keyframes marquee-ltr {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee-ltr {
                    animation: marquee-ltr ${settings.speedDurationSeconds}s linear infinite;
                    will-change: transform;
                }
            `}</style>

            {/* Main container: Full height with overflow control and center alignment */}
            <div
                className="h-full overflow-hidden flex items-center min-w-0 relative"
                style={{
                    contain: 'layout style paint',
                    overflow: 'hidden',
                    isolation: 'isolate',
                    clipPath: 'inset(0)',
                    WebkitClipPath: 'inset(0)'
                }}
            >
                {/* Marquee container */}
                <div
                    className="flex items-center whitespace-nowrap animate-marquee-ltr"
                >
                    {/* Render tickers from JSON */}
                    {flatTickers.map((item, index) => (
                        <TickerItem
                            key={`${item.symbol}-${index}`}
                            ticker={item.symbol}
                            type={item.type}
                            treemapAsset={treemapAssetMap[item.symbol]}
                        />
                    ))}
                    {/* Duplicate tickers for seamless loop */}
                    {flatTickers.map((item, index) => (
                        <TickerItem
                            key={`${item.symbol}-dup-${index}`}
                            ticker={item.symbol}
                            type={item.type}
                            treemapAsset={treemapAssetMap[item.symbol]}
                        />
                    ))}
                </div>
            </div>
        </>
    );
};
