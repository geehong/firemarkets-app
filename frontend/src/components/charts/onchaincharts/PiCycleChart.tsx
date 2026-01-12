"use client"

import React, { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import ChartControls from '@/components/common/ChartControls';

interface PiCycleChartProps {
    assetId?: string;
    title?: string;
    height?: number;
    locale?: string;
}

const PiCycleChart: React.FC<PiCycleChartProps> = ({
    assetId = 'BTCUSDT',
    title = 'Bitcoin Pi Cycle Top Indicator',
    height = 600,
    locale = 'en'
}) => {
    const [isClient, setIsClient] = useState(false);
    const [HighchartsReact, setHighchartsReact] = useState<any>(null);
    const [Highcharts, setHighcharts] = useState<any>(null);
    const chartRef = useRef<any>(null);
    const [useLogScale, setUseLogScale] = useState(true);
    const [chartType, setChartType] = useState<'line' | 'spline'>('line');

    // Fetch daily OHLCV data for Pi Cycle calculation
    const { data: ohlcvData, isLoading, error } = useQuery({
        queryKey: ['ohlcv-pi-cycle', assetId],
        queryFn: () => apiClient.getAssetsOhlcv({
            asset_identifier: assetId,
            data_interval: '1d',
            limit: 5000
        }),
        staleTime: 60 * 60 * 1000, // 1 hour
    });

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
                    import('highcharts/modules/accessibility')
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

    const calculateSMA = (data: number[][], period: number, multiplier: number = 1) => {
        if (data.length < period) return [];
        const sma: number[][] = [];
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j][1];
            }
            sma.push([data[i][0], (sum / period) * multiplier]);
        }
        return sma;
    };

    if (isLoading || !isClient || !Highcharts || !HighchartsReact) {
        return (
            <div className="bg-white rounded-lg p-6 flex items-center justify-center" style={{ height: `${height}px` }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <div className="text-gray-700">{locale === 'ko' ? '데이터 및 차트 라이브러리 로딩 중...' : 'Loading data and chart library...'}</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg p-6 flex items-center justify-center" style={{ height: `${height}px` }}>
                <div className="text-center text-red-600">
                    <p>Error loading data</p>
                </div>
            </div>
        );
    }

    const rawData = (ohlcvData?.data || ohlcvData || []) as any[];
    const priceData: number[][] = rawData
        .map(d => [new Date(d.timestamp_utc).getTime(), parseFloat(d.close_price)])
        .filter(d => !isNaN(d[0]) && !isNaN(d[1]))
        .sort((a, b) => a[0] - b[0]);

    const sma111 = calculateSMA(priceData, 111);
    const sma350x2 = calculateSMA(priceData, 350, 2);

    // Find intersection points (cross above)
    const intersections: number[] = [];
    if (sma111.length > 0 && sma350x2.length > 0) {
        const sma350Map = new Map(sma350x2.map(d => [d[0], d[1]]));

        let prevSma111 = 0;
        let prevSma350x2 = 0;

        sma111.forEach(([ts, val]) => {
            const sma350val = sma350Map.get(ts);
            if (sma350val !== undefined) {
                // Check for cross above (specifically Pi Cycle Top signal)
                if (prevSma111 < prevSma350x2 && val >= sma350val && prevSma111 !== 0) {
                    intersections.push(ts);
                }
                prevSma111 = val;
                prevSma350x2 = sma350val;
            }
        });
    }

    const chartOptions = {
        chart: {
            height: height,
            backgroundColor: '#ffffff',
            zoomType: 'x'
        },
        title: {
            text: title,
            style: { color: '#1f2937', fontSize: '18px', fontWeight: 'bold' }
        },
        xAxis: {
            type: 'datetime',
            gridLineColor: '#f3f4f6'
        },
        yAxis: {
            type: useLogScale ? 'logarithmic' : 'linear',
            title: { text: 'Price (USD)' },
            gridLineColor: '#f3f4f6',
            opposite: false
        },
        tooltip: {
            shared: true,
            valueDecimals: 2,
            valuePrefix: '$'
        },
        legend: {
            enabled: true
        },
        series: [
            {
                name: 'Bitcoin Price',
                data: priceData,
                id: 'main-price',
                color: '#3b82f6',
                lineWidth: 1,
                opacity: 0.8
            },
            {
                name: '111 Day SMA',
                data: sma111,
                color: '#ef4444',
                lineWidth: 2
            },
            {
                name: '350 Day SMA x 2',
                data: sma350x2,
                color: '#10b981',
                lineWidth: 2
            },
            {
                type: 'flags',
                data: intersections.map(ts => ({
                    x: ts,
                    title: 'Top',
                    text: `Pi Cycle Top Signal: ${new Date(ts).toISOString().split('T')[0]}`
                })),
                onSeries: 'main-price',
                shape: 'squarepin',
                width: 32,
                color: '#ef4444',
                fillColor: '#ef4444',
                style: { color: 'white' },
                states: {
                    hover: {
                        fillColor: '#b91c1c'
                    }
                }
            }
        ],
        rangeSelector: {
            enabled: true,
            selected: 5, // Default to All/Long term
            buttons: [
                { type: 'year', count: 1, text: '1y' },
                { type: 'year', count: 3, text: '3y' },
                { type: 'year', count: 5, text: '5y' },
                { type: 'all', text: 'All' }
            ]
        },
        navigator: {
            enabled: true
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setUseLogScale(!useLogScale)}
                        className={`px-3 py-1 text-xs rounded-md border ${useLogScale ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                    >
                        Log
                    </button>
                </div>
            </div>
            <HighchartsReact
                highcharts={Highcharts}
                constructorType={'stockChart'}
                options={chartOptions}
                ref={chartRef}
            />
            <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <p><strong>About Pi Cycle Top Indicator:</strong> Historically, when the 111-day DMA (red) crosses above the 2x 350-day DMA (green), it has coincided with market tops for Bitcoin within a few days.</p>
            </div>
        </div>
    );
};

export default PiCycleChart;
