
"use client"

import React, { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';

interface OpenInterestChartProps {
    height?: number;
    locale?: string;
}

const EXCHANGE_LABELS: Record<string, { name: string; color: string }> = {
    "binance": { name: "Binance", color: "#F3BA2F" },
    "bybit": { name: "Bybit", color: "#FFB11A" },
    "okx": { name: "OKX", color: "#000000" },
    "bitget": { name: "Bitget", color: "#00F0FF" },
    "deribit": { name: "Deribit", color: "#00A19D" },
    "bitmex": { name: "BitMEX", color: "#FF1B2D" },
    "huobi": { name: "HTX (Huobi)", color: "#1C51EB" },
    "bitfinex": { name: "Bitfinex", color: "#009381" },
    "gateIo": { name: "Gate.io", color: "#E34E4B" },
    "kucoin": { name: "KuCoin", color: "#24AE8F" },
    "kraken": { name: "Kraken", color: "#5741D9" },
    "cryptoCom": { name: "Crypto.com", color: "#103F68" },
    "dydx": { name: "dYdX", color: "#6966FF" },
    "deltaExchange": { name: "Delta Exchange", color: "#EE3B2B" }
};

// 테마 스타일 정의
const THEMES = {
    light: {
        background: '#ffffff',
        text: '#333333',
        subtext: '#666666',
        grid: '#e0e0e0',
        axis: '#cccccc',
        tooltipBg: 'rgba(255, 255, 255, 0.95)',
        tooltipBorder: '#cccccc',
        legendBg: 'rgba(255, 255, 255, 0.8)',
        buttonFill: '#f0f0f0',
        buttonStroke: '#cccccc',
        buttonText: '#333333',
        containerBg: 'bg-white',
        metaText: 'text-gray-600',
        priceColor: '#000000'
    },
    dark: {
        background: '#1a1a2e',
        text: '#ffffff',
        subtext: '#8892b0',
        grid: '#2a2a4a',
        axis: '#3d3d5c',
        tooltipBg: 'rgba(26, 26, 46, 0.95)',
        tooltipBorder: '#3d3d5c',
        legendBg: 'rgba(0, 0, 0, 0.3)',
        buttonFill: '#2a2a4a',
        buttonStroke: '#3d3d5c',
        buttonText: '#8892b0',
        containerBg: 'bg-gray-900',
        metaText: 'text-gray-500',
        priceColor: '#ffffff'
    }
};

const fetchOpenInterestDistribution = async () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/onchain/metrics/open_interest/distribution?limit=5000`);
    if (!response.ok) {
        throw new Error('Failed to fetch Open Interest distribution data');
    }
    return response.json();
};

const OpenInterestChart: React.FC<OpenInterestChartProps> = ({
    height = 600,
    locale = 'en'
}) => {
    const [isClient, setIsClient] = useState(false);
    const [Highcharts, setHighcharts] = useState<any>(null);
    const [HighchartsReact, setHighchartsReact] = useState<any>(null);
    const { theme: globalTheme } = useTheme();
    const chartRef = useRef<any>(null);

    const isDarkMode = globalTheme === 'dark';
    const theme = isDarkMode ? THEMES.dark : THEMES.light;

    const { data, isLoading, error } = useQuery({
        queryKey: ['open-interest-distribution'],
        queryFn: fetchOpenInterestDistribution,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false
    });

    // Highcharts 로드
    useEffect(() => {
        const loadHighcharts = async () => {
            try {
                const [
                    { default: HighchartsReactComponent },
                    { default: HighchartsCore }
                ] = await Promise.all([
                    import('highcharts-react-official'),
                    import('highcharts/highstock')
                ]);

                await Promise.all([
                    import('highcharts/modules/exporting'),
                    import('highcharts/modules/accessibility')
                ]);

                setHighchartsReact(() => HighchartsReactComponent);
                setHighcharts(HighchartsCore);
                setIsClient(true);
            } catch (error) {
                console.error('Failed to load Highcharts:', error);
            }
        };
        loadHighcharts();
    }, []);

    if (!isClient || !Highcharts || !HighchartsReact) {
        return (
            <div className={`flex items-center justify-center ${theme.containerBg} rounded-xl`} style={{ height }}>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center ${theme.containerBg} rounded-xl`} style={{ height }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className={theme.metaText}>Loading Open Interest data...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={`flex items-center justify-center ${theme.containerBg} rounded-xl`} style={{ height }}>
                <p className="text-red-400">Failed to load Open Interest data</p>
            </div>
        );
    }

    // 시리즈 데이터 구성
    const exchanges = data.exchanges || [];
    const seriesData = data.series || {};
    const rawData = data.data || [];

    // 거래소별 영역 시리즈
    const exchangeSeries = exchanges.map((ex: string) => {
        const exData = seriesData[ex] || [];
        const formattedData = exData.map((item: { date: string; value: number }) => {
            const timestamp = new Date(item.date).getTime();
            return [timestamp, item.value];
        });

        const label = EXCHANGE_LABELS[ex];
        return {
            name: label?.name || ex,
            type: 'areaspline',
            data: formattedData,
            color: label?.color || '#888',
            fillOpacity: 0.7,
            yAxis: 0,
            zIndex: 1
        };
    });

    // 가격 데이터
    const priceData = rawData
        .filter((item: any) => item.price != null)
        .map((item: any) => [
            new Date(item.date).getTime(),
            item.price
        ])
        .sort((a: any, b: any) => a[0] - b[0]);

    const priceSeries = {
        name: 'Bitcoin Price',
        type: 'line',
        data: priceData,
        yAxis: 1,
        color: theme.priceColor,
        lineWidth: 1.5,
        zIndex: 2,
        tooltip: {
            valueDecimals: 2,
            valuePrefix: '$'
        }
    };

    const chartOptions = {
        chart: {
            backgroundColor: theme.background,
            height: height,
            zooming: { type: 'x' },
            style: { fontFamily: 'inherit' },
            panning: { enabled: true, type: 'x' },
            panKey: 'shift'
        },
        title: {
            text: locale === 'ko' ? '비트코인 미결제약정 (거래소별 분포)' : 'Bitcoin Open Interest (Exchange Distribution)',
            style: { color: theme.text, fontSize: '18px', fontWeight: 'bold' }
        },
        subtitle: {
            text: locale === 'ko' ? '주요 거래소별 미결제약정 비중 vs 가격' : 'Open Interest by Major Exchanges vs Price',
            style: { color: theme.subtext }
        },
        xAxis: {
            type: 'datetime',
            labels: { style: { color: theme.subtext } },
            lineColor: theme.axis,
            tickColor: theme.axis,
            crosshair: true
        },
        yAxis: [{
            title: {
                text: locale === 'ko' ? '미결제약정 (USD)' : 'Open Interest (USD)',
                style: { color: theme.subtext }
            },
            labels: {
                style: { color: theme.subtext },
                align: 'left',
                x: 8,
                formatter: function(this: any) {
                    if (this.value >= 1e9) return (this.value / 1e9).toFixed(1) + 'B';
                    if (this.value >= 1e6) return (this.value / 1e6).toFixed(1) + 'M';
                    return this.value;
                }
            },
            gridLineColor: theme.grid,
            opposite: true
        }, {
            title: {
                text: locale === 'ko' ? '가격 (USD, Log)' : 'Price (USD, Log)',
                style: { color: theme.subtext }
            },
            labels: {
                style: { color: theme.subtext },
                align: 'right',
                x: -8,
                formatter: function(this: any) { return '$' + this.value.toLocaleString(); }
            },
            gridLineWidth: 0,
            opposite: false,
            type: 'logarithmic'
        }],
        legend: {
            enabled: true,
            align: 'center',
            verticalAlign: 'bottom',
            layout: 'horizontal',
            itemStyle: { color: theme.subtext, fontSize: '11px' },
            backgroundColor: theme.legendBg,
            borderRadius: 5,
            padding: 10
        },
        tooltip: {
            shared: true,
            backgroundColor: theme.tooltipBg,
            borderColor: theme.tooltipBorder,
            style: { color: theme.text },
            headerFormat: '<span style="font-size: 12px; font-weight: bold;">{point.key}</span><br/>',
            pointFormatter: function(this: any) {
                const value = this.y;
                if (this.series.name === 'Bitcoin Price') {
                    return `<span style="color:${this.series.color}">●</span> ${this.series.name}: <b>$${value.toLocaleString()}</b><br/>`;
                }
                const formattedValue = value >= 1e9 
                    ? (value / 1e9).toFixed(2) + 'B'
                    : value >= 1e6 
                        ? (value / 1e6).toFixed(2) + 'M'
                        : value.toFixed(2);
                return `<span style="color:${this.series.color}">●</span> ${this.series.name}: <b>$${formattedValue}</b><br/>`;
            }
        },
        plotOptions: {
            areaspline: {
                stacking: 'normal',
                lineWidth: 1,
                marker: { enabled: false },
                fillOpacity: 0.8
            },
            line: { marker: { enabled: false } }
        },
        series: [...exchangeSeries, priceSeries],
        credits: { enabled: false },
        navigator: {
            enabled: true,
            series: { color: theme.priceColor, lineColor: theme.priceColor }
        },
        rangeSelector: {
            selected: 3,
            buttons: [
                { type: 'month', count: 3, text: '3M' },
                { type: 'month', count: 6, text: '6M' },
                { type: 'year', count: 1, text: '1Y' },
                { type: 'all', text: 'All' }
            ]
        }
    };

    return (
        <div className={`${theme.containerBg} rounded-xl p-4`}>
            <HighchartsReact
                highcharts={Highcharts}
                constructorType={'stockChart'}
                options={chartOptions}
                ref={chartRef}
            />
            {data.metadata && (
                <div className={`mt-4 text-center text-sm ${theme.metaText}`}>
                    <span>{locale === 'ko' ? '데이터 범위: ' : 'Data Range: '} {data.metadata.date_range}</span>
                    <span className="mx-4">|</span>
                    <span>{locale === 'ko' ? '데이터 포인트: ' : 'Data Points: '} {data.metadata.total_count?.toLocaleString()}</span>
                </div>
            )}
        </div>
    );
};

export default OpenInterestChart;
