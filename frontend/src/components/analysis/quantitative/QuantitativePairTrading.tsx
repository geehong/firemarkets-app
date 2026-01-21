
"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

import { useSpreadAnalysis } from "@/hooks/analysis/useSpreadAnalysis";

interface QuantitativePairTradingProps {
  availableTickers?: string[];
}

export default function QuantitativePairTrading({ availableTickers = [] }: QuantitativePairTradingProps) {
  const { spreadData, loading: spreadLoading, tickerA, setTickerA, tickerB, setTickerB } = useSpreadAnalysis();

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Use passed tickers or fallback list if empty
  const tickerOptions = availableTickers.length > 0 
    ? availableTickers 
    : ["BTCUSDT", "ETHUSDT", "SPY", "QQQ", "GLD", "TSLA", "AAPL", "NVDA"];

  // --- Spread Chart Config ---
  const spreadChartSeries = spreadData ? [
    { name: 'Z-Score', type: 'line', data: spreadData.data.map((d: any) => ({ x: d.date, y: d.z_score })) },
    { name: 'Log Spread', type: 'area', data: spreadData.data.map((d: any) => ({ x: d.date, y: d.spread })) }
  ] : [];

  const spreadChartOptions: any = {
    chart: { type: 'line', height: 350, background: 'transparent', toolbar: { show: false } },
    stroke: { width: [2, 1], curve: 'smooth' },
    colors: ['#FF4560', '#008FFB'],
    title: { text: `Statistical Arbitrage: ${tickerA} vs ${tickerB}`, align: 'left', style: { color: isDark ? '#fff' : '#333' } },
    xaxis: { type: 'datetime', labels: { style: { colors: isDark ? '#ccc' : '#333' } } },
    yaxis: [
        { 
            title: { text: 'Z-Score', style: { color: '#FF4560' } }, 
            labels: { 
                formatter: (val: number) => val?.toFixed(2),
                style: { colors: isDark ? '#ccc' : '#333' } 
            } 
        },
        { 
            opposite: true, 
            title: { text: 'Log Price Ratio', style: { color: '#008FFB' } }, 
            labels: { 
                formatter: (val: number) => val?.toFixed(2),
                style: { colors: isDark ? '#ccc' : '#333' } 
            } 
        }
    ],
    tooltip: {
        y: {
            formatter: (val: number) => val?.toFixed(2)
        }
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    annotations: {
        yaxis: [
            { y: 2, borderColor: '#FF4560', label: { style: { color: '#fff', background: '#FF4560' }, text: 'Sell A / Buy B' } },
            { y: -2, borderColor: '#00E396', label: { style: { color: '#fff', background: '#00E396' }, text: 'Buy A / Sell B' } }
        ]
    }
  };

  return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
             <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">통계적 차익거래 (Pair Trading Analysis)</h3>
                <p className="text-sm text-gray-500">높은 상관관계를 가진 두 자산의 괴리(Spread)를 분석합니다.</p>
             </div>
             <div className="flex gap-2">
                <select 
                    className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
                    value={tickerA} onChange={(e) => setTickerA(e.target.value)}
                >
                    {tickerOptions.map((t: string) => <option key={`A-${t}`} value={t}>{t}</option>)}
                </select>
                <span className="self-center">vs</span>
                <select 
                    className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
                    value={tickerB} onChange={(e) => setTickerB(e.target.value)}
                >
                    {tickerOptions.map((t: string) => <option key={`B-${t}`} value={t}>{t}</option>)}
                </select>
             </div>
        </div>
        
        {spreadLoading ? (
            <div className="h-[350px] flex items-center justify-center text-gray-500">Calculating Spread Model...</div>
        ) : (
            <div id="spread-chart">
                {spreadData && <ReactApexChart options={spreadChartOptions} series={spreadChartSeries} type="line" height={350} />}
            </div>
        )}
        
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
             <h4 className="font-semibold mb-1">Current Status:</h4>
             {spreadData && (
                <p>
                    Z-Score: <strong>{spreadData.latest_z_score?.toFixed(2)}</strong> — 
                    {spreadData.latest_z_score > 2 ? <span className="text-red-500"> Overvalued (Sell {tickerA} / Buy {tickerB})</span> :
                     spreadData.latest_z_score < -2 ? <span className="text-green-500"> Undervalued (Buy {tickerA} / Sell {tickerB})</span> :
                     " Neutral Range (No Signal)"}
                </p>
             )}
        </div>
      </div>
  );
}
