
"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface QuantitativeCorrelationProps {
  data: any;
  loading: boolean;
}

export default function QuantitativeCorrelation({ data, loading }: QuantitativeCorrelationProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (loading) {
     return <div className="p-10 text-center animate-pulse">Loading Correlation Data...</div>;
  }
  
  if (!data || !data.matrix) {
     return <div className="p-10 text-center text-red-500">Failed to load correlation data.</div>;
  }

  // --- Heatmap Config ---
  const tickers = data.tickers || [];
  const matrix = data.matrix || {};
  const heatmapSeries = tickers.map((yTicker: string) => {
    return {
      name: yTicker,
      data: tickers.map((xTicker: string) => ({
        x: xTicker,
        y: (matrix[yTicker]?.[xTicker] || 0).toFixed(2)
      }))
    };
  });

  const heatmapOptions: any = {
    chart: { type: 'heatmap', height: 450, background: 'transparent', toolbar: { show: false } },
    dataLabels: { enabled: true, style: { colors: isDark ? ['#fff'] : ['#000'] } },
    colors: ["#008FFB"],
    title: { text: 'Asset Correlation Matrix (90 Days)', align: 'left', style: { color: isDark ? '#fff' : '#333' } },
    xaxis: { labels: { style: { colors: isDark ? '#ccc' : '#333' } } },
    yaxis: { labels: { style: { colors: isDark ? '#ccc' : '#333' } } },
    theme: { mode: isDark ? 'dark' : 'light' },
    plotOptions: {
        heatmap: {
            shadeIntensity: 0.5, radius: 2, useFillColorAsStroke: false,
            colorScale: {
                ranges: [
                    { from: -1, to: -0.5, color: '#FF4560', name: 'Negative' },
                    { from: -0.49, to: 0.49, color: '#FEB019', name: 'Neutral' },
                    { from: 0.5, to: 1.0, color: '#00E396', name: 'Positive' }
                ]
            }
        }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100 px-2">자산 상관관계 (Correlation)</h3>
      <div id="heatmap-chart">
          <ReactApexChart options={heatmapOptions} series={heatmapSeries} type="heatmap" height={450} />
      </div>
    </div>
  );
}
