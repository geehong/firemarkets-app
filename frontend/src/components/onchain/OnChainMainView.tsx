"use client"

import React, { useState, useEffect } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import OnChainPriceView from '@/components/template/onchain/OnChainPriceView'
import OnChainHalvingView from '@/components/template/onchain/OnChainHalvingView'

interface OnChainMainViewProps {
    className?: string
    initialMetrics?: any[]
    initialMetricConfig?: any
    locale?: string
}

const OnChainMainView: React.FC<OnChainMainViewProps> = ({ className, initialMetrics, locale = 'en' }) => {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const [metricId, setMetricId] = useState<string | null>(null)
    const [isHalvingMode, setIsHalvingMode] = useState(false)
    const [isCycleComparisonMode, setIsCycleComparisonMode] = useState(false)
    const [isQuantMode, setIsQuantMode] = useState(false)
    const [isDashboardView, setIsDashboardView] = useState(false)
    const [fullPath, setFullPath] = useState<string>('')

    useEffect(() => {
        if (!pathname) return;
        setFullPath(pathname);

        const pathParts = pathname.split('/')
        const lastPart = pathParts[pathParts.length - 1];
        const searchMetric = searchParams?.get('metric');

        let calculatedMetricId = null;
        let _isDashboard = false;

        // Check modes first
        const _isHalving = pathname.includes('/onchain/halving/halving-bull-chart') || lastPart === 'halving-bull-chart' || (searchParams?.get('halving') === 'true');
        const _isCycle = pathname.includes('/onchain/halving/cycle-comparison') || lastPart === 'cycle-comparison';
        const _isQuant = pathname.includes('/onchain/halving/quant-analysis') || lastPart === 'quant-analysis';

        if (_isHalving || _isCycle || _isQuant) {
            calculatedMetricId = lastPart;
        } else if (lastPart === 'onchain' || lastPart === 'halving' || !lastPart) {
            calculatedMetricId = searchMetric || null;
            _isDashboard = !searchMetric;
        } else if (pathname.includes('/onchain/price/close/daily')) {
            calculatedMetricId = 'close-daily';
        } else if (pathname.includes('/onchain/price/close/intraday')) {
            calculatedMetricId = 'close-intraday';
        } else if (pathname.includes('/onchain/price/ohlcv/daily')) {
            calculatedMetricId = 'ohlcv-daily';
        } else if (pathname.includes('/onchain/price/ohlcv/intraday')) {
            calculatedMetricId = 'ohlcv-intraday';
        } else if (pathname.includes('/onchain/analysis/')) {
            calculatedMetricId = 'analysis-' + lastPart;
        } else if (pathname.includes('/onchain/price/')) {
            // New price sub-items (live, moving-averages, capitalization, pi-cycle)
            calculatedMetricId = lastPart;
        } else {
            calculatedMetricId = lastPart;
        }

        setMetricId(calculatedMetricId);
        setIsHalvingMode(_isHalving);
        setIsCycleComparisonMode(_isCycle);
        setIsQuantMode(_isQuant);
        setIsDashboardView(_isDashboard);

    }, [pathname, searchParams]);

    // Route to appropriate sub-view
    if (isHalvingMode || isCycleComparisonMode || isQuantMode) {
        return (
            <OnChainHalvingView
                locale={locale}
                isCycleComparisonMode={isCycleComparisonMode}
                isHalvingMode={isHalvingMode}
                isQuantMode={isQuantMode}
            />
        )
    }

    return (
        <OnChainPriceView
            locale={locale}
            metricId={metricId}
            fullPath={fullPath}
            isDashboardView={isDashboardView}
            initialMetrics={initialMetrics}
            pathname={pathname || ''}
        />
    )
}

export default OnChainMainView
