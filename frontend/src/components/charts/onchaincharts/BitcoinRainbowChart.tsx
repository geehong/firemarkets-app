"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useRainbowChartData } from '@/hooks/useCrypto';
import ComponentCard from '@/components/common/ComponentCard';
import { AlertCircle } from 'lucide-react';

interface BitcoinRainbowChartProps {
    title?: string;
    height?: number;
}

/**
 * Bitcoin Rainbow Chart v2
 * Extended to 10 bands including "Bitcoin is dead"
 * Full multi-band tooltip as requested.
 */
const BitcoinRainbowChart: React.FC<BitcoinRainbowChartProps> = ({
    title = 'Bitcoin Rainbow Chart v2',
    height = 650
}) => {
    const { data: rainbowResponse, isLoading, isError, error } = useRainbowChartData();
    const [isClient, setIsClient] = useState(false);
    const [HighchartsReact, setHighchartsReact] = useState<any>(null);
    const [Highcharts, setHighcharts] = useState<any>(null);
    const [isDark, setIsDark] = useState(false);
    const chartRef = useRef<any>(null);

    // Initialize Highcharts and Theme detection
    useEffect(() => {
        const loadHighcharts = async () => {
            try {
                const [
                    HighchartsReactModule,
                    HighchartsCoreModule
                ] = await Promise.all([
                    //@ts-ignore
                    import('highcharts-react-official'),
                    //@ts-ignore
                    import('highcharts/highstock')
                ]);

                const HC_React = (HighchartsReactModule as any).default || HighchartsReactModule;
                const HC_Core = (HighchartsCoreModule as any).default || HighchartsCoreModule;

                // Load modules
                const modules = await Promise.all([
                    //@ts-ignore
                    import('highcharts/highcharts-more'),
                    //@ts-ignore
                    import('highcharts/modules/exporting'),
                    //@ts-ignore
                    import('highcharts/modules/accessibility')
                ]);

                modules.forEach((mod) => {
                    const init = (mod as any).default || mod;
                    if (typeof init === 'function') init(HC_Core);
                });

                setHighchartsReact(() => HC_React);
                setHighcharts(HC_Core);
                setIsClient(true);
            } catch (err) {
                console.error('Failed to load Highcharts:', err);
            }
        };

        loadHighcharts();

        // Theme detection
        if (typeof document !== 'undefined') {
            const checkTheme = () => {
                setIsDark(document.documentElement.classList.contains('dark'));
            };
            
            checkTheme();
            
            const observer = new MutationObserver(checkTheme);
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class']
            });
            
            return () => observer.disconnect();
        }
    }, []);

    if (isLoading || !isClient) {
        return (
            <ComponentCard title={title}>
                <div className="w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-3xl animate-pulse" style={{ height }}>
                    <div className="text-slate-400 font-medium">Loading Bitcoin History...</div>
                </div>
            </ComponentCard>
        );
    }

    if (isError) {
        return (
            <ComponentCard title={title}>
                <div className="flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-950/20 rounded-3xl border border-red-100 dark:border-red-900/30">
                    <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                    <h3 className="text-xl font-bold text-red-900 dark:text-red-400 text-center">Data Connection Refused</h3>
                    <p className="text-sm text-red-700/70 dark:text-red-500/70 mt-2 text-center max-w-xs">{(error as Error)?.message || 'The server returned an invalid response structure.'}</p>
                </div>
            </ComponentCard>
        );
    }

    const rainbowData = rainbowResponse?.data || [];
    if (rainbowData.length === 0) return null;

    // Define 10 Band Keys and Colors (matching Top Image)
    const bandKeys = [
        "max_bubble", "sell", "fomo", "is_bubble", "hodl", 
        "still_cheap", "accumulate", "buy", "fire_sale", "bitcoin_is_dead"
    ];

    const vibrantColors: Record<string, string> = {
        max_bubble: '#D50000',      // Maximum Bubble Territory
        sell: '#FF1744',            // Sell. Seriously, SELL!
        fomo: '#FF6D00',            // FOMO intensifies
        is_bubble: '#FFAB00',       // Is this a bubble?
        hodl: '#FFFF00',            // HODL!
        still_cheap: '#AEEA00',     // Still cheap
        accumulate: '#00C853',      // Accumulate
        buy: '#00BFA5',             // BUY!
        fire_sale: '#2962FF',       // Basically a Fire Sale
        bitcoin_is_dead: '#9C27B0'  // Bitcoin is dead
    };

    const bandSeries = bandKeys.map((key) => {
        const bandInfo = rainbowData[0]?.bands[key];
        const seriesData = rainbowData.map((d: any) => {
            const date = new Date(d.date).getTime();
            return [date, d.bands[key].low, d.bands[key].high];
        });

        return {
            name: bandInfo?.label || key,
            type: 'arearange',
            data: seriesData,
            color: vibrantColors[key] || bandInfo?.color || '#cccccc',
            fillOpacity: isDark ? 0.7 : 0.6,
            lineWidth: 0,
            zIndex: 0,
            enableMouseTracking: false,
            showInLegend: true
        };
    });

    const priceSeries = [{
        name: 'Price',
        type: 'line',
        data: rainbowData.filter((d: any) => d.price !== null).map((d: any) => [new Date(d.date).getTime(), d.price]),
        color: isDark ? '#FFFFFF' : '#0f172a',
        lineWidth: 2,
        zIndex: 10,
        tooltip: { valueDecimals: 0, valuePrefix: '$' }
    }];

    const chartOptions = {
        chart: {
            height: height,
            backgroundColor: 'transparent',
            style: { fontFamily: 'Inter, sans-serif' },
            zoomType: 'x',
            spacingBottom: 20
        },
        title: { text: null },
        xAxis: {
            type: 'datetime',
            gridLineWidth: 0,
            lineColor: isDark ? '#334155' : '#e2e8f0',
            labels: { style: { color: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' } },
            max: new Date('2030-01-01').getTime()
        },
        yAxis: {
            type: 'logarithmic',
            title: { text: null },
            labels: { 
                style: { color: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' },
                formatter: function(this: any) {
                    if (this.value >= 1000000) return '$' + (this.value / 1000000).toLocaleString() + 'M';
                    if (this.value >= 1000) return '$' + (this.value / 1000).toLocaleString() + 'k';
                    return '$' + this.value.toLocaleString();
                }
            },
            gridLineColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            tickAmount: 12
        },
        tooltip: {
            shared: true,
            useHTML: true,
            formatter: function(this: any) {
                const points = this.points;
                //@ts-ignore
                const pricePoint = points.find((p: any) => p.series.name === 'Price');
                //@ts-ignore
                const dateStr = Highcharts.dateFormat('%b %e, %Y, %H:%M:%S p.m.', this.x);
                //@ts-ignore
                const originalPoint = rainbowData.find((d: any) => new Date(d.date).getTime() === this.x);
                
                if (!originalPoint) return '';

                const currentPrice = pricePoint ? pricePoint.y : null;
                const currentBandKey = originalPoint.current_band;

                let bandsHtml = '';
                // Reverse bandKeys to match image (Max Bubble at top)
                [...bandKeys].forEach(key => {
                    const b = originalPoint.bands[key];
                    const isActive = key === currentBandKey;
                    const color = vibrantColors[key];
                    bandsHtml += `
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 2px 0;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="width: 10px; height: 10px; background: ${color}; border-radius: 2px; ${isActive ? 'box-shadow: 0 0 5px ' + color : ''}"></div>
                                <span style="font-size: 12px; font-weight: ${isActive ? '800' : '500'}; color: ${isActive ? (isDark ? '#fff' : '#000') : (isDark ? '#aaa' : '#555')}">${b.label}:</span>
                            </div>
                            <span style="font-size: 12px; font-weight: 700; font-family: monospace; color: ${isDark ? '#fff' : '#000'}">$${Math.round(b.high).toLocaleString()}</span>
                        </div>
                    `;
                });

                return `
                    <div style="padding: 15px; background: ${isDark ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.98)'}; border: 1px solid ${isDark ? '#444' : '#ccc'}; border-radius: 8px; color: ${isDark ? '#fff' : '#000'}; box-shadow: 0 10px 25px rgba(0,0,0,0.5); min-width: 250px;">
                        <div style="font-weight: 800; font-size: 13px; margin-bottom: 8px; border-bottom: 1px solid ${isDark ? '#333' : '#eee'}; padding-bottom: 8px;">${dateStr}</div>
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <span style="font-size: 12px; font-weight: 600;">Bitcoin Price:</span>
                            <span style="font-size: 14px; font-weight: 900;">${currentPrice ? '$' + currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'Forecast'}</span>
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            ${bandsHtml}
                        </div>
                    </div>
                `;
            },
            backgroundColor: 'transparent',
            borderWidth: 0,
            shadow: false,
            padding: 0
        },
        legend: {
            enabled: true,
            layout: 'horizontal',
            align: 'center',
            verticalAlign: 'bottom',
            itemStyle: { fontSize: '10px', color: isDark ? '#94a3b8' : '#475569' }
        },
        rangeSelector: {
            enabled: true,
            selected: 5,
            buttons: [
                { type: 'year', count: 1, text: '1y' },
                { type: 'year', count: 3, text: '3y' },
                { type: 'year', count: 5, text: '5y' },
                { type: 'all', text: 'Max (2030)' }
            ],
            buttonTheme: {
                fill: 'transparent',
                stroke: 'none',
                r: 4,
                style: { color: isDark ? '#94a3b8' : '#64748b', fontWeight: 'bold' },
                states: {
                    select: { fill: '#3b82f6', style: { color: '#fff' } }
                }
            }
        },
        series: [...bandSeries, ...priceSeries],
        credits: { enabled: false }
    };

    return (
        <ComponentCard title={title}>
            <div className={`relative w-full rounded-2xl p-4 border transition-all duration-300 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                <HighchartsReact
                    highcharts={Highcharts}
                    constructorType={'stockChart'}
                    options={chartOptions}
                    ref={chartRef}
                />
            </div>
            <div className={`mt-6 p-5 rounded-xl border transition-all duration-300 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <p className={`text-[12px] leading-relaxed text-center italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    ※ 이 차트는 로그 회귀 공식을 기반으로 한 비트코인의 장기 가격 예측 모델입니다. 
                    <strong className="mx-1 text-blue-500 underline underline-offset-4">Stephan Akkerman</strong>의 데이터 모델링과 
                    <strong className="mx-1">Bitbo</strong>의 시각화 원칙을 준수하여 제작되었습니다.
                </p>
            </div>
        </ComponentCard>
    );
};

export default BitcoinRainbowChart;
