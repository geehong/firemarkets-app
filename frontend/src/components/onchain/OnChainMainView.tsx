"use client"

import React, { useState, useEffect } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useOnchain, useOnchainMetrics, useOnchainDashboard } from '@/hooks/useOnchain'

import { usePostBySlug } from '@/hooks/data/usePosts'
import ComponentCard from '@/components/common/ComponentCard'
import AdminDataInspector from '@/components/common/AdminDataInspector'
import { useAuth } from '@/hooks/auth/useAuthNew'
import Alert from '@/components/ui/alert/Alert'
import dynamic from 'next/dynamic'
import { TimeIcon } from '@/icons'
import { parseLocalized } from '@/utils/parseLocalized'
import OnChainTemplateView from '@/components/template/onchain/OnChainTemplateView'

// Prop interfaces for dynamic components to fix TS errors
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

interface HalvingChartProps {
    title?: string;
    height: number;
    showRangeSelector?: boolean;
    showExporting?: boolean;
    singlePeriod?: number | null;
}

interface CycleComparisonChartProps {
    title?: string;
    height?: number;
    showRangeSelector?: boolean;
    showExporting?: boolean;
}

interface HistoryTableProps {
    assetIdentifier?: string;
    initialInterval?: '1d' | '1m' | '1w';
    showVolume?: boolean;
    showChangePercent?: boolean;
    height?: number;
}


const OnChainChart = dynamic<OnChainChartProps>(() => import('@/components/charts/onchaincharts/OnChainChart'), { ssr: false })
const HalvingChart = dynamic<HalvingChartProps>(() => import('@/components/charts/onchaincharts/HalvingChart'), { ssr: false })
const CycleComparisonChart = dynamic<CycleComparisonChartProps>(() => import('@/components/charts/onchaincharts/CycleComparisonChart'), { ssr: false })
const HistoryTable = dynamic<HistoryTableProps>(() => import('@/components/tables/HistoryTable'), { ssr: false })

interface OnChainMainViewProps {
    className?: string
    initialMetrics?: any[]
    initialMetricConfig?: any
    locale?: string
}

const OnChainMainView: React.FC<OnChainMainViewProps> = ({ className, initialMetrics, locale = 'en' }) => {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const router = useRouter()
    const { isAdmin } = useAuth()
    const [metricId, setMetricId] = useState<string | null>(null)
    const [isHalvingMode, setIsHalvingMode] = useState(false)
    const [isCycleComparisonMode, setIsCycleComparisonMode] = useState(false)
    const [isDashboardView, setIsDashboardView] = useState(false)

    useEffect(() => {
        if (!pathname) return;

        const pathParts = pathname.split('/')
        const lastPart = pathParts[pathParts.length - 1];
        const searchMetric = searchParams?.get('metric');

        let calculatedMetricId = null;
        let _isDashboard = false;

        // Check modes first
        const _isHalving = pathname.includes('/onchain/halving/halving-bull-chart') || lastPart === 'halving-bull-chart' || (searchParams?.get('halving') === 'true');
        const _isCycle = pathname.includes('/onchain/halving/cycle-comparison') || lastPart === 'cycle-comparison';

        if (_isHalving || _isCycle) {
            calculatedMetricId = lastPart;
        } else if (lastPart === 'onchain' || lastPart === 'halving' || !lastPart) {
            calculatedMetricId = searchMetric || null;
            _isDashboard = !searchMetric;
        } else {
            calculatedMetricId = lastPart;
        }

        setMetricId(calculatedMetricId);
        setIsHalvingMode(_isHalving);
        setIsCycleComparisonMode(_isCycle);
        setIsDashboardView(_isDashboard);

    }, [pathname, searchParams]);

    // Post slug 결정
    const postSlug = isCycleComparisonMode ? 'cycle-comparison' : (isHalvingMode ? 'halving-bull-chart' : (metricId || ''))

    // 온체인 메트릭 목록 및 데이터
    const { metrics, loading: metricsLoading, error: metricsError } = useOnchainMetrics({ initialData: initialMetrics })

    // 대시보드 요약 정보 (전체 수, 개수 등)
    const { data: dashboardData, loading: dashboardLoading } = useOnchainDashboard('BTCUSDT')

    // 데이터 요청 (Halving 모드는 데이터 요청 안함)
    const safeMetricId = (isHalvingMode || isCycleComparisonMode) ? undefined : (metricId || undefined)
    const { data: onchainData, loading: dataLoading, error: dataError } = useOnchain(safeMetricId, '1y')

    // 해당 메트릭의 포스트 가져오기
    const { data: postData, isLoading: postLoading, error: postError } = usePostBySlug(postSlug || undefined)

    // 메트릭 이름 정리
    const cleanMetricName = (name: string) => {
        if (!name) return name
        return name.replace(/\s*\([^)]*\)/g, '')
    }

    // 현재 메트릭 설정 (Fallback 포함)
    const metricConfig = metrics.find((m: any) => m.id === metricId) || {
        name: isCycleComparisonMode ? 'Bitcoin Cycle Comparison' : (isHalvingMode ? 'Bitcoin Halving' : (locale === 'ko' ? '온체인 지표 대시보드' : 'On-Chain Metrics Dashboard')),
        description: '',
        loadingText: 'Loading data...',
        title: undefined,
        data_count: 0
    }

    const cleanMetricNameValue = isCycleComparisonMode
        ? 'Bitcoin Cycle Comparison'
        : (isHalvingMode
            ? 'Bitcoin Halving'
            : (metricConfig.name === 'On-Chain Metrics Dashboard' || metricConfig.name === '온체인 지표 대시보드' ? metricConfig.name : cleanMetricName(metricConfig.name)))

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
            : (isDashboardView ? (locale === 'ko' ? '비트코인 온체인 지표 대시보드' : 'Bitcoin On-chain Metrics Dashboard') : `Bitcoin onchain metrics correlation with price movements`);
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
            value={metricId || ''}
            onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                    router.push(`/${locale}/admin/onchain`);
                    return;
                }
                const parts = pathname.split('/');
                const lastPart = parts[parts.length - 1];
                if (lastPart === 'onchain') {
                    router.push(`${pathname}/${val}`);
                } else {
                    parts[parts.length - 1] = val;
                    router.push(parts.join('/'));
                }
            }}
            className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 text-sm"
        >
            <option value="">{locale === 'ko' ? '-- 메트릭 선택 --' : '-- Select Metric --'}</option>
            {metrics.map((metric: any) => (
                <option key={metric.id} value={metric.id}>
                    {cleanMetricName(metric.name)} {metric.data_count ? `(${metric.data_count})` : ''}
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
                    {/* DASHBOARD VIEW: 목록 및 요약 정보 */}
                    {isDashboardView ? (
                        <div className="space-y-6">
                            {/* Dashboard Summary Row */}
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

                            {/* Dashboard Guide */}
                            <div className="mt-8 p-10 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800/50 text-center">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                                    {locale === 'ko' ? '비트코인 온체인 데이터 분석' : 'Bitcoin On-Chain Data Analysis'}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                                    {locale === 'ko'
                                        ? '다양한 온체인 지표를 통해 비트코인의 네트워크 상태와 시장의 심리를 파악할 수 있습니다. 위 카드들 중 하나를 선택하여 상세 차트와 분석 내용을 확인하세요.'
                                        : 'Analyze Bitcoin\'s network health and market sentiment through various on-chain metrics. Select one of the cards above to view detailed charts and analysis.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* DETAIL VIEW: 상세 차트 및 분석 정보 */
                        <>
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
                                                metricId={metricId || undefined}
                                                metricName={cleanMetricNameValue}
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
        <OnChainTemplateView
            locale={locale}
            cleanMetricNameValue={cleanMetricNameValue}
            description={headerDescription}
            actions={metricSelector}
            tabs={tabs}
        />
    )
}

export default OnChainMainView
