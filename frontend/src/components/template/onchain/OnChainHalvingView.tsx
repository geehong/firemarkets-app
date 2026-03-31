"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { usePostBySlug } from '@/hooks/data/usePosts'
import ComponentCard from '@/components/common/ComponentCard'
import AdminDataInspector from '@/components/common/AdminDataInspector'
import { useAuth } from '@/hooks/auth/useAuthNew'
import Alert from '@/components/ui/alert/Alert'
import { parseLocalized } from '@/utils/parseLocalized'
import OnChainTemplateView from '@/components/template/onchain/OnChainTemplateView'

// Prop interfaces for dynamic components
interface HalvingChartProps {
    title?: string;
    height: number;
    showRangeSelector?: boolean;
    showExporting?: boolean;
    singlePeriod?: number | null;
    locale?: string;
}

interface CycleComparisonChartProps {
    title?: string;
    height?: number;
    showRangeSelector?: boolean;
    showExporting?: boolean;
}

interface HistoryTableProps {
    assetIdentifier?: string;
    initialInterval?: '1d' | '1w' | '1M';
    showVolume?: boolean;
    showChangePercent?: boolean;
    height?: number;
}

const HalvingChart = dynamic<HalvingChartProps>(() => import('@/components/charts/onchaincharts/HalvingChart'), { ssr: false })
const CycleComparisonChart = dynamic<CycleComparisonChartProps>(() => import('@/components/charts/onchaincharts/CycleComparisonChart'), { ssr: false })
const QuantAnalysisChart = dynamic(() => import('@/components/charts/onchaincharts/QuantAnalysisChart'), { ssr: false })
const QuantComponentsChart = dynamic(() => import('@/components/charts/onchaincharts/QuantComponentsChart'), { ssr: false })
const HistoryTable = dynamic<HistoryTableProps>(() => import('@/components/tables/HistoryTable'), { ssr: false })

interface OnChainHalvingViewProps {
    locale: string
    isCycleComparisonMode: boolean
    isHalvingMode: boolean
    isQuantMode?: boolean
}

const OnChainHalvingView: React.FC<OnChainHalvingViewProps> = ({
    locale,
    isCycleComparisonMode,
    isHalvingMode,
    isQuantMode = false
}) => {
    const { isAdmin } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    // 퀀트 하단 차트와 동기화하기 위한 X축 타임레인지 상태
    const [quantTimeRange, setQuantTimeRange] = useState<{ min: number; max: number } | null>(null)

    // Post slug determination (isQuantMode does not have a post yet, prevent 404)
    const postSlug = isQuantMode ? 'quant-analysis' : (isCycleComparisonMode ? 'cycle-comparison' : 'halving-bull-chart')

    // Data Fetching
    const { data: postData, isLoading: postLoading, error: postError } = usePostBySlug(postSlug)
    const hasPostContent = !!(postData && ((postData as any).content || (postData as any).content_ko));

    // Metric Name for Display
    const cleanMetricNameValue = isQuantMode
        ? (locale === 'ko' ? '비트코인 퀀트 분석 엔진' : 'Bitcoin Quant Analysis Engine')
        : (isCycleComparisonMode
            ? (locale === 'ko' ? '비트코인 사이클 비교' : 'Bitcoin Cycle Comparison')
            : (locale === 'ko' ? '비트코인 반감기' : 'Bitcoin Halving'));

    // Header Description
    const headerDescription = (isHalvingMode || isCycleComparisonMode || isQuantMode)
        ? (locale === 'ko' ? '비트코인 반감기 사이클 및 가격 분석' : 'Historical Bitcoin halving cycles and price analysis')
        : '';

    // Description Text Logic (for Analysis Info)
    const descriptionText = (() => {
        const pData = postData as any;
        if (pData?.description) {
            const localized = parseLocalized(pData.description, locale);
            if (localized && typeof localized === 'string' && !localized.startsWith('{')) {
                return localized;
            }
        }
        return '';
    })();

    // Metric Selector for Halving View
    const handleMetricChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (!val) return;

        // Base path reconstruction logic relative to locale
        // If current path is /en/admin/onchain/halving/halving-bull-chart
        // We want to switch to /en/admin/onchain/halving/cycle-comparison
        // But the previous implementation had logic for 'if lastPart === onchain' etc.
        // Easiest is to hardcode known sub-paths or replace last segment
        const parts = pathname?.split('/') || [];
        // Assuming path ends with the slug or 'halving'
        // Let's rely on standard routing: /onchain/halving/[slug]

        // Check if we are currently at a "price" subview to know replacement logic? 
        // No, this is Halving View. 
        // We know structure: .../onchain/halving/[chart]

        // Find 'onchain' index
        const onchainIndex = parts.indexOf('onchain');
        if (onchainIndex !== -1) {
            const basePath = parts.slice(0, onchainIndex + 1).join('/');
            // Check if 'halving' segment exists
            // Actually OnChainMainView logic detects /onchain/halving/cycle-comparison OR /onchain/cycle-comparison
            // Let's use the explicit standard: /onchain/halving/[val] if possible, or relative to current if structure allows

            // Safe bet: absolute path from admin level if we can deduce locale
            // Actually router.push with relative path? No.

            router.push(`/${locale}/admin/onchain/halving/${val}`);
        }
    };

    const metricSelector = (
        <select
            value={isQuantMode ? 'quant-analysis' : (isCycleComparisonMode ? 'cycle-comparison' : 'halving-bull-chart')}
            onChange={handleMetricChange}
            className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 text-sm"
        >
            <option value="halving-bull-chart">
                {locale === 'ko' ? '비트코인 반감기' : 'Bitcoin Halving Price Analysis'}
            </option>
            <option value="cycle-comparison">
                {locale === 'ko' ? '비트코인 사이클 비교' : 'Bitcoin Cycle Comparison'}
            </option>
            <option value="quant-analysis">
                {locale === 'ko' ? '비트코인 퀀트 분석 엔진' : 'Bitcoin Quant Analysis Engine'}
            </option>
        </select>
    );

    // Tabs
    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            content: (
                <div className="space-y-6">
                    {/* CHART SECTION */}
                    <ComponentCard title={locale === 'ko' ? `${cleanMetricNameValue} 차트` : `${cleanMetricNameValue} Chart`}>
                        {isQuantMode ? (
                            <>
                                <QuantAnalysisChart
                                    title={locale === 'ko' ? "비트코인 총합 퀀트 스코어링 (Time-Series)" : "Bitcoin Total Quant Score (Time-Series)"}
                                    height={600}
                                    showExporting={true}
                                    onTimeRangeChange={(min, max) => setQuantTimeRange({ min, max })}
                                />
                                <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-8">
                                    <QuantComponentsChart
                                        title={locale === 'ko' ? "기간별 지표 평균 분포 (Gauge Columns)" : "Indicator Average Distribution (Selected Period)"}
                                        height={450}
                                        showExporting={true}
                                        timeRange={quantTimeRange}
                                    />
                                </div>
                            </>
                        ) : isCycleComparisonMode ? (
                            <CycleComparisonChart
                                title={locale === 'ko' ? "비트코인 사이클 비교 (저점 대비 고점)" : "Bitcoin Cycle Comparison (Low to High)"}
                                height={600}
                                showRangeSelector={true}
                                showExporting={true}
                            />
                        ) : (
                            <HalvingChart
                                title={locale === 'ko' ? "비트코인 반감기 가격 분석" : "Bitcoin Halving Price Analysis"}
                                height={600}
                                showRangeSelector={true}
                                showExporting={true}
                                locale={locale}
                            />
                        )}
                    </ComponentCard>

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

                    {/* ANALYSIS INFO SECTION */}
                    <ComponentCard title={locale === 'ko' ? `${cleanMetricNameValue} 분석 정보` : `${cleanMetricNameValue} Analysis Information`}>
                        <div className={`grid grid-cols-1 ${!hasPostContent ? 'md:grid-cols-2' : ''} gap-6`}>
                            {/* Left Column: Description */}
                            {!hasPostContent && (
                                <div>
                                    <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">
                                        {locale === 'ko' ? `${cleanMetricNameValue}란?` : `What is ${cleanMetricNameValue}?`}
                                    </h4>
                                    <p className="text-sm text-gray-500 leading-relaxed dark:text-gray-400">
                                        {descriptionText || (locale === 'ko'
                                            ? '비트코인의 반감기와 가격 사이클을 분석하여 시장의 장기적인 추세를 파악할 수 있습니다.'
                                            : 'analyze Bitcoin halving and price cycles to understand long-term market trends.')
                                        }
                                    </p>
                                </div>
                            )}

                            {/* Right Column: Interpretation */}
                            <div>
                                <h4 className="font-medium mb-3 text-gray-900 dark:text-gray-100">
                                    {isQuantMode 
                                        ? (locale === 'ko' ? '스코어링 기준 안내' : 'Scoring Legend')
                                        : (isCycleComparisonMode
                                            ? (locale === 'ko' ? '사이클 기간 정보' : 'Cycle Duration Information')
                                            : (locale === 'ko' ? '반감기 정보' : 'Halving Information'))}
                                </h4>

                                {isQuantMode ? (
                                    <div className="space-y-2">
                                        {[
                                            { color: 'bg-red-500', label: locale === 'ko' ? '80-100: 과매수 (위험)' : '80-100: Overbought' },
                                            { color: 'bg-orange-400', label: locale === 'ko' ? '60-80: 분산 (주의)' : '60-80: Distribution' },
                                            { color: 'bg-gray-400', label: locale === 'ko' ? '40-60: 중립' : '40-60: Neutral' },
                                            { color: 'bg-blue-400', label: locale === 'ko' ? '20-40: 축적 (매수)' : '20-40: Accumulation' },
                                            { color: 'bg-green-500', label: locale === 'ko' ? '0-20: 과매도 (기회)' : '0-20: Oversold' },
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                                                <span className="text-gray-600 dark:text-gray-400 font-medium">{item.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : isCycleComparisonMode ? (
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
                        </div>
                    </ComponentCard>

                    {/* History Table */}
                    <ComponentCard title={locale === 'ko' ? "비트코인 과거 데이터" : "Bitcoin Historical Data"}>
                        <HistoryTable
                            assetIdentifier="BTCUSDT"
                            initialInterval="1d"
                            showVolume={true}
                            showChangePercent={true}
                            height={400}
                        />
                    </ComponentCard>
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

export default OnChainHalvingView
