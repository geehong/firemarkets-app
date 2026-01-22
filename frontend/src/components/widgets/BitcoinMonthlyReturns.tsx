"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { CryptoPriceCard } from './PriceCards';
import MonthlyReturnsFlow from './MonthlyReturnsFlow';

interface OHLCVData {
    timestamp_utc: string;
    open_price: number;
    high_price: number;
    low_price: number;
    close_price: number;
    volume: number;
    change_percent: number;
    data_interval: string;
}

interface MonthlyData {
    year: number;
    month: number;
    value: number; // Returns %
    price: number; // Close Price
    open: number;
    close: number;
}

interface YearRow {
    year: number;
    months: (MonthlyData | null)[];
    totalReturn: number;
}

// Color interpolation helper import
import { interpolateColor } from '@/utils/colorUtils';


export const BitcoinMonthlyReturns: React.FC = () => {
    const t = useTranslations('onChain.monthlyReturns'); // Assuming keys exist
    const [data, setData] = useState<OHLCVData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'heatmap' | 'cards' | 'workflow'>('heatmap');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch monthly data for Bitcoin (limit 300 months ~ 25 years) via v2 API
                const response = await apiClient.v2GetOhlcv('BTC', {
                    data_interval: '1M',
                    limit: 300
                });
                setData(response.data);
            } catch (err: any) {
                console.error("Failed to fetch monthly returns:", err);
                setError(err.message || "Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const processedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const yearsMap = new Map<number, MonthlyData[]>();

        data.forEach(item => {
            const date = new Date(item.timestamp_utc);
            const year = date.getFullYear();
            const month = date.getMonth() + 1; // 1-12

            // Calculate return if change_percent is missing
            let val = item.change_percent;

            const monthlyData: MonthlyData = {
                year,
                month,
                value: val,
                price: item.close_price,
                open: item.open_price,
                close: item.close_price
            };

            if (!yearsMap.has(year)) {
                yearsMap.set(year, []);
            }
            yearsMap.get(year)?.push(monthlyData);
        });

        const result: YearRow[] = [];
        const sortedYears = Array.from(yearsMap.keys()).sort((a, b) => b - a);

        sortedYears.forEach(year => {
            const monthsData = yearsMap.get(year) || [];
            const rowMonths: (MonthlyData | null)[] = Array(12).fill(null);

            // Calculate Total Return for the year
            // Compound return: (1+r1)*(1+r2)... - 1
            let compoundFactor = 1;

            monthsData.forEach(m => {
                rowMonths[m.month - 1] = m;
                if (m.value !== undefined && m.value !== null) {
                    compoundFactor *= (1 + m.value / 100);
                }
            });

            const totalReturn = (compoundFactor - 1) * 100;

            result.push({
                year,
                months: rowMonths,
                totalReturn
            });
        });

        return result;
    }, [data]);

    // Flat list of monthly data for Card View, sorted descending by date
    const flatMonthlyData = useMemo(() => {
        if (!data) return [];
        return [...data].sort((a, b) => new Date(b.timestamp_utc).getTime() - new Date(a.timestamp_utc).getTime())
            .map(item => {
                const date = new Date(item.timestamp_utc);
                return {
                    ...item,
                    year: date.getFullYear(),
                    month: date.getMonth() + 1
                }
            });
    }, [data]);

    // Flat list of Yearly data for Workflow View
    const flatYearlyData = useMemo(() => {
        if (!processedData) return [];
        return processedData.map(row => {
            // Find last non-null month for close price
            const lastValidMonth = [...row.months].reverse().find(m => m !== null);
            return {
                year: row.year,
                yearClosePrice: lastValidMonth ? lastValidMonth.price : 0,
                totalReturn: row.totalReturn
            };
        });
    }, [processedData]);


    if (loading) {
        return <div className="text-white p-4">Loading Monthly Returns...</div>;
    }

    if (error) {
        return <div className="text-red-500 p-4">Error: {error}</div>;
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return (
        <div className="w-full bg-[#1e222d] rounded-lg shadow-lg p-6 text-white min-w-[800px]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Bitcoin Monthly Returns</h2>

                {/* Tab Switcher */}
                <div className="flex space-x-2 bg-[#2a2e39] p-1 rounded-md">
                    <button
                        onClick={() => setActiveTab('heatmap')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'heatmap'
                            ? 'bg-[#363a45] text-white shadow'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Heatmap
                    </button>
                    <button
                        onClick={() => setActiveTab('cards')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'cards'
                            ? 'bg-[#363a45] text-white shadow'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Cards
                    </button>
                    <button
                        onClick={() => setActiveTab('workflow')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'workflow'
                            ? 'bg-[#363a45] text-white shadow'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Workflow
                    </button>
                </div>
            </div>

            {activeTab === 'heatmap' ? (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="p-2 text-left font-semibold border-b border-gray-700">Year</th>
                                {months.map(m => (
                                    <th key={m} className="p-2 text-center font-semibold border-b border-gray-700 w-[7%]">{m}</th>
                                ))}
                                <th className="p-2 text-right font-semibold border-b border-gray-700">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.map((row) => (
                                <tr key={row.year} className="hover:bg-[#2a2e39] transition-colors">
                                    <td className="p-2 font-medium border-b border-gray-800">{row.year}</td>
                                    {row.months.map((m, idx) => (
                                        <td
                                            key={idx}
                                            className="p-1 border-b border-gray-800 relative group text-center align-middle"
                                            style={{
                                                backgroundColor: m ? interpolateColor(m.value) : 'transparent',
                                                color: 'white',
                                            }}
                                        >
                                            {m ? (
                                                <div className="flex flex-col items-center justify-center h-full min-h-[50px] leading-tight">
                                                    {/* Price */}
                                                    <span className="font-medium opacity-90 drop-shadow-md text-[11px]">${m.price.toLocaleString()}</span>
                                                    {/* Return % */}
                                                    <span className="font-bold drop-shadow-md text-[13px] mt-0.5" >
                                                        {typeof m.value === 'number' ? (
                                                            <>
                                                                {m.value > 0 ? '+' : ''}{m.value.toFixed(1)}%
                                                            </>
                                                        ) : '-'}
                                                    </span>

                                                    {/* Tooltip */}
                                                    <div className="absolute hidden group-hover:block z-10 bg-black bg-opacity-90 p-2 rounded text-xs whitespace-nowrap -bottom-14 left-1/2 transform -translate-x-1/2 shadow-xl border border-gray-600 pointer-events-none">
                                                        <div className="font-bold text-[#00d4ff] mb-1">{m.year}-{String(m.month).padStart(2, '0')}</div>
                                                        <div>Close: <span className="text-[#00d4ff]">${m.price.toLocaleString()}</span></div>
                                                        <div>
                                                            Return:
                                                            {typeof m.value === 'number' ? (
                                                                <span style={{ color: m.value > 0 ? '#2ecc59' : m.value < 0 ? '#f73539' : 'white' }}>
                                                                    {m.value > 0 ? '+' : ''}{m.value.toFixed(2)}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400"> N/A</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="min-h-[50px]"></div>
                                            )}
                                        </td>
                                    ))}
                                    <td
                                        className="p-2 text-right font-bold border-b border-gray-800"
                                        style={{
                                            color: row.totalReturn > 0 ? '#2ecc59' : row.totalReturn < 0 ? '#f73539' : 'white'
                                        }}
                                    >
                                        {row.totalReturn > 0 ? '+' : ''}{row.totalReturn.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="mt-4 flex justify-end items-center text-xs text-gray-400 gap-4">
                        <div className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-[#f73539]"></span> -50%
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-[#414555]"></span> 0%
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-[#2ecc59]"></span> +50%
                        </div>
                    </div>
                </div>
            ) : activeTab === 'cards' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                    {flatMonthlyData.map((item, index) => {
                        const dateStr = `${item.year}-${String(item.month).padStart(2, '0')}`;
                        return (
                            <CryptoPriceCard
                                key={`${item.timestamp_utc}-${index}`}
                                symbol="BTC"
                                name={dateStr}
                                price={item.close_price}
                                change24h={item.change_percent}
                                showIcon={false}
                                size="small"
                                className="border border-gray-700"
                                customBackgroundColor={interpolateColor(item.change_percent)}
                                textColor='text-white'
                            />
                        )
                    })}
                </div>
            ) : (
                <MonthlyReturnsFlow data={flatYearlyData} />
            )}
        </div>
    );
};
