"use client"

import React, { useState, useEffect } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useOnchain, useOnchainMetrics } from '@/hooks/useOnchain'

import { usePostBySlug } from '@/hooks/data/usePosts'
import ComponentCard from '@/components/common/ComponentCard'
import AdminDataInspector from '@/components/common/AdminDataInspector'
import { useAuth } from '@/hooks/auth/useAuthNew'
import Alert from '@/components/ui/alert/Alert'
import dynamic from 'next/dynamic'
import { TimeIcon } from '@/icons'
import { parseLocalized } from '@/utils/parseLocalized'
import BaseTemplateView from './BaseTemplateView'

const OnChainChart = dynamic(() => import('@/components/charts/onchaincharts/OnChainChart'), { ssr: false })
const HalvingChart = dynamic(() => import('@/components/charts/onchaincharts/HalvingChart'), { ssr: false })
const CycleComparisonChart = dynamic(() => import('@/components/charts/onchaincharts/CycleComparisonChart'), { ssr: false })
const HistoryTable = dynamic(() => import('@/components/tables/HistoryTable'), { ssr: false })

interface OnchainOverviewProps {
    className?: string
    initialMetrics?: any[]
    initialMetricConfig?: any
    locale?: string
}

const OnchainOverview: React.FC<OnchainOverviewProps> = ({ className, initialMetrics, locale = 'en' }) => {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const router = useRouter()
    const { isAdmin } = useAuth()
    const [metricId, setMetricId] = useState('mvrv_z_score')
    const [isHalvingMode, setIsHalvingMode] = useState(false)
    const [isCycleComparisonMode, setIsCycleComparisonMode] = useState(false)

    useEffect(() => {
        if (!pathname) return;

        const pathParts = pathname.split('/')
        const lastPart = pathParts[pathParts.length - 1];
        const searchMetric = searchParams?.get('metric');

        let calculatedMetricId = 'mvrv_z_score';

        // Check modes first
        const _isHalving = pathname.includes('/onchain/halving/halving-bull-chart') || lastPart === 'halving-bull-chart' || (searchParams?.get('halving') === 'true');
        const _isCycle = pathname.includes('/onchain/halving/cycle-comparison') || lastPart === 'cycle-comparison';

        if (_isHalving || _isCycle) {
            calculatedMetricId = lastPart;
        } else if (lastPart === 'onchain' || lastPart === 'halving' || !lastPart) {
            calculatedMetricId = searchMetric || 'mvrv_z_score';
        } else {
            calculatedMetricId = lastPart;
        }

        setMetricId(calculatedMetricId);
        setIsHalvingMode(_isHalving);
        setIsCycleComparisonMode(_isCycle);

    }, [pathname, searchParams]);

    // Post slug 결정
    const postSlug = isCycleComparisonMode ? 'cycle-comparison' : (isHalvingMode ? 'halving-bull-chart' : metricId)

    // 온체인 메트릭 목록 및 데이터
    const { metrics, loading: metricsLoading, error: metricsError } = useOnchainMetrics({ initialData: initialMetrics })

    // 데이터 요청 (Halving 모드는 데이터 요청 안함)
    const safeMetricId = (isHalvingMode || isCycleComparisonMode) ? undefined : metricId
    const { data: onchainData, loading: dataLoading, error: dataError } = useOnchain(safeMetricId, '1y')

    // 해당 메트릭의 포스트 가져오기
    const { data: postData, isLoading: postLoading, error: postError } = usePostBySlug(postSlug)

    // 메트릭 이름 정리
    const cleanMetricName = (name: string) => {
        if (!name) return name
        return name.replace(/\s*\([^)]*\)/g, '')
    }

    // 현재 메트릭 설정 (Fallback 포함)
    const metricConfig = metrics.find((m: any) => m.id === metricId) || {
        name: isCycleComparisonMode ? 'Bitcoin Cycle Comparison' : (isHalvingMode ? 'Bitcoin Halving' : 'MVRV-Z'),
        description: '', // Description will be fetched from Post
        loadingText: 'Loading data...',
        title: undefined
    }

    const cleanMetricNameValue = isCycleComparisonMode
        ? 'Bitcoin Cycle Comparison'
        : (isHalvingMode
            ? 'Bitcoin Halving'
            : cleanMetricName(metricConfig.name))

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

    // Fallback description for header
    const headerDescription = (() => {
        const pData = postData as any;
        if (pData?.description) {
            const localized = parseLocalized(pData.description, locale);
            if (localized && typeof localized === 'string' && !localized.startsWith('{')) return localized;
        }
        return (isHalvingMode || isCycleComparisonMode)
            ? (locale === 'ko' ? '비트코인 반감기 사이클 및 가격 분석' : 'Historical Bitcoin halving cycles and price analysis')
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

    // Actions (Metric Selector)
    const metricSelector = (!isHalvingMode && !isCycleComparisonMode) ? (
        <select
            value={metricId}
            onChange={(e) => {
                const parts = pathname.split('/');
                parts.pop();
                parts.push(e.target.value);
                const newPath = parts.join('/');
                router.push(newPath);
            }}
            className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 text-sm"
        >
            {metrics.map((metric: any) => (
                <option key={metric.id} value={metric.id}>
                    {cleanMetricName(metric.name)}
                </option>
            ))}
        </select>
    ) : null;

    // Tabs
    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            content: (
                <div className="space-y-6">
                    {/* Data Loading State embedded in tab if needed, but handled globally mostly */}
                    {dataLoading ? (
                        <div className="flex items-center justify-center h-96">
                            <div className="flex items-center gap-2">
                                <TimeIcon className="h-4 w-4 animate-spin" />
                                <span>{metricConfig.loadingText || 'Loading data...'}</span>
                            </div>
                        </div>
                    ) : dataError && !isHalvingMode && !isCycleComparisonMode ? (
                        <Alert variant="error" title="Error" message={`Failed to load data: ${dataError.message}`} />
                    ) : (
                        <>
                            {/* CHART SECTION */}
                            <ComponentCard title={metricConfig.title || (locale === 'ko' ? `${cleanMetricNameValue} 차트` : `${cleanMetricNameValue} Chart`)}>
                                {isCycleComparisonMode ? (
                                    <CycleComparisonChart
                                        title={locale === 'ko' ? "비트코인 사이클 비교 (저점 대비 고점)" : "Bitcoin Cycle Comparison (Low to High)"}
                                        height={600}
                                        showRangeSelector={true}
                                        showExporting={true}
                                    />
                                ) : isHalvingMode ? (
                                    <HalvingChart
                                        title={locale === 'ko' ? "비트코인 반감기 가격 분석" : "Bitcoin Halving Price Analysis"}
                                        height={600}
                                        showRangeSelector={true}
                                        showExporting={true}
                                    />
                                ) : (
                                    <OnChainChart
                                        assetId="BTCUSDT"
                                        title={metricConfig.title || `Bitcoin Price vs ${cleanMetricNameValue} Correlation`}
                                        height={600}
                                        showRangeSelector={true}
                                        showStockTools={false}
                                        showExporting={true}
                                        metricId={metricId}
                                    />
                                )}
                            </ComponentCard>

                            {/* ANALYSIS INFO SECTION */}
                            <ComponentCard title={locale === 'ko' ? `${cleanMetricNameValue} 분석 정보` : `${cleanMetricNameValue} Analysis Information`}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Left Column: Description */}
                                    <div>
                                        <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">
                                            {locale === 'ko' ? `${cleanMetricNameValue}란?` : `What is ${cleanMetricNameValue}?`}
                                        </h4>
                                        <p className="text-sm text-gray-500 leading-relaxed dark:text-gray-400">
                                            {descriptionText}
                                        </p>
                                    </div>

                                    {/* Right Column: Interpretation or Info Grid */}
                                    <div>
                                        {(isHalvingMode || isCycleComparisonMode) ? (
                                            <div>
                                                <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">
                                                    {isCycleComparisonMode
                                                        ? (locale === 'ko' ? '사이클 기간 정보' : 'Cycle Duration Information')
                                                        : (locale === 'ko' ? '반감기 정보' : 'Halving Information')}
                                                </h4>

                                                {isCycleComparisonMode ? (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {[
                                                            { era: 'Era 1', date: 'Nov 28, 2011' },
                                                            { era: 'Era 2', date: 'Jan 14, 2015' },
                                                            { era: 'Era 3', date: 'Dec 15, 2018' },
                                                            { era: 'Era 4', date: 'Nov 21, 2022' }
                                                        ].map((item) => (
                                                            <div key={item.era} className="text-center p-2 border rounded dark:border-gray-700">
                                                                <div className="font-bold text-blue-600 dark:text-blue-400">{item.era}</div>
                                                                <div className="text-xs text-gray-500">{item.date}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {[
                                                            { nth: '1st', date: 'Nov 28, 2012' },
                                                            { nth: '2nd', date: 'Jul 9, 2016' },
                                                            { nth: '3rd', date: 'May 11, 2020' },
                                                            { nth: '4th', date: 'Apr 20, 2024' }
                                                        ].map((item) => (
                                                            <div key={item.nth} className="text-center p-2 border rounded dark:border-gray-700">
                                                                <div className="font-bold text-green-600 dark:text-green-400">{item.nth}</div>
                                                                <div className="text-xs text-gray-500">{item.date}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
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
                                                    {/* ... other legend items ... */}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ComponentCard>

                            {/* Correlation Score */}
                            {(!isHalvingMode && !isCycleComparisonMode && (onchainData as any)?.correlation) && (
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

                            {/* History Table */}
                            {(isHalvingMode || isCycleComparisonMode) && (
                                <ComponentCard title={locale === 'ko' ? "비트코인 과거 데이터" : "Bitcoin Historical Data"}>
                                    <HistoryTable
                                        assetIdentifier="BTCUSDT"
                                        initialInterval="1d"
                                        showVolume={true}
                                        showChangePercent={true}
                                        height={400}
                                    />
                                </ComponentCard>
                            )}

                            {/* About Section */}
                            {postData && ((postData as any).content || (postData as any).content_ko) && (
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
    ];

    return (
        <BaseTemplateView
            locale={locale}
            seo={{
                title: locale === 'ko' ? `${cleanMetricNameValue} 분석` : `${cleanMetricNameValue} Analysis`,
                description: headerDescription
            }}
            header={{
                title: cleanMetricNameValue,
                category: { name: 'On-Chain' },
                breadcrumbs: [
                    { label: 'Admin', href: `/${locale}/admin` },
                    { label: 'OnChain', href: '#' },
                    { label: cleanMetricNameValue, href: '#' }
                ],
                actions: metricSelector
            }}
            tabs={tabs}
        />
    )
}

export default OnchainOverview
