"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { getColorMode } from '@/constants/colorModes';

interface QuantComponentsChartProps {
    title?: string;
    height?: number;
    showExporting?: boolean;
    // external fallback if needed
    timeRange?: { min: number; max: number } | null;
}

const METRICS_MAP = [
    { key: 'mvrv_z', label: 'MVRV Z-Score' },
    { key: 'mvrv', label: 'MVRV Ratio' },
    { key: 'nupl', label: 'Net Unrealized P/L' },
    { key: 'sth_nupl', label: 'STH NUPL' },
    { key: 'lth_nupl', label: 'LTH NUPL' },
    { key: 'puell', label: 'Puell Multiple' },
    { key: 'rhodl', label: 'RHODL Ratio' },
    { key: 'reserve_risk', label: 'Reserve Risk' },
];

const QuantComponentsChart: React.FC<QuantComponentsChartProps> = ({
    title = 'Quant Scoring Engine Dashboard',
    height = 600,
    showExporting = true,
    timeRange: externalTimeRange
}) => {
    const [colorMode] = useState<'dark' | 'vivid' | 'high-contrast' | 'simple'>('vivid');
    const [isClient, setIsClient] = useState(false);
    
    const [internalTimeRange, setInternalTimeRange] = useState<{ min: number; max: number } | null>(null);

    const [HighchartsReact, setHighchartsReact] = useState<any>(null);
    const [Highcharts, setHighcharts] = useState<any>(null);

    const chartRef = useRef<any>(null);

    useEffect(() => {
        const loadHighcharts = async () => {
            try {
                const [
                    HighchartsReactComponentModule,
                    HighchartsCoreModule
                ] = await Promise.all([
                    import('highcharts-react-official'),
                    import('highcharts/highstock')
                ]);

                const HighchartsReactComponent = HighchartsReactComponentModule.default || HighchartsReactComponentModule;
                const HighchartsCore = HighchartsCoreModule.default || HighchartsCoreModule;

                if (!HighchartsCore) {
                    throw new Error('Highcharts Core could not be loaded');
                }

                // Highcharts 모듈들 로드 및 초기화
                const moduleImports = await Promise.all([
                    import('highcharts/modules/stock'),
                    import('highcharts/modules/exporting'),
                    import('highcharts/modules/accessibility'),
                    import('highcharts/modules/navigator')
                ]);

                // 각 모듈 초기화 (CJS/ESM 공통 대응)
                moduleImports.forEach((mod) => {
                    const init = mod.default || mod;
                    if (typeof init === 'function') {
                        (init as any)(HighchartsCore);
                    }
                });

                setHighchartsReact(() => HighchartsReactComponent);
                setHighcharts(HighchartsCore);
                setIsClient(true);
            } catch (error) {
                console.error('Failed to load Highcharts:', error);
            }
        };

        loadHighcharts();
    }, []);

    const { data: quantData, isLoading } = useQuery({
        queryKey: ['bitcoin', 'quant-timeseries'],
        queryFn: async () => {
             return await apiClient.request('/crypto/bitcoin/quant-timeseries');
        },
        staleTime: 1000 * 60 * 60 // 1 hour
    });

    const activeTimeRange = internalTimeRange || externalTimeRange;

    const chartOptions = useMemo(() => {
        if (!quantData || !quantData.timeseries_data || !Highcharts) return {};

        const currentColors = getColorMode(colorMode);
        const data = quantData.timeseries_data;

        // 1. Prepare raw time-series data for Bitcoin Line Chart
        const btcPriceData: [number, number][] = [];
        data.forEach((point: any) => {
            const timestamp = new Date(point.date).getTime();
            if (!isNaN(timestamp) && point.price !== undefined) {
                btcPriceData.push([timestamp, point.price]);
            }
        });
        btcPriceData.sort((a, b) => a[0] - b[0]);

        // 2. Filter data for the active time range to calculate Current Averages
        let filteredData = data;
        let periodLabel = 'All-Time';
        
        if (activeTimeRange && activeTimeRange.min && activeTimeRange.max) {
             const rangeMs = activeTimeRange.max - activeTimeRange.min;
             const days = Math.round(rangeMs / (1000 * 60 * 60 * 24));
             if (days <= 7) periodLabel = '1 Week';
             else if (days <= 31) periodLabel = '1 Month';
             else if (days <= 93) periodLabel = '3 Months';
             else if (days <= 186) periodLabel = '6 Months';
             else if (days <= 366) periodLabel = '1 Year';
             else if (days <= 1461) periodLabel = '4 Years';
             else periodLabel = `Selected (${days} Days)`;

             filteredData = data.filter((point: any) => {
                 const t = new Date(point.date).getTime();
                 return t >= activeTimeRange.min && t <= activeTimeRange.max;
             });
        }
        
        if (filteredData.length === 0) filteredData = data;

        // 3. Initialize sum arrays dynamically for the averages
        const metricsSumScore: Record<string, number> = {};
        const metricsSumRaw: Record<string, number> = {};
        const metricsCount: Record<string, number> = {};
        
        let sumTotalScore = 0;
        let countTotalScore = 0;

        METRICS_MAP.forEach(m => {
            metricsSumScore[m.key] = 0;
            metricsSumRaw[m.key] = 0;
            metricsCount[m.key] = 0;
        });

        filteredData.forEach((point: any) => {
            if (point.normalized_score !== undefined && point.normalized_score !== null) {
                sumTotalScore += point.normalized_score;
                countTotalScore++;
            }
            
            METRICS_MAP.forEach(m => {
                if (point.score_components && point.score_components[m.key] !== undefined) {
                    metricsSumScore[m.key] += point.score_components[m.key];
                    metricsCount[m.key]++;
                    
                    if (point.raw_components && point.raw_components[m.key] !== undefined && point.raw_components[m.key] !== null) {
                        metricsSumRaw[m.key] += point.raw_components[m.key];
                    } else {
                        metricsSumRaw[m.key] += point.score_components[m.key];
                    }
                }
            });
        });

        const activeMin = activeTimeRange?.min || (btcPriceData.length > 0 ? btcPriceData[0][0] : 0);
        const activeMax = activeTimeRange?.max || (btcPriceData.length > 0 ? btcPriceData[btcPriceData.length - 1][0] : 1);
        const timeSpan = activeMax - activeMin;
        const bucketWidth = timeSpan / 9; // 9 indicators total

        const getCustomGradient = (scoreAvg: number) => {
            const centerStop = Math.max(0.01, Math.min(0.99, scoreAvg / 100));
            return {
                linearGradient: { x1: 0, y1: 1, x2: 0, y2: 0 },
                stops: [
                    [0, '#3498db'],          // Deep Blue at Bottom
                    [centerStop, '#fdfd96'], // Yellow/White at the exact Average
                    [1, '#e74c3c']           // Deep Red at Top
                ]
            };
        };

        const avgTotalScore = countTotalScore > 0 ? (sumTotalScore / countTotalScore) : 0;

        const scatterData: any[] = [];
        const dynamicPlotBands: any[] = [];
        const customTickPositions: number[] = [];
        const customTickLabels: Record<number, string> = {};

        // Add 1. Total Score
        const totalScoreX = activeMin + (bucketWidth * 0.5);
        customTickPositions.push(totalScoreX);
        customTickLabels[totalScoreX] = 'Total Score';

        dynamicPlotBands.push({
            from: activeMin,
            to: activeMin + bucketWidth,
            color: getCustomGradient(avgTotalScore),
        });
        scatterData.push({
            x: totalScoreX,
            y: avgTotalScore,
            dataLabels: { format: '{y:.1f}' }
        });

        // Add the rest of the metrics dynamically
        METRICS_MAP.forEach((m, idx) => {
            const count = metricsCount[m.key];
            const avgScore = count > 0 ? (metricsSumScore[m.key] / count) : 50;
            const avgRaw = count > 0 ? (metricsSumRaw[m.key] / count) : 0;
            
            const bucketFrom = activeMin + (bucketWidth * (idx + 1));
            const bucketTo = activeMin + (bucketWidth * (idx + 2));
            const bucketCenterX = bucketFrom + (bucketWidth * 0.5);

            customTickPositions.push(bucketCenterX);
            customTickLabels[bucketCenterX] = m.label;

            dynamicPlotBands.push({
                from: bucketFrom,
                to: bucketTo,
                color: getCustomGradient(avgScore),
            });

            scatterData.push({
                x: bucketCenterX,
                y: avgScore,
                dataLabels: { formatter: function(this: any) { return avgRaw.toFixed(3); } }
            });
        });

        return {
            chart: {
                height: height,
                backgroundColor: 'transparent',
                style: { fontFamily: 'inherit' },
                zooming: {
                    type: 'xy'
                }
            },
            title: { 
                text: `${periodLabel} Dynamic Background Averages Dashboard`,
                style: { color: currentColors.coin, fontSize: '15px', fontWeight: 'bold' } 
            },
            navigator: { 
                enabled: true,
                xAxis: { labels: { enabled: true } }, 
                baseSeries: 'btc-price' 
            },
            rangeSelector: {
                selected: 5,
                buttons: [
                    { type: 'month', count: 1, text: '1m' },
                    { type: 'month', count: 3, text: '3m' },
                    { type: 'month', count: 6, text: '6m' },
                    { type: 'ytd', text: 'YTD' },
                    { type: 'year', count: 1, text: '1y' },
                    { type: 'year', count: 4, text: '4y' },
                    { type: 'all', text: 'All' }
                ],
            },
            tooltip: { shared: false },

            xAxis: {
                type: 'datetime',
                min: activeTimeRange?.min, // Ensure React state strictly controls standard display
                max: activeTimeRange?.max,
                crosshair: true,
                plotBands: dynamicPlotBands, // This magically renders our 9 colored columns in the background!
                tickPositions: customTickPositions,
                labels: {
                    style: { fontSize: '12px', fontWeight: 'bold', color: currentColors.coin },
                    formatter: function(this: any) {
                        return customTickLabels[this.value] || '';
                    }
                },
                events: {
                    setExtremes: function(e: any) {
                        // Highcharts trigger e.min / e.max undefined on "All" button or full reset
                        if (e.min !== undefined && e.max !== undefined) {
                            setTimeout(() => setInternalTimeRange({ min: e.min, max: e.max }), 0);
                        } else if (e.trigger === 'rangeSelectorButton') {
                            setTimeout(() => setInternalTimeRange(null), 0); // fallback all
                        }
                    }
                }
            },

            yAxis: [
                {
                    min: 0,
                    max: 100,
                    title: { text: null },
                    labels: { enabled: false },
                    gridLineWidth: 0,
                },
                {
                    type: 'logarithmic',
                    title: { text: 'Bitcoin Price (USD)' },
                    opposite: false,
                    gridLineWidth: 1,
                    labels: {
                        style: { color: currentColors.coin, fontWeight: 'bold' },
                        formatter: function(this: any) { return '$' + this.value.toLocaleString(); }
                    }
                }
            ],

            series: [
                {
                    type: 'line',
                    id: 'btc-price',
                    name: 'BTC Price',
                    xAxis: 0,
                    yAxis: 1,
                    data: btcPriceData,
                    color: '#ffffff', // High contrast white above the colorful plotbands
                    lineWidth: 3,
                    shadow: true,
                    tooltip: { valueDecimals: 2, valuePrefix: '$' },
                    zIndex: 5,
                },
                {
                    type: 'scatter',
                    name: 'Indicator Averages',
                    xAxis: 0,
                    yAxis: 0,
                    data: scatterData,
                    marker: { symbol: 'diamond', radius: 6, fillColor: '#000000' },
                    dataLabels: {
                        enabled: true,
                        y: -15,
                        style: {
                            fontWeight: 'bold',
                            fontSize: '15px',
                            color: currentColors.coin,
                            textOutline: '3px white'
                        }
                    },
                    showInLegend: false,
                    enableMouseTracking: false,
                    zIndex: 3,
                }
            ],
            credits: { enabled: false },
            exporting: { enabled: showExporting },
            accessibility: { enabled: false }
        };
    }, [quantData, Highcharts, height, colorMode, activeTimeRange, showExporting, activeTimeRange]);

    if (!isClient || !HighchartsReact || !Highcharts) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: `${height}px` }}>
                <span className="ms-3">Loading Hybrid Dashboard...</span>
            </div>
        );
    }

    if (isLoading) {
         return <div className="d-flex justify-content-center align-items-center" style={{ height: `${height}px` }}><span className="ms-3">Fetching Bitcoin Macros...</span></div>;
    }

    return (
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm w-full">
            <div className="flex justify-between items-center mb-0">
                <h5 className="mb-0 font-bold text-lg">{title}</h5>
            </div>
            <div style={{ height: `${height}px`, width: '100%' }}>
                <HighchartsReact
                    highcharts={Highcharts}
                    constructorType={'stockChart'} // Enables Navigator seamlessly attached to X Axis 0
                    options={chartOptions}
                    ref={chartRef}
                />
            </div>
        </div>
    );
};

export default QuantComponentsChart;
