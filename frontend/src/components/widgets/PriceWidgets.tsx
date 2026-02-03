"use client";

import React, { useMemo } from 'react';
import { useRealtimePrices } from '@/hooks/data/useSocket';
import { useDelayedQuoteLast, useSparklinePrice } from '@/hooks/data/useRealtime';
import { useAssetDetail } from '@/hooks/assets/useAssets';
import ComponentCard from '@/components/common/ComponentCard';

// --- RealtimePriceWidget ---

interface RealtimePriceWidgetProps {
    ticker: string;
    title?: string;
    showVolume?: boolean;
    showTimestamp?: boolean;
    size?: 'small' | 'medium' | 'large';
    variant?: 'crypto' | 'stocks' | 'commodities' | 'default';
    className?: string;
}

export const RealtimePriceWidget: React.FC<RealtimePriceWidgetProps> = ({
    ticker,
    title,
    showVolume = true,
    showTimestamp = false,
    size = 'medium',
    variant = 'default',
    className = ''
}) => {
    const { latestPrice, isConnected, isUsingDummyData } = useRealtimePrices(ticker);

    // Size Styles
    const sizeStyles = {
        small: {
            container: 'p-3',
            title: 'text-sm font-medium',
            price: 'text-lg font-bold',
            volume: 'text-xs',
            timestamp: 'text-xs',
            status: 'text-xs'
        },
        medium: {
            container: 'p-4',
            title: 'text-base font-semibold',
            price: 'text-xl font-bold',
            volume: 'text-sm',
            timestamp: 'text-xs',
            status: 'text-xs'
        },
        large: {
            container: 'p-6',
            title: 'text-lg font-semibold',
            price: 'text-2xl font-bold',
            volume: 'text-sm',
            timestamp: 'text-sm',
            status: 'text-sm'
        }
    };

    // Variant Styles
    const variantStyles = {
        crypto: {
            container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
            title: 'text-blue-800 dark:text-blue-200',
            price: 'text-blue-600 dark:text-blue-400',
            volume: 'text-gray-600 dark:text-gray-400',
            timestamp: 'text-gray-500 dark:text-gray-500',
            status: 'text-green-600 dark:text-green-400'
        },
        stocks: {
            container: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
            title: 'text-green-800 dark:text-green-200',
            price: 'text-green-600 dark:text-green-400',
            volume: 'text-gray-600 dark:text-gray-400',
            timestamp: 'text-gray-500 dark:text-gray-500',
            status: 'text-green-600 dark:text-green-400'
        },
        commodities: {
            container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
            title: 'text-yellow-800 dark:text-yellow-200',
            price: 'text-yellow-600 dark:text-yellow-400',
            volume: 'text-gray-600 dark:text-gray-400',
            timestamp: 'text-gray-500 dark:text-gray-500',
            status: 'text-green-600 dark:text-green-400'
        },
        default: {
            container: 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700',
            title: 'text-gray-800 dark:text-gray-200',
            price: 'text-gray-700 dark:text-gray-300',
            volume: 'text-gray-600 dark:text-gray-400',
            timestamp: 'text-gray-500 dark:text-gray-500',
            status: 'text-green-600 dark:text-green-400'
        }
    };

    const currentSize = sizeStyles[size];
    const currentVariant = variantStyles[variant];

    // Status Helpers
    const getStatusText = () => {
        if (isConnected) return '● Live';
        if (isUsingDummyData) return '● Demo';
        return '● Offline';
    };

    const getStatusColor = () => {
        if (isConnected) return 'text-green-600 dark:text-green-400';
        if (isUsingDummyData) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    return (
        <div className={`
      ${currentSize.container}
      ${currentVariant.container}
      rounded-lg border
      ${className}
    `}>
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <h3 className={`${currentSize.title} ${currentVariant.title}`}>
                    {title || ticker}
                </h3>
                <span className={`${currentSize.status} ${getStatusColor()}`}>
                    {getStatusText()}
                </span>
            </div>

            {/* Price & Change */}
            <div className="mb-2">
                <div className={`${currentSize.price} ${currentVariant.price}`}>
                    ${latestPrice?.price?.toFixed(2) || 'N/A'}
                </div>
                {latestPrice?.changePercent !== undefined && latestPrice.changePercent !== null && (
                    <div className={`${currentSize.volume} mt-1`}>
                        <span className={`
              font-medium
              ${latestPrice.changePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
            `}>
                            {latestPrice.changePercent >= 0 ? '+' : ''}
                            {latestPrice.changePercent.toFixed(2)}%
                        </span>
                        <span className="text-gray-500 text-xs ml-1">(24h)</span>
                    </div>
                )}
            </div>

            {/* Volume */}
            {showVolume && (
                <div className={`${currentSize.volume} ${currentVariant.volume} mb-1`}>
                    Volume: {latestPrice?.volume?.toLocaleString('en-US') || 'N/A'}
                </div>
            )}

            {/* Timestamp */}
            {showTimestamp && latestPrice?.timestamp && (
                <div className={`${currentSize.timestamp} ${currentVariant.timestamp}`}>
                    {new Date(latestPrice.timestamp).toLocaleTimeString('en-US')}
                </div>
            )}
        </div>
    );
};

// --- MiniPriceWidget ---

interface MiniPriceWidgetProps {
    ticker: string;
    showChange?: boolean;
    showStatus?: boolean;
    className?: string;
}

export const MiniPriceWidget: React.FC<MiniPriceWidgetProps> = ({
    ticker,
    showChange = false,
    showStatus = true,
    className = ''
}) => {
    const { latestPrice, isConnected, isUsingDummyData } = useRealtimePrices(ticker);

    const getStatusIcon = () => {
        if (isConnected) return '🟢';
        if (isUsingDummyData) return '🟡';
        return '🔴';
    };

    const getStatusText = () => {
        if (isConnected) return 'Live';
        if (isUsingDummyData) return 'Demo';
        return 'Offline';
    };

    return (
        <div className={`
      flex items-center justify-between
      p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
      hover:shadow-md transition-shadow
      ${className}
    `}>
            {/* Ticker & Price */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {ticker}
                    </span>
                    {showStatus && (
                        <span className="text-xs text-gray-500" title={getStatusText()}>
                            {getStatusIcon()}
                        </span>
                    )}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                    ${latestPrice?.price?.toFixed(2) || 'N/A'}
                </div>
                {showChange && latestPrice?.price && (
                    <div className="text-xs text-gray-500">
                        {/* Actual change calculation omitted for mini widget simplicity, showing placeholder or basic change if available */}
                        {latestPrice?.changePercent ? (
                            <span className={latestPrice.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {latestPrice.changePercent >= 0 ? '+' : ''}{latestPrice.changePercent.toFixed(2)}%
                            </span>
                        ) : (
                            "+0.00%"
                        )}
                    </div>
                )}
            </div>

            {/* Volume (Hidden on small screens) */}
            <div className="hidden sm:block text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    Vol: {latestPrice?.volume ? (latestPrice.volume > 1000000 ? (latestPrice.volume / 1000000).toFixed(1) + 'M' : (latestPrice.volume / 1000).toFixed(0) + 'K') : 'N/A'}
                </div>
            </div>
        </div>
    );
};

// --- RealtimeQuotesPriceWidget ---

interface RealtimeQuotesPriceWidgetProps {
    assetIdentifier: string
    className?: string
}

export const RealtimeQuotesPriceWidget: React.FC<RealtimeQuotesPriceWidgetProps> = ({
    assetIdentifier,
    className = ''
}) => {
    const { data: assetDetail } = useAssetDetail(assetIdentifier)

    const isCrypto = assetDetail?.asset_type_id === 8
    const dataSource = isCrypto ? 'binance' : undefined

    const isStocksOrEtf =
        assetDetail?.asset_type_id === 2 ||
        assetDetail?.asset_type_id === 5 ||
        assetDetail?.type_name?.toLowerCase() === 'stocks' ||
        assetDetail?.type_name?.toLowerCase() === 'etfs'

    const delayedQuoteOptions = useMemo(() => ({
        dataInterval: '15m',
        dataSource: dataSource
    }), [dataSource])

    const delayedQuoteQuery = useDelayedQuoteLast(
        assetIdentifier,
        delayedQuoteOptions,
        {
            refetchInterval: 15 * 60 * 1000,
            staleTime: 0,
            gcTime: 0,
            enabled: !!assetIdentifier && !isStocksOrEtf,
        } as any
    )

    const sparklineQuery = useSparklinePrice(
        assetIdentifier,
        { dataInterval: '15m', days: 1, dataSource },
        {
            refetchInterval: 15 * 60 * 1000,
            staleTime: 0,
            gcTime: 0,
            enabled: !!assetIdentifier && isStocksOrEtf,
        } as any
    )

    let quoteData: any = null
    if (isStocksOrEtf && sparklineQuery.data) {
        const data = sparklineQuery.data as any
        const quotes = data?.quotes || []
        if (quotes.length > 0) {
            quoteData = {
                quote: quotes[0],
                timestamp: quotes[0]?.timestamp_utc
            }
        }
    } else if (!isStocksOrEtf) {
        quoteData = delayedQuoteQuery.data
    }

    const isLoading = isStocksOrEtf ? sparklineQuery.isLoading : delayedQuoteQuery.isLoading
    const error = isStocksOrEtf ? sparklineQuery.error : delayedQuoteQuery.error

    if (isLoading) {
        return (
            <ComponentCard title="Delayed Price (15min)" className={className}>
                <div className="animate-pulse">
                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </ComponentCard>
        )
    }

    if (error) {
        return (
            <ComponentCard title="Delayed Price (15min)" className={className}>
                <div className="text-center py-4">
                    <p className="text-sm text-gray-500">Failed to load delayed price data</p>
                </div>
            </ComponentCard>
        )
    }

    const quote = quoteData?.quote || quoteData

    if (!quote) {
        return (
            <ComponentCard title="Delayed Price (15min)" className={className}>
                <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No delayed price data available</p>
                </div>
            </ComponentCard>
        )
    }

    const price = quote.price || 0
    const changeAmount = quote.change_amount ?? 0
    const changePercent = quote.change_percent ?? 0
    const volume = quote.volume || 0
    const timestamp = quote.timestamp_utc || quoteData?.timestamp || new Date().toISOString()

    const formatTime = (timestamp: string) => {
        try {
            if (timestamp.includes('T')) {
                const timePart = timestamp.split('T')[1]
                return timePart.split('.')[0].substring(0, 8)
            }
            const date = new Date(timestamp)
            const hours = date.getUTCHours().toString().padStart(2, '0')
            const minutes = date.getUTCMinutes().toString().padStart(2, '0')
            const seconds = date.getUTCSeconds().toString().padStart(2, '0')
            return `${hours}:${minutes}:${seconds}`
        } catch {
            return timestamp
        }
    }

    return (
        <ComponentCard title="Delayed Price (15min)" className={className}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border dark:border-gray-700 rounded-lg">
                    <div className={`text-2xl font-bold ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6
                        })}
                    </div>
                    <div className="text-sm text-gray-500">Price</div>
                </div>

                <div className="text-center p-4 border dark:border-gray-700 rounded-lg">
                    <div className={`text-lg font-semibold ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(4)}%
                    </div>
                    <div className="text-sm text-gray-500">Change</div>
                    {changeAmount !== 0 && (
                        <div className={`text-xs mt-1 ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {changeAmount >= 0 ? '+' : ''}${changeAmount.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 8
                            })}
                        </div>
                    )}
                </div>

                <div className="text-center p-4 border dark:border-gray-700 rounded-lg">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {formatTime(timestamp)}
                    </div>
                    <div className="text-sm text-gray-500">Last Updated</div>
                    {volume > 0 && (
                        <div className="text-xs mt-1 text-gray-400">
                            Vol: {volume.toLocaleString('en-US')}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 pt-4 border-t dark:border-gray-700">
                <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                    <span className="text-xs text-gray-500">15-minute delayed data</span>
                </div>
            </div>
        </ComponentCard>
    )
}
