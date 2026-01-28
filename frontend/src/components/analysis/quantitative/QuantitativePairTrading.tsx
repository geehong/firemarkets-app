"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

import PairTradingSpreadChart from '@/components/charts/ohlcvcharts/PairTradingSpreadChart'

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
                    {tickerOptions.map((t) => <option key={`A-${t}`} value={t}>{t}</option>)}
                </select>
                <span className="self-center">vs</span>
                <select 
                    className="p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
                    value={tickerB} onChange={(e) => setTickerB(e.target.value)}
                >
                    {tickerOptions.map((t) => <option key={`B-${t}`} value={t}>{t}</option>)}
                </select>
             </div>
        </div>
        
        {/* Z-Score Analysis Chart */}
        {spreadData && spreadData.data && spreadData.data.length > 0 ? (
            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                 <PairTradingSpreadChart
                    data={spreadData.data}
                    tickerA={tickerA}
                    tickerB={tickerB}
                    height={500}
                 />
            </div>
        ) : (
            <div className="mt-8 p-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                {spreadLoading ? "Analyzing Spread..." : "No data available for selected pair."}
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
