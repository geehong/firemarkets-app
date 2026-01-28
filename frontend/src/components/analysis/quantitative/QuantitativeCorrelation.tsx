
"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface QuantitativeCorrelationProps {
  data: any;
  loading: boolean;
  days: number;
  onDaysChange: (days: number) => void;
}

export default function QuantitativeCorrelation({ data, loading, days, onDaysChange }: QuantitativeCorrelationProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const years = (days / 365).toFixed(1);

  if (loading) {
     return (
       <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
         <div className="p-10 text-center animate-pulse text-gray-400">자산 상관관계 데이터를 불러오는 중...</div>
       </div>
     );
  }
  
  // --- Heatmap Config ---
  const tickers = data?.tickers || [];
  const matrix = data?.matrix || {};
  const heatmapSeries = tickers.map((yTicker: string) => {
    return {
      name: yTicker,
      data: tickers.map((xTicker: string) => ({
        x: xTicker,
        y: (matrix[yTicker]?.[xTicker] || 0)
      }))
    };
  });

  const heatmapOptions: any = {
    chart: { 
      type: 'heatmap', 
      height: 450, 
      background: 'transparent', 
      toolbar: { show: true, tools: { download: true } } 
    },
    dataLabels: { 
      enabled: true, 
      formatter: (val: number) => val.toFixed(2),
      style: { colors: [isDark ? '#fff' : '#000'], fontSize: '11px' } 
    },
    colors: ["#008FFB"],
    xaxis: { labels: { style: { colors: isDark ? '#ccc' : '#333' } } },
    yaxis: { labels: { style: { colors: isDark ? '#ccc' : '#333' } } },
    theme: { mode: isDark ? 'dark' : 'light' },
    tooltip: {
      y: {
        formatter: (val: number) => `Correlation: ${val.toFixed(3)}`
      }
    },
    plotOptions: {
        heatmap: {
            shadeIntensity: 0.5, radius: 4, useFillColorAsStroke: false,
            colorScale: {
                ranges: [
                    { from: -1, to: -0.7, color: '#f73539', name: 'Strong Negative' },
                    { from: -0.69, to: -0.3, color: '#fb929e', name: 'Negative' },
                    { from: -0.29, to: 0.29, color: '#414555', name: 'Neutral' },
                    { from: 0.3, to: 0.69, color: '#88e99a', name: 'Positive' },
                    { from: 0.7, to: 1.0, color: '#2ecc59', name: 'Strong Positive' }
                ]
            }
        }
    }
  };

  // --- Calculate Summary ---
  const getCorrelationStrength = (val: number) => {
    if (val >= 0.7) return { text: "Strong Positive (강한 양의 상관관계)", color: "#2ecc59" };
    if (val >= 0.3) return { text: "Positive (양의 상관관계)", color: "#88e99a" };
    if (val >= -0.29 && val <= 0.29) return { text: "Neutral (중립)", color: "#9ca3af" }; // Gray for neutral
    if (val <= -0.7) return { text: "Strong Negative (강한 음의 상관관계)", color: "#f73539" };
    if (val <= -0.3) return { text: "Negative (음의 상관관계)", color: "#fb929e" };
    return { text: "Neutral (중립)", color: "#9ca3af" };
    return { text: "Neutral (중립)", color: "#9ca3af" };
  };

  const getAssetGroup = (type: string) => {
      if (!type) return "Unknown";
      const t = type.toLowerCase();
      if (t.includes("stock") || t.includes("etf") || t.includes("index") || t.includes("fund")) return "Equity";
      if (t.includes("crypto") || t.includes("coin")) return "Crypto";
      if (t.includes("commodity") || t.includes("future") || t.includes("metal")) return "Commodity";
      if (t.includes("forex") || t.includes("currency") || t.includes("fiat")) return "Forex";
      return t;
  };

  let summaryResult = null;
  if (!loading && data?.matrix && data?.tickers && data?.tickers.length > 1) {
      let maxVal = -2;
      let minVal = 2;
      let maxPair = null;
      let minPair = null;

      const tickers = data.tickers;
      const matrix = data.matrix;
      const assetInfo = data.asset_info || {};

      for (let i = 0; i < tickers.length; i++) {
          for (let j = i + 1; j < tickers.length; j++) {
              const tA = tickers[i];
              const tB = tickers[j];
              
              const val = matrix[tA]?.[tB];
              if (val === undefined) continue;

              // Filter same asset type if info available
              const typeA = assetInfo[tA]?.type;
              const typeB = assetInfo[tB]?.type;
              
              // Smart Grouping Exclusion (e.g. Stock & ETF are both Equity)
              if (typeA && typeB) {
                  const groupA = getAssetGroup(typeA);
                  const groupB = getAssetGroup(typeB);
                  if (groupA === groupB) continue;
              }

              // Update Max (Highest)
              if (val > maxVal) {
                  maxVal = val;
                  maxPair = { tA, tB, val };
              }
              // Update Min (Lowest)
              if (val < minVal) {
                  minVal = val;
                  minPair = { tA, tB, val };
              }
          }
      }

      if (maxPair) {
          const maxNameA = assetInfo[maxPair.tA]?.name || maxPair.tA;
          const maxNameB = assetInfo[maxPair.tB]?.name || maxPair.tB;
          const maxStrengthInfo = getCorrelationStrength(maxPair.val);

          // Only show min if it's different and interesting (val < 0.5 to avoid showing just "less strong positive")
          let minResult = null;
          if (minPair && minPair.val !== maxPair.val) {
             const minNameA = assetInfo[minPair.tA]?.name || minPair.tA;
             const minNameB = assetInfo[minPair.tB]?.name || minPair.tB;
             const minStrengthInfo = getCorrelationStrength(minPair.val);
             minResult = {
                assetA: minNameA,
                assetB: minNameB,
                value: minPair.val.toFixed(2),
                strength: minStrengthInfo.text,
                color: minStrengthInfo.color
             };
          }

          summaryResult = {
              max: {
                assetA: maxNameA,
                assetB: maxNameB,
                value: maxPair.val.toFixed(2),
                strength: maxStrengthInfo.text,
                color: maxStrengthInfo.color
              },
              min: minResult
          };
      }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex-1 w-full md:w-1/2">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">자산 상관관계 매트릭스 (Correlation Matrix)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">선택된 기간: {days}일 (약 {years}년)</p>
          {summaryResult && (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                 <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded mr-1">Highest</span>
                 <span className="font-semibold">{summaryResult.max.assetA}</span> - <span className="font-semibold">{summaryResult.max.assetB}</span>: <span className="font-bold">{summaryResult.max.value}</span> (<span className="font-bold" style={{ color: summaryResult.max.color }}>{summaryResult.max.strength}</span>)
              </p>
              {summaryResult.min && (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                   <span className="text-xs font-bold bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-1.5 py-0.5 rounded mr-1">Lowest</span>
                   <span className="font-semibold">{summaryResult.min.assetA}</span> - <span className="font-semibold">{summaryResult.min.assetB}</span>: <span className="font-bold">{summaryResult.min.value}</span> (<span className="font-bold" style={{ color: summaryResult.min.color }}>{summaryResult.min.strength}</span>)
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Period Selection Controls */}
        <div className="flex-1 w-full md:w-1/2 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
          <div className="flex justify-between mb-2 items-center">
             <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">분석 기간 설정</span>
             <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{years} Years ({days} Days)</span>
          </div>
          
          <div className="flex flex-col gap-3">
            <select
              value={days}
              onChange={(e) => onDaysChange(parseInt(e.target.value))}
              className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="30">1 Month (30d)</option>
              <option value="90">3 Months (90d)</option>
              <option value="180">6 Months (180d)</option>
              <option value="365">1 Year (365d)</option>
              <option value="730">2 Years (730d)</option>
              <option value="1095">3 Years (1095d)</option>
              <option value="1825">5 Years (1825d)</option>
              <option value="3650">10 Years (3650d)</option>
              <option value="7300">20 Years (7300d)</option>
            </select>

            <div className="pt-1">
              <input 
                type="range" 
                min="30" 
                max="7300" 
                step="30"
                value={days} 
                onChange={(e) => onDaysChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between mt-1 px-1">
                <span className="text-[10px] text-gray-400">1M</span>
                <span className="text-[10px] text-gray-400">10Y</span>
                <span className="text-[10px] text-gray-400">20Y</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {data?.excluded && data.excluded.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm">
          <div className="flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 flex-shrink-0 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <strong className="block mb-1">⚠️ 일부 자산이 분석에서 제외되었습니다 (Some assets excluded):</strong>
              <ul className="list-disc pl-4 space-y-1 text-xs sm:text-sm opacity-90">
                {data.excluded.map((item: any) => (
                  <li key={item.ticker}>
                    <span className="font-bold">{item.ticker}</span>: 
                    {item.reason === 'not_found' ? ' 자산을 찾을 수 없습니다.' : 
                     ` 현저하게 데이터가 부족하여 제외됨 (${years}년치를 요청했으나 ${(item.available / 365).toFixed(1)}년치만 있음)`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {!data || !data.matrix ? (
        <div className="p-20 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl">
           충분한 데이터가 없거나 상관관계를 계산할 수 없습니다. <br/>
           <span className="text-sm">기간을 줄이거나 다른 자산을 선택해 보세요.</span>
        </div>
      ) : (
        <div id="heatmap-chart" className="mt-2">
            <ReactApexChart options={heatmapOptions} series={heatmapSeries} type="heatmap" height={450} />
        </div>
      )}
    </div>
  );
}
