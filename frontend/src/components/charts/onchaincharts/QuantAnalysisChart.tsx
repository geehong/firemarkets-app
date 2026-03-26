"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { getColorMode } from '@/constants/colorModes';

interface QuantAnalysisChartProps {
    title?: string;
    height?: number;
    showExporting?: boolean;
    onTimeRangeChange?: (min: number, max: number) => void;
}

const QuantAnalysisChart: React.FC<QuantAnalysisChartProps> = ({
    title = 'Bitcoin Quant Scoring Engine (Time-Series)',
    height = 650,
    showExporting = true,
    onTimeRangeChange
}) => {
    const [colorMode, setColorMode] = useState<'dark' | 'vivid' | 'high-contrast' | 'simple'>('vivid');
    const [isClient, setIsClient] = useState(false);
    const [HighchartsReact, setHighchartsReact] = useState<any>(null);
    const [Highcharts, setHighcharts] = useState<any>(null);
    const chartRef = useRef<any>(null);

    // Load Highcharts dynamically
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
                    import('highcharts/modules/drag-panes'),
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

    // Fetch Quant Timeseries Data
    const { data: quantData, isLoading, error } = useQuery({
        queryKey: ['bitcoin', 'quant-timeseries'],
        queryFn: async () => {
            console.log('[QuantChart] Fetching timeseries data...');
            try {
                const res = await apiClient.request('/crypto/bitcoin/quant-timeseries');
                console.log('[QuantChart] API Response:', res);
                return res;
            } catch (err) {
                console.error('[QuantChart] API Fetch Error:', err);
                throw err;
            }
        },
        staleTime: 1000 * 60 * 60 // 1 hour
    });

    const chartOptions = useMemo(() => {
        console.log('[QuantChart] getChartOptions called, quantData:', quantData);
        if (!quantData || !quantData.timeseries_data || !Highcharts) {
            console.log('[QuantChart] Skipping render due to missing data or Highcharts instance');
            return {};
        }

        const currentColors = getColorMode(colorMode);
        const data = quantData.timeseries_data;
        console.log(`[QuantChart] Processing ${data.length} data points...`);

        const priceData: [number, number][] = [];
        const scoreData: [number, number][] = [];
        const bottomThresholdData: [number, number][] = [];
        const topThresholdData: [number, number][] = [];
        const veryStrongBuyMarkers: any[] = [];
        const veryStrongSellMarkers: any[] = [];

        data.forEach((point: any) => {
            const timestamp = new Date(point.date).getTime();
            if (isNaN(timestamp)) return; // Skip invalid dates

            if (point.price !== undefined && point.price !== null) {
                priceData.push([timestamp, point.price]);
            }
            if (point.normalized_score !== undefined && point.normalized_score !== null) {
                scoreData.push([timestamp, point.normalized_score]);
            }
            if (point.thresholds?.bottom !== undefined) {
                bottomThresholdData.push([timestamp, point.thresholds.bottom]);
            }
            if (point.thresholds?.top !== undefined) {
                topThresholdData.push([timestamp, point.thresholds.top]);
            }

            // Add Markers (Flags) for Extreme Events based on confidence and signal
            if (point.signal === 'Extreme Buy' || (point.signal === 'Buy' && point.normalized_score < 10)) {
                veryStrongBuyMarkers.push({
                    x: timestamp,
                    title: 'B',
                    text: `Buy\nScore: ${point.normalized_score.toFixed(1)}`,
                    color: '#00FA9A'
                });
            } else if (point.signal === 'Extreme Sell' || (point.signal === 'Sell' && point.normalized_score > 90)) {
                veryStrongSellMarkers.push({
                    x: timestamp,
                    title: 'S',
                    text: `Sell\nScore: ${point.normalized_score.toFixed(1)}`,
                    color: '#FF6347'
                });
            }
        });

        // Ensure data is sorted by timestamp (Highstock requirement for line/area series)
        priceData.sort((a, b) => a[0] - b[0]);
        scoreData.sort((a, b) => a[0] - b[0]);
        bottomThresholdData.sort((a, b) => a[0] - b[0]);
        topThresholdData.sort((a, b) => a[0] - b[0]);
        
        console.log(`[QuantChart] Processed Data Lengths -> Price: ${priceData.length}, Score: ${scoreData.length}`);

        return {
            chart: {
                height: height,
                type: 'line',
                backgroundColor: 'transparent',
                style: { fontFamily: 'inherit' },
                zooming: {
                    type: 'xy'
                }
            },
            xAxis: {
                events: {
                    setExtremes: function (e: any) {
                        if (onTimeRangeChange && e.min && e.max) {
                            onTimeRangeChange(e.min, e.max);
                        }
                    }
                }
            },
            title: { text: '' },
            navigator: { enabled: true },
            rangeSelector: {
                selected: 5,
                buttons: [
                    { type: 'month', count: 6, text: '6m' },
                    { type: 'year', count: 1, text: '1y' },
                    { type: 'year', count: 4, text: '4y' },
                    { type: 'all', text: 'All' }
                ],
                buttonTheme: {
                    fill: 'none',
                    stroke: 'none',
                    'stroke-width': 0,
                    r: 8,
                    style: { color: currentColors.coin },
                    states: {
                        hover: { fill: currentColors.plot_band },
                        select: { fill: currentColors.coin, style: { color: 'white' } }
                    }
                }
            },
            tooltip: { split: true, valueDecimals: 2 },
            yAxis: [
                {
                    // Price Y-Axis (Logarithmic, Right Side)
                    labels: { style: { color: currentColors.coin, fontWeight: 'bold' } },
                    title: { text: 'Bitcoin Price', style: { color: currentColors.coin } },
                    opposite: true,
                    lineWidth: 1,
                    type: 'logarithmic'
                },
                {
                    // Quant Score Y-Axis (Linear, Left Side)
                    labels: { style: { color: currentColors.moving_average, fontWeight: 'bold' } },
                    title: { text: 'Total Quant Score (%)', style: { color: currentColors.moving_average } },
                    opposite: false,
                    lineWidth: 1,
                    min: 0,
                    max: 100,
                    plotBands: [
                        { // Overbought Zone (Dynamic - we use a general red background just for visual guide above 80)
                            from: 80,
                            to: 100,
                            color: 'rgba(255, 99, 71, 0.1)',
                            label: { text: 'Overbought', align: 'left', style: { color: '#FF6347' } }
                        },
                        { // Oversold Zone (Below 20)
                            from: 0,
                            to: 20,
                            color: 'rgba(0, 250, 154, 0.1)',
                            label: { text: 'Oversold', align: 'left', style: { color: '#00FA9A' } }
                        }
                    ]
                }
            ],
            series: [
                {
                    id: 'price-series',
                    name: 'Bitcoin Price',
                    type: 'line',
                    data: priceData,
                    yAxis: 0,
                    color: currentColors.coin,
                    lineWidth: 2,
                    zIndex: 5,
                    tooltip: { valuePrefix: '$' }
                },
                {
                    name: 'Buy Signals',
                    type: 'flags',
                    data: veryStrongBuyMarkers,
                    onSeries: 'price-series',
                    shape: 'circlepin',
                    width: 16,
                    color: '#00FA9A',
                    fillColor: '#00FA9A',
                    style: { color: 'white', fontSize: '10px' },
                    yAxis: 0,
                    zIndex: 10
                },
                {
                    name: 'Sell Signals',
                    type: 'flags',
                    data: veryStrongSellMarkers,
                    onSeries: 'price-series',
                    shape: 'circlepin',
                    width: 16,
                    color: '#FF6347',
                    fillColor: '#FF6347',
                    style: { color: 'white', fontSize: '10px' },
                    yAxis: 0,
                    zIndex: 10
                },
                {
                    name: 'Total Quant Score',
                    type: 'area', // Histogram and area blend
                    data: scoreData,
                    yAxis: 1,
                    color: '#e74c3c', // User mockup requested stunning red quant area
                    fillColor: {
                        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                        stops: [
                            [0, 'rgba(231, 76, 60, 0.6)'],
                            [1, 'rgba(231, 76, 60, 0.05)']
                        ]
                    },
                    lineWidth: 1.5,
                    zIndex: 1,
                    tooltip: { valueSuffix: ' pts' }
                },
                {
                    name: 'Dynamic Bottom Threshold',
                    type: 'line',
                    data: bottomThresholdData,
                    yAxis: 1,
                    color: '#00FA9A',
                    dashStyle: 'ShortDash',
                    lineWidth: 1,
                    enableMouseTracking: false
                },
                {
                    name: 'Dynamic Top Threshold',
                    type: 'line',
                    data: topThresholdData,
                    yAxis: 1,
                    color: '#FF6347',
                    dashStyle: 'ShortDash',
                    lineWidth: 1,
                    enableMouseTracking: false
                }
            ],
            credits: { enabled: false },
            exporting: { enabled: showExporting },
            accessibility: { enabled: false }
        };
    }, [quantData, colorMode, Highcharts, height, onTimeRangeChange, showExporting]);

    if (!isClient || !HighchartsReact || !Highcharts) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: `${height}px` }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <span className="ms-3">Loading Quant Chart Library...</span>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: `${height}px` }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <span className="ms-3">Calculating Quant AI Scores & Divergences...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger h-100 d-flex flex-column justify-content-center mb-0">
                <h5>Quant Chart Error</h5>
                <p>Failed to load quant analysis data from backend.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
                <h5 className="mb-0 font-bold text-lg">{title}</h5>
            </div>
            <div style={{ height: `${height}px` }}>
                <HighchartsReact
                    highcharts={Highcharts}
                    constructorType={'stockChart'}
                    options={chartOptions}
                    ref={chartRef}
                />
            </div>
        </div>
    );
};

export default QuantAnalysisChart;
