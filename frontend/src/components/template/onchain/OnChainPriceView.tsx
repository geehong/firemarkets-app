"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useOnchain, useOnchainMetrics, useOnchainDashboard } from '@/hooks/useOnchain'
import { usePostBySlug } from '@/hooks/data/usePosts'
import ComponentCard from '@/components/common/ComponentCard'
import AdminDataInspector from '@/components/common/AdminDataInspector'
import { useAuth } from '@/hooks/auth/useAuthNew'
import Alert from '@/components/ui/alert/Alert'
import { TimeIcon } from '@/icons'
import { parseLocalized } from '@/utils/parseLocalized'
import OnChainTemplateView from '@/components/template/onchain/OnChainTemplateView'

// Prop interfaces for dynamic components
interface OnChainChartProps {
    assetId?: string;
    title?: string;
    height?: number;
    showRangeSelector?: boolean;
    showStockTools?: boolean;
    showExporting?: boolean;
    metricId?: string;
    metricName?: string;
}

const OnChainChart = dynamic<OnChainChartProps>(() => import('@/components/charts/onchaincharts/OnChainChart'), { ssr: false })
const PiCycleChart = dynamic(() => import('@/components/charts/onchaincharts/PiCycleChart'), { ssr: false })
const CapitalizationChart = dynamic(() => import('@/components/charts/onchaincharts/CapitalizationChart'), { ssr: false })
const MovingAverageChart = dynamic(() => import('@/components/charts/onchaincharts/MovingAverageChart'), { ssr: false })
const ClosePriceChart = dynamic(() => import('@/components/charts/ohlcvcharts/ClosePriceChart'), { ssr: false })
const OHLCVCustomGUIChart = dynamic(() => import('@/components/charts/ohlcvcharts/OHLCVCustomGUIChart'), { ssr: false })
const LiveChart = dynamic(() => import('@/components/charts/live/LiveChart'), { ssr: false })
const BitcoinMonthlyReturns = dynamic(() => import('@/components/widgets/BitcoinMonthlyReturns').then(mod => mod.BitcoinMonthlyReturns), { ssr: false })

interface OnChainPriceViewProps {
    locale: string
    metricId: string | null
    fullPath: string
    isDashboardView: boolean
    initialMetrics?: any[]
    pathname: string
}

const OnChainPriceView: React.FC<OnChainPriceViewProps> = ({
    locale,
    metricId,
    fullPath,
    isDashboardView,
    initialMetrics,
    pathname
}) => {
    const router = useRouter()
    const { isAdmin } = useAuth()

    // Post slug determination - Always lowercase for fetching
    const postSlug = (metricId || '').toLowerCase()

    // OnChain Metrics & Data
    const { metrics, loading: metricsLoading, error: metricsError } = useOnchainMetrics({ initialData: initialMetrics })
    const { data: dashboardData, loading: dashboardLoading } = useOnchainDashboard('BTCUSDT')
    const { data: onchainData, loading: dataLoading, error: dataError } = useOnchain(metricId || undefined, '1y')
    const { data: postData, isLoading: postLoading, error: postError } = usePostBySlug(postSlug || undefined)

    // Determine context (Price View vs Metric View)
    const isPriceMetric = fullPath.includes('/onchain/price/');

    // Helper: Clean Metric Name
    const cleanMetricName = (name: string) => {
        if (!name) return name
        return name.replace(/\s*\([^)]*\)/g, '')
    }

    // Metric Config Fallback
    const metricConfig = metrics.find((m: any) => m.id === metricId) || {
        name: '',
        description: '',
        loadingText: 'Loading data...',
        title: undefined,
        data_count: 0
    }

    // Determine Clean Metric Name Value for Title/Header
    const cleanMetricNameValue = (() => {
        // Try getting title from Post Data first
        if (postData?.title) {
            const localizedTitle = parseLocalized(postData.title, locale);
            if (localizedTitle && typeof localizedTitle === 'string' && !localizedTitle.startsWith('{')) {
                return localizedTitle;
            }
        }

        if (metricConfig.name) {
            return metricConfig.name === 'On-Chain Metrics Dashboard' || metricConfig.name === '온체인 지표 대시보드'
                ? metricConfig.name
                : cleanMetricName(metricConfig.name);
        }

        // Fallbacks based on path
        if (fullPath.includes('/onchain/price/live')) return 'Live BTC Price';
        if (fullPath.includes('/onchain/price/close/daily')) return 'BTC Close Price (Daily)';
        if (fullPath.includes('/onchain/price/close/intraday')) return 'BTC Close Price (IntraDay)';
        if (fullPath.includes('/onchain/price/ohlcv/daily')) return 'BTC Daily OHLCV';
        if (fullPath.includes('/onchain/price/ohlcv/intraday')) return 'BTC IntraDay OHLCV';
        if (fullPath.includes('/onchain/price/moving-averages')) return 'Moving Averages';
        if (fullPath.includes('/onchain/price/capitalization')) return 'Capitalization';
        if (fullPath.includes('/onchain/price/pi-cycle')) return 'Pi Cycle';
        if (fullPath.toLowerCase().includes('/onchain/price/monthlyreturns')) return 'Monthly Returns';

        return isDashboardView
            ? (locale === 'ko' ? '온체인 지표 대시보드' : 'On-Chain Metrics Dashboard')
            : (metricId || '');
    })();

    // Description Logic
    const descriptionText = (() => {
        const pData = postData as any;
        if (pData?.description) {
            const desc = pData.description;
            if (typeof desc === 'string' && desc.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(desc);
                    if (parsed[locale]) return parsed[locale];
                    if (parsed['en']) return parsed['en'];
                } catch (e) { }
            }
            const localized = parseLocalized(desc, locale);
            if (typeof localized === 'string' && localized && !localized.trim().startsWith('{')) {
                return localized;
            }
        }
        if (pData && locale === 'ko' && pData.content_ko) return pData.content_ko;

        return parseLocalized(metricConfig.description, locale);
    })();

    // Header Description
    const headerDescription = (() => {
        const pData = postData as any;
        if (pData?.description) {
            const localized = parseLocalized(pData.description, locale);
            if (localized && typeof localized === 'string' && !localized.startsWith('{')) return localized;
        }
        return isDashboardView
            ? (locale === 'ko' ? '비트코인 온체인 지표 대시보드' : 'Bitcoin On-chain Metrics Dashboard')
            : `Bitcoin onchain metrics correlation with price movements`;
    })();

    // Loading State
    if (metricsLoading) {
        return (
            <ComponentCard title="Loading...">
                <div className="flex items-center justify-center h-32">
                    <div className="flex items-center gap-2">
                        <TimeIcon className="h-4 w-4 animate-spin" />
                        <span>Loading metrics...</span>
                    </div>
                </div>
            </ComponentCard>
        )
    }

    // Error State
    if (metricsError) {
        return <Alert variant="error" title="Error" message={`Failed to load metrics: ${metricsError.message}`} />
    }

    // Metric Selector (Dropdown)
    const metricSelector = (
        <select
            value={(() => {
                if (fullPath.includes('/onchain/price/live')) return 'price/live';
                if (fullPath.includes('/onchain/price/close/daily')) return 'price/close/daily';
                if (fullPath.includes('/onchain/price/close/intraday')) return 'price/close/intraday';
                if (fullPath.includes('/onchain/price/ohlcv/daily')) return 'price/ohlcv/daily';
                if (fullPath.includes('/onchain/price/ohlcv/intraday')) return 'price/ohlcv/intraday';
                if (fullPath.includes('/onchain/price/moving-averages')) return 'price/moving-averages';
                if (fullPath.includes('/onchain/price/capitalization')) return 'price/capitalization';
                if (fullPath.includes('/onchain/price/pi-cycle')) return 'price/pi-cycle';
                return metricId || '';
            })()}
            onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                    router.push(`/${locale}/admin/onchain`);
                    return;
                }

                // Handle static price paths
                if (val.startsWith('price/')) {
                    router.push(`/${locale}/admin/onchain/${val}`);
                    return;
                }

                // Handle dynamic metrics
                const parts = pathname.split('/');
                const lastPart = parts[parts.length - 1];
                if (lastPart === 'onchain') {
                    router.push(`${pathname}/${val}`);
                } else {
                    router.push(`/${locale}/admin/onchain/${val}`);
                }
            }}
            className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 text-sm"
        >
            <option value="">{locale === 'ko' ? '-- 선택 --' : '-- Select --'}</option>

            {isPriceMetric ? (
                /* PRICE VIEW MENU ONLY */
                <>
                    <option value="price/live">{locale === 'ko' ? '실시간 가격' : 'Live Price'}</option>
                    <option value="price/close/daily">{locale === 'ko' ? '종가 (일별)' : 'Close Price (Daily)'}</option>
                    <option value="price/close/intraday">{locale === 'ko' ? '종가 (시간별)' : 'Close Price (Hourly)'}</option>
                    <option value="price/ohlcv/daily">{locale === 'ko' ? 'OHLCV (일별)' : 'OHLCV (Daily)'}</option>
                    <option value="price/ohlcv/intraday">{locale === 'ko' ? 'OHLCV (시간별)' : 'OHLCV (Hourly)'}</option>
                    <option value="price/moving-averages">{locale === 'ko' ? '이동평균선' : 'Moving Averages'}</option>
                    <option value="price/capitalization">{locale === 'ko' ? '시가총액' : 'Capitalization'}</option>
                    <option value="price/pi-cycle">{locale === 'ko' ? '파이 사이클' : 'Pi Cycle'}</option>
                </>
            ) : (
                /* METRIC VIEW MENU ONLY (Default) */
                <>
                    {metrics.map((metric: any) => (
                        <option key={metric.id} value={metric.id}>
                            {cleanMetricName(metric.name)} {metric.data_count ? `(${metric.data_count})` : ''}
                        </option>
                    ))}
                </>
            )}
        </select>
    );

    const hasPostContent = postData && ((postData as any).content || (postData as any).content_ko);

    // Tabs
    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            content: (
                <div className="space-y-6">
                    {/* DASHBOARD VIEW */}
                    {isDashboardView ? (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wider">{locale === 'ko' ? '전체 메트릭' : 'Total Metrics'}</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{dashboardData?.total_metrics || metrics.length}</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wider">{locale === 'ko' ? '활성 메트릭' : 'Active Metrics'}</div>
                                    <div className="text-2xl font-bold text-emerald-500">{dashboardData?.active_metrics || metrics.filter((m: any) => m.is_enabled).length}</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wider">{locale === 'ko' ? '기록 데이터' : 'Record Points'}</div>
                                    <div className="text-2xl font-bold text-blue-500">
                                        {metricConfig.data_count?.toLocaleString() || '...'}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium uppercase tracking-wider">{locale === 'ko' ? '기준 티커' : 'Base Ticker'}</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">BTC/USDT</div>
                                </div>
                            </div>

                            {/* Metric Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {dashboardData?.latest_updates?.map((item: any) => (
                                    <div
                                        key={item.metric_id}
                                        onClick={() => {
                                            const parts = pathname.split('/');
                                            const lPart = parts[parts.length - 1];
                                            if (lPart === 'onchain') {
                                                router.push(`${pathname}/${item.metric_id}`);
                                            } else {
                                                parts[parts.length - 1] = item.metric_id;
                                                router.push(parts.join('/'));
                                            }
                                        }}
                                        className={`cursor-pointer p-5 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group ${metricId === item.metric_id
                                            ? 'bg-blue-50 border-blue-400 dark:bg-blue-900/30 dark:border-blue-500 shadow-md ring-4 ring-blue-500/10'
                                            : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'}`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <h4 className={`font-bold transition-colors duration-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 ${metricId === item.metric_id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'} line-clamp-1`}>
                                                {item.metric_name}
                                            </h4>
                                            <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-tighter ${metricId === item.metric_id ? 'bg-blue-600 text-white' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'}`}>
                                                Active
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-1">
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{locale === 'ko' ? '데이터' : 'Points'}</div>
                                                <div className={`text-xl font-black ${metricId === item.metric_id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>
                                                    {item.data_count?.toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{locale === 'ko' ? '최근 값' : 'Last Value'}</div>
                                                <div className={`text-xl font-black ${metricId === item.metric_id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100'}`}>
                                                    {item.latest_value !== null ? item.latest_value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : 'N/A'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-[10px] font-medium text-gray-400">
                                            <div className="flex items-center gap-1.5">
                                                <TimeIcon className="w-3.5 h-3.5" />
                                                <span className="font-mono">{item.latest_date}</span>
                                            </div>
                                            <div className="flex items-center hover:text-blue-500 transition-colors">
                                                {locale === 'ko' ? '자세히 보기' : 'View Details'} →
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* DETAIL VIEW */
                        <>
                            {dataLoading ? (
                                <div className="flex items-center justify-center h-96">
                                    <div className="flex items-center gap-2">
                                        <TimeIcon className="h-4 w-4 animate-spin" />
                                        <span>{metricConfig.loadingText || 'Loading data...'}</span>
                                    </div>
                                </div>
                            ) : dataError ? (
                                <Alert variant="error" title="Error" message={`Failed to load data: ${dataError.message}`} />
                            ) : (
                                <>
                                    {/* CHARTS */}
                                    <ComponentCard title={metricConfig.title || (locale === 'ko' ? `${cleanMetricNameValue} 차트` : `${cleanMetricNameValue} Chart`)}>
                                        {fullPath.includes('/onchain/price/live') ? (
                                            <LiveChart assetIdentifier="BTCUSDT" height={600} />
                                        ) : fullPath.includes('/onchain/price/close/daily') ? (
                                            <ClosePriceChart
                                                assetId="BTCUSDT"
                                                interval="1d"
                                                allowedIntervals={['1d', '1w', '1M']}
                                                height={600}
                                            />
                                        ) : fullPath.includes('/onchain/price/close/intraday') ? (
                                            <ClosePriceChart
                                                assetId="BTCUSDT"
                                                interval="1h"
                                                allowedIntervals={['1m', '5m', '15m', '30m', '1h', '4h']}
                                                height={600}
                                            />
                                        ) : fullPath.includes('/onchain/price/ohlcv/daily') ? (
                                            <OHLCVCustomGUIChart
                                                assetIdentifier="BTCUSDT"
                                                dataInterval="1d"
                                                allowedIntervals={['1d', '1w', '1M']}
                                                height={600}
                                            />
                                        ) : fullPath.includes('/onchain/price/ohlcv/intraday') ? (
                                            <OHLCVCustomGUIChart
                                                assetIdentifier="BTCUSDT"
                                                dataInterval="1h"
                                                allowedIntervals={['1m', '5m', '15m', '30m', '1h', '4h']}
                                                height={600}
                                            />
                                        ) : fullPath.includes('/onchain/price/moving-averages') ? (
                                            <MovingAverageChart assetId="BTCUSDT" height={600} />
                                        ) : fullPath.includes('/onchain/price/capitalization') ? (
                                            <CapitalizationChart assetId="BTCUSDT" height={600} />
                                        ) : fullPath.includes('/onchain/price/pi-cycle') ? (
                                            <PiCycleChart assetId="BTCUSDT" height={600} />
                                        ) : fullPath.toLowerCase().includes('/onchain/price/monthlyreturns') ? (
                                            <BitcoinMonthlyReturns />
                                        ) : (
                                            <OnChainChart
                                                assetId="BTCUSDT"
                                                title={metricConfig.title || `Bitcoin Price vs ${cleanMetricNameValue} Correlation`}
                                                height={600}
                                                showRangeSelector={true}
                                                showStockTools={false}
                                                showExporting={true}
                                                metricId={metricId || undefined}
                                                metricName={cleanMetricNameValue}
                                            />
                                        )}
                                    </ComponentCard>

                                    {/* ANALYSIS INFO SECTION - Render ONLY if post has no content */}
                                    {!hasPostContent && (
                                        <ComponentCard title={locale === 'ko' ? `${cleanMetricNameValue} 분석 정보` : `${cleanMetricNameValue} Analysis Information`}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Description */}
                                                <div>
                                                    <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">
                                                        {locale === 'ko' ? `${cleanMetricNameValue}란?` : `What is ${cleanMetricNameValue}?`}
                                                    </h4>
                                                    <p className="text-sm text-gray-500 leading-relaxed dark:text-gray-400">
                                                        {descriptionText}
                                                    </p>
                                                </div>

                                                {/* Interpretation */}
                                                <div>
                                                    {!isPriceMetric && (
                                                        <div>
                                                            <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">
                                                                {locale === 'ko' ? '상관관계 해석' : 'Correlation Interpretation'}
                                                            </h4>
                                                            <div className="space-y-2 text-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                                    <span className="text-gray-700 dark:text-gray-300">
                                                                        <strong>{locale === 'ko' ? '강한 양의 상관 (0.7-1.0):' : 'Strong Positive (0.7-1.0):'}</strong>
                                                                        {locale === 'ko' ? ' 높은 상관관계' : ' High correlation'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </ComponentCard>
                                    )}

                                    {/* Correlation Score */}
                                    {(!isPriceMetric && (onchainData as any)?.correlation) && (
                                        <ComponentCard title="Current Correlation">
                                            <div className="text-center">
                                                <div className="text-4xl font-bold mb-2">
                                                    {(onchainData as any).correlation > 0 ? (
                                                        <span className="text-green-600 dark:text-green-400">+{(onchainData as any).correlation.toFixed(3)}</span>
                                                    ) : (
                                                        <span className="text-red-600 dark:text-red-400">{(onchainData as any).correlation.toFixed(3)}</span>
                                                    )}
                                                </div>
                                                <p className="text-gray-500 dark:text-gray-400">
                                                    Correlation between Bitcoin price and {cleanMetricNameValue}
                                                </p>
                                            </div>
                                        </ComponentCard>
                                    )}

                                    {/* About Section (Post Content) - Render if content exists */}
                                    {hasPostContent && (
                                        <ComponentCard title={parseLocalized((postData as any).title, locale) || cleanMetricNameValue}>
                                            <div
                                                className="prose prose-sm dark:prose-invert max-w-none"
                                                dangerouslySetInnerHTML={{
                                                    __html: locale === 'ko'
                                                        ? ((postData as any).content_ko || (postData as any).content)
                                                        : ((postData as any).content || (postData as any).content_ko)
                                                }}
                                            />
                                        </ComponentCard>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            )
        },
        ...(isAdmin ? [{
            id: 'details',
            label: 'Details',
            content: (
                <div>
                    {postData && (postData as any).id && (
                        <div className="mb-6">
                            <Link
                                href={`/${locale}/admin/post/edit/${(postData as any).id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit OnChain
                            </Link>
                        </div>
                    )}
                    <AdminDataInspector
                        data={postData}
                        isLoading={postLoading}
                        error={postError}
                        title={`${cleanMetricNameValue} - ${locale === 'ko' ? '상세 데이터' : 'Raw Data'}`}
                        locale={locale}
                    />
                </div>
            )
        }] : [])
    ]

    return (
        <OnChainTemplateView
            locale={locale}
            cleanMetricNameValue={cleanMetricNameValue}
            description={headerDescription}
            actions={metricSelector}
            tabs={tabs}
        />
    )
}

export default OnChainPriceView
