"use client"

import React, { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface MovingAverageChartProps {
    assetId?: string;
    title?: string;
    height?: number;
    locale?: string;
}

const MovingAverageChart: React.FC<MovingAverageChartProps> = ({
    assetId = 'BTCUSDT',
    title = 'Bitcoin Price & Moving Averages',
    height = 600,
    locale = 'en'
}) => {
    const [isClient, setIsClient] = useState(false);
    const [HighchartsReact, setHighchartsReact] = useState<any>(null);
    const [Highcharts, setHighcharts] = useState<any>(null);
    const chartRef = useRef<any>(null);
    const [useLogScale, setUseLogScale] = useState(true);

    const { data: ohlcvData, isLoading } = useQuery({
        queryKey: ['ohlcv-moving-averages', assetId],
        queryFn: () => apiClient.getAssetsOhlcv({
            asset_identifier: assetId,
            data_interval: '1d',
            limit: 10000
        }),
        staleTime: 60 * 60 * 1000,
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

    const calculateSMA = (data: number[][], period: number) => {
        if (data.length < period) return [];
        const sma: number[][] = [];
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j][1];
            }
            sma.push([data[i][0], sum / period]);
        }
        return sma;
    };

    if (isLoading || !isClient || !Highcharts || !HighchartsReact) {
        return (
            <div className="bg-white rounded-lg p-6 flex items-center justify-center" style={{ height: `${height}px` }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const rawData = (ohlcvData?.data || ohlcvData || []) as any[];
    const priceData: number[][] = rawData
        .map(d => [new Date(d.timestamp_utc).getTime(), parseFloat(d.close_price)])
        .filter(d => !isNaN(d[0]) && !isNaN(d[1]))
        .sort((a, b) => a[0] - b[0]);

    const maConfigs = [
        { period: 10, color: '#4ade80', visible: false },  // Green-400
        { period: 20, color: '#22c55e', visible: false },  // Green-500
        { period: 40, color: '#059669', visible: false },  // Emerald-600
        { period: 50, color: '#f59e0b', visible: true },   // Amber-500 (Default)
        { period: 111, color: '#8b5cf6', visible: false }, // Violet-500
        { period: 200, color: '#ef4444', visible: true },  // Red-500 (Default)
        { period: 365, color: '#3b82f6', visible: false }, // Blue-500
        { period: 700, color: '#6b7280', visible: false }, // Gray-500 (350*2)
    ];

    const maSeries = maConfigs.map(config => ({
        name: `${config.period} Day SMA`,
        data: calculateSMA(priceData, config.period),
        color: config.color,
        lineWidth: 1.5,
        visible: config.visible,
    }));

    const chartOptions = {
        chart: { height, backgroundColor: '#ffffff' },
        title: { text: title, style: { fontWeight: 'bold' } },
        xAxis: { type: 'datetime' },
        yAxis: {
            type: useLogScale ? 'logarithmic' : 'linear',
            title: { text: 'Price (USD)' },
            opposite: false
        },
        tooltip: { shared: true, valueDecimals: 2, valuePrefix: '$' },
        legend: { enabled: true },
        series: [
            { name: 'Bitcoin Price', data: priceData, color: '#1e293b', lineWidth: 1, opacity: 0.5, id: 'price' }, // Slate-800
            ...maSeries
        ],
        rangeSelector: { enabled: true, selected: 4 },
        navigator: { enabled: true }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                <button
                    onClick={() => setUseLogScale(!useLogScale)}
                    className={`px-3 py-1 text-xs rounded-md border ${useLogScale ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                >
                    Log Scale
                </button>
            </div>
            <HighchartsReact
                highcharts={Highcharts}
                constructorType={'stockChart'}
                options={chartOptions}
                ref={chartRef}
            />
        </div>
    );
};

export default MovingAverageChart;
