"use client"

import React, { useEffect, useState, useRef } from 'react';
import { useMovingAverages } from '@/hooks/analysis/useTechnicalAnalysis';

interface MovingAverageChartProps {
    assetId?: string; // Kept for prop compatibility, but we use ticker logic mostly
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

    // Use Custom Hook for Backend API
    const { data: maData, loading: isLoading } = useMovingAverages(assetId);

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

    if (isLoading || !isClient || !Highcharts || !HighchartsReact) {
        return (
            <div className="bg-white rounded-lg p-6 flex items-center justify-center" style={{ height: `${height}px` }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!maData || !maData.data) {
        return <div className="p-10 text-center text-red-500">Failed to load data.</div>;
    }

    // Process Backend Data for Highcharts
    const processedData = maData.data.map(d => {
        const timestamp = new Date(d.date).getTime();
        return {
            ...d,
            timestamp,
        };
    }).sort((a, b) => a.timestamp - b.timestamp);

    // Create Price Series
    const priceSeriesData = processedData.map(d => [d.timestamp, d.close]);

    // Create SMA Series
    const maConfigs = [
        { period: 10, color: '#4ade80', visible: false }, 
        { period: 20, color: '#22c55e', visible: false }, 
        { period: 40, color: '#059669', visible: false }, 
        { period: 50, color: '#f59e0b', visible: true },  
        { period: 111, color: '#8b5cf6', visible: false },
        { period: 200, color: '#ef4444', visible: true }, 
        { period: 365, color: '#3b82f6', visible: false },
        { period: 700, color: '#6b7280', visible: false },
    ];

    const maSeries = maConfigs.map(config => ({
        name: `${config.period} Day SMA`,
        data: processedData.map(d => [d.timestamp, (d as any)[`SMA_${config.period}`]]),
        color: config.color,
        lineWidth: 1.5,
        visible: config.visible,
        tooltip: {
            valueDecimals: 2
        }
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
            { name: 'Bitcoin Price', data: priceSeriesData, color: '#1e293b', lineWidth: 1, opacity: 0.5, id: 'price' },
            ...maSeries
        ],
        rangeSelector: {
            enabled: true,
            selected: 5, // Selects 'All' by default (index 5 in the buttons array below)
            buttons: [
                { type: 'month', count: 3, text: '3m' },
                { type: 'month', count: 6, text: '6m' },
                { type: 'ytd', text: 'YTD' },
                { type: 'year', count: 1, text: '1y' },
                { type: 'year', count: 5, text: '5y' },
                { type: 'all', text: 'All' }
            ]
        },
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
                    LogS
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
