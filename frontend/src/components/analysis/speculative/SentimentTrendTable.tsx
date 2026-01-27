"use client";

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import AgGridBaseTable from '@/components/tables/AgGridBaseTable'; // Adjust path if needed
import { ColDef } from 'ag-grid-community';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { useTheme } from 'next-themes';

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// --- Types ---
interface SentimentStat {
    time: string;
    avg_score: number;
    total_count: number;
    sentiment_counts: {
        positive: number;
        negative: number;
        neutral: number;
    };
}

interface GaugeData {
    period: string;
    score: number; // 0-100 for gauge position
    label: string;
    confidence: number; // 0-100 avg specific confidence
}

// --- Helper: Calculate Gauge Data ---
const calculateGaugeData = (periodLabel: string, points: SentimentStat[]): GaugeData => {
    if (!points || points.length === 0) {
        return { period: periodLabel, score: 50, label: 'Neutral', confidence: 0 };
    }

    let totalPos = 0;
    let totalNeg = 0;
    let totalNeu = 0;
    let totalScoreSum = 0;
    let totalCount = 0;

    points.forEach(p => {
        totalPos += p.sentiment_counts.positive;
        totalNeg += p.sentiment_counts.negative;
        totalNeu += p.sentiment_counts.neutral; // used for total count
        totalScoreSum += p.avg_score * p.total_count; // weighted sum of confidence
        totalCount += p.total_count;
    });

    if (totalCount === 0) {
         return { period: periodLabel, score: 50, label: 'Neutral', confidence: 0 };
    }

    // Polarity Score (-1 to 1)
    // Formula: (Pos - Neg) / Total
    // Ignored Neutral in polarity magnitude? Or include in denominator? 
    // Usually (Pos - Neg) / (Pos + Neg + Neu) gives a "Net Sentiment" diluted by neutrals.
    const netSentiment = (totalPos - totalNeg) / totalCount;
    
    // Map -1..1 to 0..100
    // -1 -> 0, 0 -> 50, 1 -> 100
    const gaugeVal = (netSentiment + 1) * 50;

    // Label
    let label = 'Neutral';
    if (gaugeVal > 60) label = 'Positive';
    if (gaugeVal < 40) label = 'Negative';

    // Avg Confidence of the classification (not polarity)
    const avgConf = (totalScoreSum / totalCount) * 100;

    return {
        period: periodLabel,
        score: gaugeVal,
        label,
        confidence: avgConf
    };
};

// --- Components ---

const SentimentGaugeCard = ({ data }: { data: GaugeData }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const getSentimentColor = (label: string) => {
        if (label === 'Positive') return 'text-green-500';
        if (label === 'Negative') return 'text-red-500';
        return 'text-gray-500';
    };

    const options: any = {
        chart: { type: 'radialBar', background: 'transparent' },
        plotOptions: {
            radialBar: {
                startAngle: -135, endAngle: 135, hollow: { size: '55%' },
                track: { background: isDark ? '#374151' : '#e5e7eb' },
                dataLabels: {
                    name: { offsetY: -10, show: true, color: isDark ? '#9CA3AF' : '#888', fontSize: '13px' },
                    value: { offsetY: 5, color: isDark ? '#fff' : '#111', fontSize: '22px', show: true, formatter: (val: number) => val.toFixed(0) }
                }
            }
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'dark', type: 'horizontal', shadeIntensity: 0.5,
                gradientToColors: ['#00E396'], inverseColors: true,
                opacityFrom: 1, opacityTo: 1, stops: [0, 100]
            }
        },
        stroke: { lineCap: 'round' },
        labels: [data.label.toUpperCase()],
        colors: [data.score > 60 ? '#22c55e' : data.score < 40 ? '#ef4444' : '#eab308']
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center shadow-sm">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">{data.period}</h4>
            <div className="relative -mt-4 -mb-6">
                <ReactApexChart options={options} series={[data.score]} type="radialBar" height={220} width={"100%"} />
            </div>
            <div className={`text-lg font-bold ${getSentimentColor(data.label)} mt-1`}>
                {data.label}
                <span className="block text-xs text-gray-400 font-normal text-center">
                    Conf: {data.confidence.toFixed(1)}%
                </span>
            </div>
        </div>
    );
};

const TrendCell = ({ value }: { value: number }) => {
    // Value here is avg_score (confidence 0-1) from API row.
    // It is just "confidence" and doesn't explicitly mean positive/negative without checking counts.
    // However, usually detailed rows might not have full breakdown in simple view? 
    // Wait, the row HAS sentiment_counts.
    // Ideally we pass the whole row to TrendCell, but CellRenderer receives `value`.
    // Let's rely on valid interpretation or just show numeric.
    // Users interpretation: High score usually means Strong Sentiment (if we assume Positive).
    // BUT actually, if I look at my API loop: `avg_score` is just `AVG(score)`.
    // It does not indicate polarity.
    // Let's remove the visual Trend arrow unless we know polarity.
    // Actually, I can use the same logic as the Gauge for each row to determine trend?
    // AgGrid `valueGetter`.
    return null; // Simplify for now or restore simple if desired.
};

// --- Main Component ---

export default function SentimentTrendTable() {
    const [data, setData] = useState<SentimentStat[]>([]);
    const [gauges, setGauges] = useState<GaugeData[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Interval controls the TABLE aggregation (1h, 4h, 8h...)
    // Period controls the fetched duration (auto-determined or large enough)
    const [interval, setInterval] = useState("1h");

    // 1. Fetch Dashboard Data (Fetch 30 days of hourly data to calculate all gauges locally)
    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                // Fetch 30d of 1h data (approx 720 points)
                const res = await fetch(`/api/v1/analysis/sentiment/history?period=30d&interval=1h`);
                if (!res.ok) return;
                const json: SentimentStat[] = await res.json();
                
                if (Array.isArray(json)) {
                    // Sort descending (Newest first)
                    const sorted = [...json].sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime());

                    // Calculate Summary Gauges
                    const g1h = calculateGaugeData('1H', sorted.slice(0, 1));
                    const g4h = calculateGaugeData('4H', sorted.slice(0, 4));
                    const g8h = calculateGaugeData('8H', sorted.slice(0, 8));
                    const g24h = calculateGaugeData('24H', sorted.slice(0, 24));
                    const g7d = calculateGaugeData('Week', sorted.slice(0, 24 * 7));
                    const g30d = calculateGaugeData('Month', sorted); // All 30d

                    setGauges([g1h, g4h, g8h, g24h, g7d, g30d]);
                }
            } catch (e) {
                console.error("Dashboard fetch error", e);
            }
        };
        fetchDashboard();
    }, []);

    // 2. Fetch Table Data (Based on user selected interval)
    useEffect(() => {
        const fetchTableStats = async () => {
            setLoading(true);
            try {
                // Auto-determine history duration ('period') based on 'interval'
                // to show a reasonable amount of rows.
                let fetchPeriod = '7d';
                if (interval === '1h' || interval === '4h' || interval === '8h') fetchPeriod = '30d'; 
                if (interval === '24h' || interval === '1d') fetchPeriod = '90d'; // 3 months of daily
                if (interval === '1w') fetchPeriod = '1y'; // 1 year of weekly
                if (interval === '30d') fetchPeriod = '1y'; // 1 year of monthly

                const res = await fetch(`/api/v1/analysis/sentiment/history?period=${fetchPeriod}&interval=${interval}`);
                if (!res.ok) throw new Error("Failed to fetch");
                const json = await res.json();
                
                if (Array.isArray(json)) {
                    // AgGrid expects rows. we reverse to show Newest First logic if needed, 
                    // or let grid sort. Let's provide newest first by default.
                    setData([...json].reverse()); 
                }
            } catch (e) {
                console.error("Failed to fetch table stats", e);
            } finally {
                setLoading(false);
            }
        };
        fetchTableStats();
    }, [interval]);

    const columnDefs = useMemo<ColDef[]>(() => [
        {
            field: 'time',
            headerName: 'Time',
            flex: 1.5,
            cellRenderer: (params: any) => {
                 const d = new Date(params.value);
                 // Format based on interval? 
                 // Simple standardized format: "Jan 24, 14:00"
                 return (
                     <span className="font-mono text-gray-700 dark:text-gray-300">
                        {d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                     </span>
                 )
            },
        },
        {
            width: 130,
            valueGetter: (params) => {
                 const s = params.data.sentiment_counts;
                 const total = params.data.total_count;
                 if(!total) return 50;
                 // Need normalized score without assuming data shape
                 // Use simple diff logic: (pos - neg) / total
                 const net = (s.positive - s.negative) / total;
                 return (net + 1) * 50;
            },
            headerName: 'Score (0-100)',
            valueFormatter: (p) => p.value.toFixed(1),
            cellStyle: (params) => {
                 if(params.value > 60) return { color: '#22c55e', fontWeight: 'bold' };
                 if(params.value < 40) return { color: '#ef4444', fontWeight: 'bold' };
                 return { color: 'gray', fontWeight: 'normal' };
            }
        },
        {
            field: 'avg_score',
            headerName: 'Avg Conf.',
            width: 120,
            valueFormatter: (p) => `${(p.value * 100).toFixed(1)}%`
        },
        {
            field: 'total_count',
            headerName: 'Articles',
            width: 100,
        },
        {
            headerName: 'Sentiment (Pos/Neg/Neu)',
            flex: 2,
            cellRenderer: (params: any) => {
                 const s = params.data.sentiment_counts;
                 return (
                     <div className="flex gap-3 font-mono text-xs">
                         <span className="text-green-600 font-bold">{s.positive} P</span>
                         <span className="text-red-600 font-bold">{s.negative} N</span>
                         <span className="text-gray-500 font-bold">{s.neutral} Z</span>
                     </div>
                 )
            }
        }
    ], []);

    return (
        <div className="space-y-8">
            {/* Dashboard Gauges - 6 Grid (3 per row) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                {gauges.map((g) => (
                    <SentimentGaugeCard key={g.period} data={g} />
                ))}
                {gauges.length === 0 && (
                    <div className="col-span-6 text-center py-8 text-gray-400">Loading Dashboard...</div>
                )}
            </div>

            {/* Historical Table */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 px-1 border-b border-gray-100 dark:border-gray-800 pb-2">
                     <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Historical Trend Log</h3>
                     
                     <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Interval</span>
                        <select 
                            value={interval}
                            onChange={(e) => setInterval(e.target.value)}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                        >
                            <option value="1h">1 Hour (1H)</option>
                            <option value="4h">4 Hours (4H)</option>
                            <option value="8h">8 Hours (8H)</option>
                            <option value="24h">Daily (1D)</option>
                            <option value="1w">Weekly (1W)</option>
                            <option value="30d">Monthly (1M)</option>
                        </select>
                     </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm relative z-0">
                    <AgGridBaseTable 
                        rows={data} 
                        columns={columnDefs} 
                        height={500} 
                        loading={loading}
                    />
                </div>
            </div>
        </div>
    );
}
