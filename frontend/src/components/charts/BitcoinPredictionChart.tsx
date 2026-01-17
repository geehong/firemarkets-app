"use client";

import React, { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useAssetPriceWithRange } from '@/hooks/assets/useAssets';
import "highcharts/highcharts-more";

interface PredictionData {
  institution: string;
  target: number; 
  low: number;
  high: number;
}

// Raw Data
const rawPredictions = [
  { institution: "Citigroup", low: 78500, high: 189000, target: 143000 },
  { institution: "Bit Mining", low: 75000, high: 225000, target: 150000 },
  { institution: "Fundstrat (Tom Lee)", low: 150000, high: 250000 },
  { institution: "Nexo", low: 150000, high: 200000, target: 175000 },
  { institution: "CoinShares", low: 120000, high: 170000, target: 145000 },
  { institution: "JPMorgan", low: 150000, high: 170000 },
  { institution: "Carol Alexander", low: 75000, high: 150000, target: 110000 },
  { institution: "Bitfinex", low: 80000, high: 100000 },
  { institution: "Fidelity", low: 65000, high: 75000 },
  { institution: "Fundstrat (Sean Farrell)", low: 60000, high: 65000 },
  { institution: "Galaxy Digital", low: 50000, high: 250000, target: 150000 }, 
  { institution: "Peter Brandt", low: 25000, high: 45000, target: 35000 },
  { institution: "Standard Chartered", target: 150000 },
  { institution: "Maple Finance", target: 175000 },
  { institution: "Bernstein", target: 200000 },
  { institution: "Grayscale", target: 126000 },
  { institution: "Bitwise", target: 126000 },
  { institution: "Tim Draper", target: 250000 },
  { institution: "Robert Kiyosaki", low: 175000, high: 350000 },
];

const BASE_PRICE = 96000; 

// Process Data
const predictions: PredictionData[] = rawPredictions.map(p => {
    let target = p.target;
    let low = p.low;
    let high = p.high;

    if (!target && low && high) {
        target = (low + high) / 2;
    }
    if (target && !low) low = target * 0.95; // Small range if missing
    if (target && !high) high = target * 1.05;

    return {
        institution: p.institution,
        target: target || 0,
        low: low || 0,
        high: high || 0
    };
}).filter(p => p.target > 0 && p.target < 500000)
.sort((a, b) => b.target - a.target); // Sort High to Low for diagonal distribution

// Color Helper: Magnitude based saturation
const getColor = (value: number, base: number, opacity = 1) => {
    const change = (value - base) / base; 
    let r, g, b;
    
    // Saturation/Darkness factor based on magnitude
    // Max effect at +/- 100% change
    const intensity = Math.min(Math.abs(change), 1); 
    
    if (change >= 0) {
        // Green Scale: 
        // Small change: Light Green (Hex #86efac - rgb(134, 239, 172))
        // Large change: Dark Green (Hex #14532d - rgb(20, 83, 45))
        r = Math.round(134 - (134 - 20) * intensity);
        g = Math.round(239 - (239 - 83) * intensity);
        b = Math.round(172 - (172 - 45) * intensity);
    } else {
        // Red Scale:
        // Small change: Light Red (Hex #fca5a5 - rgb(252, 165, 165))
        // Large change: Dark Red (Hex #7f1d1d - rgb(127, 29, 29))
        r = Math.round(252 - (252 - 127) * intensity);
        g = Math.round(165 - (165 - 29) * intensity);
        b = Math.round(165 - (165 - 29) * intensity);
    }

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const BitcoinPredictionChart: React.FC = () => {

    // 1. Fetch Real Bitcoin Price History (YTD 2026) using BTCUSDT
    const { data: priceData } = useAssetPriceWithRange('BTCUSDT', {
        startDate: '2026-01-01',
        dataInterval: '1d',
        limit: 1000
    });

    const historyData = useMemo(() => {
        console.log('[BitcoinPredictionChart] Raw Price Data:', priceData);
        // API response structure: { data: [...], total_count: ... } or just [...]
        const rawData = (priceData as any)?.data || priceData;

        if (!rawData || !Array.isArray(rawData)) return [];
        
        const mapped = rawData
            .map((item: any) => {
                // Handle different possible field names from API
                // User showed: { date: "2026-01-15", value: 95614.03 }
                const dateStr = item.date || item.timestamp || item.timestamp_utc;
                const price = item.value ?? item.price ?? item.close_price ?? item.close;
                
                if (!dateStr || price === undefined) return null;

                return [
                    new Date(dateStr).getTime(),
                    parseFloat(price)
                ];
            })
            .filter(item => item !== null)
            .sort((a, b) => a![0] - b![0]);
            
        console.log('[BitcoinPredictionChart] Mapped History:', mapped);
        return mapped as [number, number][];
    }, [priceData]);

    // Shared Diagonal Logic
    const seriesData = useMemo(() => {
        const start = new Date('2026-01-15').getTime();
        const end = new Date('2026-12-15').getTime();
        const duration = end - start;
        const count = predictions.length;
        const halfMonth = 15 * 24 * 60 * 60 * 1000; // ~15 days in ms

        const ranges: any[] = [];
        const labels: any[] = [];

        predictions.forEach((p, index) => {
            // Calculate center time based on rank (diagonal)
            const timeOffset = (index / (count - 1)) * duration;
            const centerX = start + timeOffset;

            // 1. Range Block (~1 Month Width)
            ranges.push({
                type: 'arearange',
                name: p.institution,
                data: [
                    [centerX - halfMonth, p.low, p.high],
                    [centerX + halfMonth, p.low, p.high]
                ],
                color: getColor(p.target, BASE_PRICE, 1),
                fillColor: getColor(p.target, BASE_PRICE, 0.2),
                lineWidth: 1,
                zIndex: 1,
                marker: { enabled: false },
                enableMouseTracking: false
            });

            // 2. Label Point (Center)
            labels.push({
                x: centerX,
                y: p.target,
                name: p.institution,
                custom: { low: p.low, high: p.high },
                marker: { 
                    enabled: true, 
                    radius: 4, 
                    fillColor: getColor(p.target, BASE_PRICE, 1),
                    lineColor: '#FFFFFF',
                    lineWidth: 1
                },
                dataLabels: {
                    enabled: true,
                    formatter: function() {
                        const pt = (this as any).point;
                        const lowK = Math.round(pt.custom.low / 1000) + 'k';
                        const highK = Math.round(pt.custom.high / 1000) + 'k';
                        const rangeStr = lowK === highK ? lowK : `${lowK}~${highK}`;
                        return `<span style="color: #F1F5F9; font-weight: 600; text-shadow: 0 0 3px #000;">${pt.name}</span><br/>
                                <span style="color: #CBD5E1; font-size: 10px; text-shadow: 0 0 2px #000;">(${rangeStr})</span>`;
                    },
                    align: 'center',
                    verticalAlign: 'middle', // Centered in the block
                    style: {
                        textOutline: 'none',
                        fontSize: '11px',
                        fontFamily: 'Outfit, sans-serif'
                    },
                    y: 0 
                }
            });
        });

        return { ranges, labels };
    }, []);

    const labelSeries = useMemo(() => ({
        type: 'scatter',
        name: 'Labels',
        data: seriesData.labels,
        color: 'transparent',
        zIndex: 10,
        tooltip: {
            pointFormat: '<b>{point.name}</b><br/>Target: ${point.y:,.0f}<br/>Range: ${point.custom.low:,.0f} - ${point.custom.high:,.0f}'
        }
    }), [seriesData.labels]);

    const currentPriceMetrics = useMemo(() => {
        if (!historyData || historyData.length < 2) return null;
        const [lastTs, lastPrice] = historyData[historyData.length - 1];
        const [prevTs, prevPrice] = historyData[historyData.length - 2];
        
        const change = lastPrice - prevPrice;
        const changePercent = (change / prevPrice) * 100;
        
        return {
            price: lastPrice,
            change,
            changePercent,
            color: change >= 0 ? '#16a34a' : '#dc2626' // Green or Red
        };
    }, [historyData]);

    // IQR Calculation
    const { q1, q3, median } = useMemo(() => {
        const targets = predictions.map(p => p.target).sort((a, b) => a - b);
        const getPercentile = (data: number[], percentile: number) => {
            const index = (percentile / 100) * (data.length - 1);
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            const weight = index - lower;
            if (lower === upper) return data[index];
            return data[lower] * (1 - weight) + data[upper] * weight;
        };
        return {
            q1: getPercentile(targets, 25),
            median: getPercentile(targets, 50),
            q3: getPercentile(targets, 75)
        };
    }, []);

    const options: Highcharts.Options = {
        chart: {
            backgroundColor: 'transparent',
            height: 800,
            style: { fontFamily: 'Outfit, sans-serif' }
        },
        title: { text: undefined },
        subtitle: {
            text: 'Diagonal Distribution: Higher Targets (Top-Left) to Lower Targets (Bottom-Right)',
            style: { color: '#94A3B8' }
        },
        xAxis: {
            type: 'datetime',
            opposite: true, // Months on top
            title: { text: null },
            labels: { 
                style: { color: '#334155', fontWeight: '600' },
                format: '{value:%b}' // Jan, Feb...
            },
            lineColor: '#334155',
            tickColor: '#334155',
            min: new Date('2026-01-01').getTime(),
            max: new Date('2026-12-31').getTime(),
            plotLines: [{
                value: new Date().getTime(),
                color: '#64748B',
                dashStyle: 'Dash',
                width: 1,
                label: { text: 'Today', style: { color: '#64748B' } }
            }]
        },
        yAxis: {
            title: { text: undefined },
            labels: {
                 style: { color: '#000000', fontWeight: 'bold', fontSize: '12px' },
                 formatter: function() { return '$' + Math.round(this.value as number / 1000) + 'k'; }
            },
            gridLineColor: 'rgba(148, 163, 184, 0.1)',
            plotBands: [{
                from: q1,
                to: q3,
                color: 'rgba(253, 224, 71, 0.1)', // Light Yellow/Amber transparent
                label: {
                    text: `Median Consensus Range<br/>$${(q1/1000).toFixed(0)}k - $${(q3/1000).toFixed(0)}k`,
                    style: {
                        color: '#b45309', // Darker Amber text
                        fontWeight: 'bold',
                        fontSize: '12px'
                    },
                    align: 'right',
                    x: -10,
                    verticalAlign: 'bottom',
                    y: -10
                },
                zIndex: 0
            }],
            plotLines: [
                {
                    value: median,
                    color: 'rgba(253, 224, 71, 0.6)', 
                    width: 1,
                    zIndex: 1,
                    dashStyle: 'LongDash',
                    label: {
                        text: `Median: $${(median/1000).toFixed(0)}k`,
                        align: 'right',
                        style: { color: '#b45309', fontSize: '11px' }
                    }
                },
                // Current Price Line logic preserved
                ...(currentPriceMetrics ? [{
                    value: currentPriceMetrics.price,
                    color: currentPriceMetrics.color,
                    width: 2,
                    zIndex: 5,
                    dashStyle: 'Dot',
                    label: {
                        useHTML: true,
                        text: `
                            <div style="background: rgba(255,255,255,0.8); padding: 2px 6px; border-radius: 4px; border: 1px solid ${currentPriceMetrics.color}; font-weight: bold; color: ${currentPriceMetrics.color}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                $${Highcharts.numberFormat(currentPriceMetrics.price, 0, '.', ',')} 
                                <span style="font-size: 0.9em;">
                                    (${Highcharts.numberFormat(currentPriceMetrics.changePercent, 2)}%, 
                                    ${currentPriceMetrics.change > 0 ? '+' : ''}$${Highcharts.numberFormat(currentPriceMetrics.change, 0, '.', ',')})
                                </span>
                            </div>
                        `,
                        align: 'center',
                        verticalAlign: 'bottom',
                        y: -10,
                        x: 0
                    }
                }] as Highcharts.YAxisPlotLinesOptions[] : [])
            ],
            min: 50000,
            max: 200000
        },
        legend: { enabled: false },
        series: [
            // 1. Prediction Ranges
            // @ts-ignore
            ...seriesData.ranges,
            // 2. Real Price History
            {
                type: 'line',
                name: 'BTC Price (2026)',
                data: historyData.length > 0 ? historyData : [], 
                color: '#F59E0B', // Bitcoin Orange
                lineWidth: 3,
                zIndex: 20,
                marker: { enabled: false },
                tooltip: {
                    valueDecimals: 0,
                    valuePrefix: '$'
                }
            },
            // 3. Labels
            // @ts-ignore
            labelSeries
        ]
    };

    return (
        <div className="w-full p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
             <div className="mb-4 flex flex-wrap gap-4 justify-center text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-green-700 rounded"></span> Strong Bull
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-green-300 rounded"></span> Modest Bull
                </div>
                 <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-red-300 rounded"></span> Modest Bear
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-red-700 rounded"></span> Strong Bear
                </div>
            </div>
            <HighchartsReact
                highcharts={Highcharts}
                options={options}
            />
            <div className="mt-2 text-xs text-center text-gray-500">
                Sources: Major financial institutions. Labels distributed diagonally by target price for readability.
            </div>
        </div>
    );
};

export default BitcoinPredictionChart;
