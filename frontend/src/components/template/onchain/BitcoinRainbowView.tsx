"use client"

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { usePostBySlug } from '@/hooks/data/usePosts'
import ComponentCard from '@/components/common/ComponentCard'
import AdminDataInspector from '@/components/common/AdminDataInspector'
import { useAuth } from '@/hooks/auth/useAuthNew'
import { parseLocalized } from '@/utils/parseLocalized'
import OnChainTemplateView from '@/components/template/onchain/OnChainTemplateView'

const BitcoinRainbowChart = dynamic(() => import('@/components/charts/onchaincharts/BitcoinRainbowChart'), { ssr: false })
const HistoryTable = dynamic(() => import('@/components/tables/HistoryTable'), { ssr: false })

interface BitcoinRainbowViewProps {
    locale: string
}

const BitcoinRainbowView: React.FC<BitcoinRainbowViewProps> = ({ locale }) => {
    const { isAdmin } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    const postSlug = 'rainbow-chart'
    const { data: postData, isLoading: postLoading, error: postError } = usePostBySlug(postSlug)
    const hasPostContent = !!(postData && ((postData as any).content || (postData as any).content_ko));

    const cleanMetricNameValue = locale === 'ko' ? '비트코인 레인보우 차트' : 'Bitcoin Rainbow Chart'
    const headerDescription = locale === 'ko' 
        ? '로그 회귀 모델을 통한 비트코인의 장기 시장 주기 분석' 
        : 'Long-term market cycle analysis of Bitcoin using logarithmic regression'

    const handleMetricChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (!val) return;
        const parts = pathname?.split('/') || [];
        const onchainIndex = parts.indexOf('onchain');
        if (onchainIndex !== -1) {
            router.push(`/${locale}/admin/onchain/halving/${val}`);
        }
    };

    const metricSelector = (
        <select
            value="rainbow-chart"
            onChange={handleMetricChange}
            className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 text-sm"
        >
            <option value="halving-bull-chart">
                {locale === 'ko' ? '비트코인 반감기' : 'Bitcoin Halving'}
            </option>
            <option value="cycle-comparison">
                {locale === 'ko' ? '비트코인 사이클 비교' : 'Bitcoin Cycle Comparison'}
            </option>
            <option value="quant-analysis">
                {locale === 'ko' ? '비트코인 퀀트 분석' : 'Bitcoin Quant Analysis'}
            </option>
            <option value="rainbow-chart">
                {locale === 'ko' ? '비트코인 레인보우 차트' : 'Bitcoin Rainbow Chart'}
            </option>
        </select>
    );

    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            content: (
                <div className="space-y-6">
                    <BitcoinRainbowChart 
                        title={locale === 'ko' ? '비트코인 레인보우 차트 (V2)' : 'Bitcoin Rainbow Chart (V2)'} 
                        height={600} 
                    />

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

                    <ComponentCard title={locale === 'ko' ? '레인보우 차트 해석' : 'How to read the Rainbow Chart'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-800 dark:text-slate-200">
                                    {locale === 'ko' ? '컬러 밴드 의미' : 'Band Meanings'}
                                </h4>
                                <div className="space-y-2">
                                    {[
                                        { color: '#FF0000', label: locale === 'ko' ? '최대 버블 영역 (Max Bubble)' : 'Max Bubble' },
                                        { color: '#E60000', label: locale === 'ko' ? '매도 심화 (Sell Seriously)' : 'Sell Seriously' },
                                        { color: '#FF8C00', label: locale === 'ko' ? '포모 영역 (FOMO)' : 'FOMO' },
                                        { color: '#FFA500', label: locale === 'ko' ? '버블 논란 (Is this a Bubble?)' : 'Is this a Bubble?' },
                                        { color: '#FFFF00', label: locale === 'ko' ? '홀딩! (HODL!)' : 'HODL!' },
                                        { color: '#9ACD32', label: locale === 'ko' ? '저평가 (Still Cheap)' : 'Still Cheap' },
                                        { color: '#008000', label: locale === 'ko' ? '매집 구간 (Accumulate)' : 'Accumulate' },
                                        { color: '#00CED1', label: locale === 'ko' ? '강력 매수 (BUY!)' : 'BUY!' },
                                        { color: '#0000FF', label: locale === 'ko' ? '바닥 구간 (Fire Sale)' : 'Fire Sale' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded shadow-sm" style={{ backgroundColor: item.color }} />
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-4 leading-relaxed">
                                <p>
                                    {locale === 'ko' 
                                        ? '비트코인 레인보우 차트는 시간을 선형이 아닌 로그 스케일로 표시하여 장기적인 가격 추세를 분석합니다. 무지개색 밴드는 비트코인의 내재적 가치 성장 곡선을 추적하며, 현재 가격이 역사적 맥락에서 어느 위치에 있는지를 보여줍니다.'
                                        : 'The Bitcoin Rainbow Chart uses a logarithmic scale to analyze long-term price trends. Each colored band tracks bitcion\'s intrinsic value growth curve, showing where the current price sits in a historical context.'}
                                </p>
                                <p>
                                    {locale === 'ko'
                                        ? '차트의 붉은 계열은 시장의 과열과 거품을 나타내며, 푸른 계열은 역사적인 저평가 및 매수 기회를 의미합니다. 중앙의 노란색(HODL!) 구간은 시장이 균형을 이루고 있음을 시사합니다.'
                                        : 'Warm colors indicate market overheating and bubbles, while cool colors represent historical undervaluation and buying opportunities. The central yellow (HODL!) band suggests the market is in balance.'}
                                </p>
                            </div>
                        </div>
                    </ComponentCard>

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
                <AdminDataInspector
                    data={postData}
                    isLoading={postLoading}
                    error={postError}
                    title={`${cleanMetricNameValue} - Raw Data`}
                    locale={locale}
                />
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

export default BitcoinRainbowView
