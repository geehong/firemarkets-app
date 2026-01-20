"use client"

import React, { useEffect, useState, useRef } from 'react';
import { useOhlcvData as useOhlcv } from '@/hooks/assets/useAssets';
import { useIntradayOhlcv as useIntraday } from '@/hooks/data/useRealtime';

interface ClosePriceChartProps {
    assetId?: string;
    interval?: string; // Default interval
    allowedIntervals?: string[]; // List of intervals to show in selector
    title?: string;
    height?: number;
    locale?: string;
    startDate?: string;
    endDate?: string;
}

const ClosePriceChart: React.FC<ClosePriceChartProps> = ({
    assetId = 'BTCUSDT',
    interval = '1d',
    allowedIntervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'],
    title,
    height = 500,
    locale = 'en',
    startDate,
    endDate
}) => {
    const [isClient, setIsClient] = useState(false);
    const [HighchartsReact, setHighchartsReact] = useState<any>(null);
    const [Highcharts, setHighcharts] = useState<any>(null);
    const chartRef = useRef<any>(null);
    const [selectedInterval, setSelectedInterval] = useState(interval);
    const [useLogScale, setUseLogScale] = useState(false);

    // Interval mapping
    const intradayIntervals = ['1m', '5m', '15m', '30m', '1h', '4h']
    const dailyIntervals = ['1d', '1w', '1M']

    const isIntradayInterval = intradayIntervals.includes(selectedInterval)
    const isDailyInterval = dailyIntervals.includes(selectedInterval)

    // Intraday logic
    const { data: timeData, isLoading: timeLoading } = useIntraday(
        assetId,
        { dataInterval: selectedInterval, days: 1, limit: 2000 },
        // @ts-ignore
        { enabled: isIntradayInterval, staleTime: 60_000 }
    )

    // Daily logic
    const { data: dailyData, isLoading: dailyLoading } = useOhlcv(
        assetId,
        { dataInterval: selectedInterval, limit: 50000 },
        // @ts-ignore
        { enabled: isDailyInterval, staleTime: 60_000 }
    )

    const apiData = isIntradayInterval ? timeData : dailyData
    const isLoading = isIntradayInterval ? timeLoading : dailyLoading

    const displayTitle = title || `${assetId} Close Price (${selectedInterval})`;

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
                    import('highcharts/modules/exporting')
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

    if (isLoading || !isClient || !Highcharts || !HighchartsReact) {
        return (
            <div className="bg-white rounded-lg p-6 flex items-center justify-center" style={{ height: `${height}px` }}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Process data from hook response
    const rawData = (apiData?.data || apiData || []) as any[];
    const priceData: number[][] = rawData
        .map(d => [new Date(d.timestamp_utc || d.timestamp).getTime(), parseFloat(d.close_price || d.close || d.price)])
        .filter(d => !isNaN(d[0]) && !isNaN(d[1]))
        .sort((a, b) => a[0] - b[0]);

    const chartOptions = {
        chart: { height, backgroundColor: '#ffffff' },
        title: { text: null },
        xAxis: {
            type: 'datetime',
            min: startDate ? new Date(startDate).getTime() : undefined,
            max: endDate ? new Date(endDate).getTime() : undefined
        },
        yAxis: {
            title: { text: 'Price (USD)' },
            type: useLogScale ? 'logarithmic' : 'linear',
            opposite: false
        },
        tooltip: { shared: true, valueDecimals: 2, valuePrefix: '$' },
        series: [
            {
                name: 'Close Price',
                data: priceData,
                color: '#3b82f6',
                type: 'line',
                threshold: null,
                tooltip: { valueDecimals: 2 },
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, 'rgba(59, 130, 246, 0.4)'],
                        [1, 'rgba(59, 130, 246, 0)']
                    ]
                }
            }
        ],
        rangeSelector: {
            enabled: true,
            selected: (startDate || endDate) ? undefined : 2 // Default to 6m if no range specified
        },
        navigator: { enabled: true }
    };

    const intervalLabels: Record<string, string> = {
        '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
        '1h': '1h', '4h': '4h', '1d': 'Daily', '1w': 'Weekly', '1M': 'Monthly'
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-lg font-semibold text-gray-800">{displayTitle}</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setUseLogScale(!useLogScale)}
                        className={`px-3 py-1 text-xs rounded-md border ${useLogScale ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                    >
                        Log
                    </button>
                    <span className="text-sm text-gray-500">Interval:</span>
                    <select
                        value={selectedInterval}
                        onChange={(e) => setSelectedInterval(e.target.value)}
                        className="text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                    >
                        {allowedIntervals.map(i => (
                            <option key={i} value={i}>{intervalLabels[i] || i}</option>
                        ))}
                    </select>
                </div>
            </div>
            {Highcharts && HighchartsReact && (
                <HighchartsReact
                    highcharts={Highcharts}
                    constructorType={'stockChart'}
                    options={chartOptions}
                    ref={chartRef}
                />
            )}
        </div>
    );
};

export default ClosePriceChart;
