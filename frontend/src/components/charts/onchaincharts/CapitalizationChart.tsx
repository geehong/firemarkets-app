"use client"

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import ChartControls from '@/components/common/ChartControls';
import { getColorMode } from '@/constants/colorModes';

interface CapitalizationChartProps {
    assetId?: string;
    title?: string;
    height?: number;
    showRangeSelector?: boolean;
    showStockTools?: boolean;
    showExporting?: boolean;
    locale?: string;
}

const CapitalizationChart: React.FC<CapitalizationChartProps> = ({
    assetId = 'BTCUSDT',
    title = 'Capitalization Metrics',
    height = 600,
    showRangeSelector = true,
    showStockTools = false,
    showExporting = true,
    locale = 'en'
}) => {
    const [isClient, setIsClient] = useState(false);
    const [HighchartsReact, setHighchartsReact] = useState<any>(null);
    const [Highcharts, setHighcharts] = useState<any>(null);
    const chartRef = useRef<any>(null);

    const [chartType, setChartType] = useState<'line' | 'spline' | 'area' | 'areaspline'>('line');
    const [useLogScale, setUseLogScale] = useState(true);
    const [isAreaMode, setIsAreaMode] = useState(false);
    const [lineSplineMode, setLineSplineMode] = useState<'line' | 'spline'>('line');
    const [colorMode, setColorMode] = useState<'dark' | 'vivid' | 'high-contrast' | 'simple'>('vivid');
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    const [timeRange, setTimeRange] = useState<'1y' | 'all'>('all');

    const [priceData, setPriceData] = useState<number[][]>([]);
    const [marketCapData, setMarketCapData] = useState<number[][]>([]);
    const [realizedCapData, setRealizedCapData] = useState<number[][]>([]);
    const [thermoCapData, setThermoCapData] = useState<number[][]>([]);
    const [investorCapData, setInvestorCapData] = useState<number[][]>([]);

    // 클라이언트 사이드에서 Highcharts 동적 로드
    useEffect(() => {
        const loadHighcharts = async () => {
            try {
                const [
                    { default: HighchartsReactComponent },
                    { default: HighchartsCore }
                ] = await Promise.all([
                    import('highcharts-react-official'),
                    import('highcharts/highstock')
                ])

                await Promise.all([
                    import('highcharts/modules/stock'),
                    import('highcharts/modules/exporting'),
                    import('highcharts/modules/accessibility'),
                    import('highcharts/modules/drag-panes'),
                    import('highcharts/modules/navigator')
                ])

                setHighchartsReact(() => HighchartsReactComponent)
                setHighcharts(HighchartsCore)
                setIsClient(true)
            } catch (err) {
                console.error('Failed to load Highcharts:', err)
            }
        }
        loadHighcharts()
    }, [])

    // 모바일 감지
    useEffect(() => {
        if (!isClient) return
        const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, [isClient]);

    // Data Fetching
    const fetchOptions = {
        limit: timeRange === 'all' ? 50000 : 365,
        time_range: timeRange === 'all' ? undefined : timeRange
    };

    const { data: mcData, isLoading: isMCLoading } = useQuery({
        queryKey: ['onchain', assetId, 'market_cap', timeRange],
        queryFn: () => apiClient.getOnchainMetricsData(assetId, 'market_cap', fetchOptions),
        staleTime: 10 * 60 * 1000,
    });

    const { data: rcData, isLoading: isRCLoading } = useQuery({
        queryKey: ['onchain', assetId, 'realized_cap', timeRange],
        queryFn: () => apiClient.getOnchainMetricsData(assetId, 'realized_cap', fetchOptions),
        staleTime: 10 * 60 * 1000,
    });

    const { data: tcData, isLoading: isTCLoading } = useQuery({
        queryKey: ['onchain', assetId, 'thermo_cap', timeRange],
        queryFn: () => apiClient.getOnchainMetricsData(assetId, 'thermo_cap', fetchOptions),
        staleTime: 10 * 60 * 1000,
    });

    const processSeries = (data: any, metricId: string) => {
        if (!data?.series) return { price: [], metric: [] };

        const dates = data.series.date || [];
        const prices = data.series.price || [];
        const metrics = data.series[metricId] || [];

        const formattedPrice: number[][] = [];
        const formattedMetric: number[][] = [];

        for (let i = 0; i < dates.length; i++) {
            const timestamp = new Date(dates[i].date).getTime();
            if (isNaN(timestamp)) continue;

            if (prices[i]?.close_price !== undefined) {
                formattedPrice.push([timestamp, parseFloat(prices[i].close_price)]);
            }

            const raw = metrics[i];
            const val = raw && typeof raw === 'object' && 'value' in raw ? raw.value : Number(raw);
            if (val !== undefined && val !== null && !isNaN(val)) {
                formattedMetric.push([timestamp, parseFloat(val)]);
            }
        }

        return {
            price: formattedPrice.sort((a, b) => a[0] - b[0]),
            metric: formattedMetric.sort((a, b) => a[0] - b[0])
        };
    };

    useEffect(() => {
        if (mcData?.series) {
            const mc = processSeries(mcData, 'market_cap');
            setPriceData(mc.price);
            setMarketCapData(mc.metric);
        }
        if (rcData?.series) {
            const rc = processSeries(rcData, 'realized_cap');
            setRealizedCapData(rc.metric);
        }
        if (tcData?.series) {
            const tc = processSeries(tcData, 'thermo_cap');
            setThermoCapData(tc.metric);
        }
    }, [mcData, rcData, tcData]);

    // Calculate Investor Cap
    useEffect(() => {
        if (realizedCapData.length > 0 && thermoCapData.length > 0) {
            const tcMap = new Map<number, number>(thermoCapData.map((p: number[]) => [p[0], p[1]]));
            const investorCap = realizedCapData.map(([ts, rcVal]) => {
                const tcVal = tcMap.get(ts);
                return tcVal !== undefined ? [ts, Math.max(0, rcVal - tcVal)] : null;
            }).filter((p): p is number[] => p !== null);
            setInvestorCapData(investorCap);
        }
    }, [realizedCapData, thermoCapData]);

    const handleLogScaleToggle = () => {
        setUseLogScale(!useLogScale);
        const chart = chartRef.current?.chart;
        if (chart) {
            chart.yAxis[0].update({ type: !useLogScale ? 'logarithmic' : 'linear' }, false);
            chart.yAxis[1].update({ type: !useLogScale ? 'logarithmic' : 'linear' }, false);
            chart.redraw();
        }
    };

    const handleAreaModeToggle = () => {
        const newAreaMode = !isAreaMode;
        setIsAreaMode(newAreaMode);
        const newType = newAreaMode ? (lineSplineMode === 'spline' ? 'areaspline' : 'area') : lineSplineMode;
        setChartType(newType);
    };

    const handleLineSplineToggle = (type: any) => {
        setLineSplineMode(type === 'spline' || type === 'areaspline' ? 'spline' : 'line');
        const newType = isAreaMode ? (type === 'spline' || type === 'areaspline' ? 'areaspline' : 'area') : (type === 'spline' || type === 'areaspline' ? 'spline' : 'line');
        setChartType(newType);
    };

    const chartOptions: any = {
        chart: {
            height,
            backgroundColor: '#ffffff',
            style: { fontFamily: 'Inter, system-ui, sans-serif' },
            zoomType: 'xy'
        },
        title: { text: null },
        xAxis: { type: 'datetime' },
        yAxis: [
            {
                title: { text: 'Bitcoin Price (USD)' },
                type: useLogScale ? 'logarithmic' : 'linear',
                opposite: false
            },
            {
                title: { text: 'Capitalization (USD)' },
                type: useLogScale ? 'logarithmic' : 'linear',
                opposite: true,
                labels: {
                    formatter: function (): string {
                        // @ts-ignore
                        const val = this.value;
                        if (val >= 1e12) return (val / 1e12).toFixed(1) + 'T';
                        if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B';
                        if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M';
                        return val;
                    }
                }
            }
        ],
        tooltip: { shared: true, valueDecimals: 0, valuePrefix: '$' },
        legend: { enabled: true },
        series: [
            {
                name: 'Bitcoin Price',
                data: priceData,
                type: chartType,
                yAxis: 0,
                color: '#d1d5db',
                lineWidth: 1,
                dashStyle: 'Dot',
                enableMouseTracking: false
            },
            {
                name: 'Market Cap',
                data: marketCapData,
                type: chartType,
                yAxis: 1,
                color: '#3b82f6',
                fillOpacity: 0.05
            },
            {
                name: 'Realized Cap',
                data: realizedCapData,
                type: chartType,
                yAxis: 1,
                color: '#f59e0b',
                lineWidth: 2
            },
            {
                name: 'Thermo Cap',
                data: thermoCapData,
                type: 'line',
                yAxis: 1,
                color: '#ef4444',
                lineWidth: 1,
                dashStyle: 'Dash'
            },
            {
                name: 'Investor Cap',
                data: investorCapData,
                type: chartType,
                yAxis: 1,
                color: '#10b981',
                lineWidth: 2
            }
        ],
        rangeSelector: {
            enabled: showRangeSelector && !isMobile,
            selected: timeRange === 'all' ? 1 : 0,
            buttons: [
                { type: 'year', count: 1, text: '1Y', events: { click: () => { setTimeRange('1y'); return false; } } },
                { type: 'all', text: 'All', events: { click: () => { setTimeRange('all'); return false; } } }
            ]
        },
        navigator: { enabled: showRangeSelector && !isMobile }
    };

    if (isMCLoading || isRCLoading || isTCLoading || !isClient || !Highcharts || !HighchartsReact) {
        return (
            <div className="bg-white rounded-lg p-6 flex items-center justify-center" style={{ height: `${height}px` }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                </div>
                <ChartControls
                    chartType={chartType}
                    onChartTypeChange={handleLineSplineToggle}
                    isAreaMode={isAreaMode}
                    onAreaModeToggle={handleAreaModeToggle}
                    useLogScale={useLogScale}
                    onLogScaleToggle={handleLogScaleToggle}
                    colorMode={colorMode}
                    onColorModeChange={setColorMode}
                    showFlagsButton={false}
                />
            </div>

            <HighchartsReact
                highcharts={Highcharts}
                constructorType={'stockChart'}
                options={chartOptions}
                ref={chartRef}
            />

            <div className="mt-8 space-y-6 text-sm text-gray-600 border-t border-gray-50 pt-6 px-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2">Market Capitalization (Market Cap)</h4>
                        <p className="leading-relaxed">
                            Total value of all Bitcoin units in circulation. Calculated by:
                            <code className="block bg-gray-50 p-2 rounded mt-1 text-blue-600 font-medium text-center">Current Price × Total Supply</code>
                            Provides a snapshot of Bitcoin's overall market value at any given time.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2">Realized Capitalization (Realized Cap)</h4>
                        <p className="leading-relaxed">
                            Indicates actual dollar flows into Bitcoin by valuing each coin at the price it was last moved on-chain.
                            <code className="block bg-gray-50 p-2 rounded mt-1 text-amber-600 font-medium text-center">∑ (Bitcoin Units × Last Transaction Price)</code>
                            Represents the aggregate cost basis of all holders.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2">Thermo Capitalization (Thermo Cap)</h4>
                        <p className="leading-relaxed">
                            Sum of all BTC mined at the prices they were at when mined (primary market cost).
                            <code className="block bg-gray-50 p-2 rounded mt-1 text-red-600 font-medium text-center">∑ (Block Issuance × Price at Mining)</code>
                            Reflects the cumulative historical cost of creating the Bitcoin supply.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 mb-2">Investor Capitalization</h4>
                        <p className="leading-relaxed">
                            Difference between Realized Cap and Thermo Cap, isolating secondary market value.
                            <code className="block bg-gray-50 p-2 rounded mt-1 text-emerald-600 font-medium text-center">Realized Cap - Thermo Cap</code>
                            Offers a clearer picture of value created through investor transactions rather than mining.
                        </p>
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="italic text-gray-700">
                        "Coins are revalued each time they are spent on-chain, creating an evolving realized valuation.
                        As defined by ARK Invest (Cointime Economics), Investor Cap represents the realized value created
                        by investor activity, excluding coinbase mining transactions."
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CapitalizationChart;
