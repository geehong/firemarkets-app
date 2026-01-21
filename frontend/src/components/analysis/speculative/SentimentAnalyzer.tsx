
"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

import { useSentiment } from "@/hooks/analysis/useSentiment";

export default function SentimentAnalyzer() {
  const { inputText, setInputText, result, loading, analyzeText: handleAnalyze } = useSentiment();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getScore = () => {
    if (!result) return 50;
    const { label, score } = result;
    if (label === 'positive') return 50 + (score * 50); 
    if (label === 'negative') return 50 - (score * 50); 
    return 50; 
  };

  const sentimentScore = getScore();
  
  const sentimentChartOptions: any = {
    chart: { type: 'radialBar', background: 'transparent' },
    plotOptions: {
      radialBar: {
        startAngle: -135, endAngle: 135, hollow: { size: '60%' },
        track: { background: isDark ? '#374151' : '#e5e7eb' },
        dataLabels: {
          name: { offsetY: -10, show: true, color: isDark ? '#9CA3AF' : '#888', fontSize: '17px' },
          value: { offsetY: 5, color: isDark ? '#fff' : '#111', fontSize: '36px', show: true }
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
    labels: [result?.label?.toUpperCase() || 'NEUTRAL'],
  };

  const getSentimentColor = (label: string) => {
      if(label === 'positive') return 'text-green-500';
      if(label === 'negative') return 'text-red-500';
      return 'text-gray-500';
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
        <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-gray-100 w-full text-left">AI News Sentiment Gauge</h3>
        <div id="gauge-chart" className="relative">
            <ReactApexChart options={sentimentChartOptions} series={[sentimentScore]} type="radialBar" height={350} />
        </div>
        {result && (
            <div className={`text-2xl font-bold mt-[-20px] ${getSentimentColor(result.label)}`}>
                {result.label.toUpperCase()}
                <span className="text-sm text-gray-500 block text-center font-normal mt-1">
                    Confidence: {(result.score * 100).toFixed(1)}%
                </span>
            </div>
        )}
      </div>

      {/* Input Section */}
      <div className="col-span-1 lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">AI Market News Analyzer</h3>
        <p className="text-gray-500 text-sm mb-4">
            Enter any market news, rumors, or social media text below. The local AI agent will analyze the sentiment polarity in real-time.
        </p>
        
        <textarea
            className="w-full h-32 p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="e.g., Apple announced record-breaking quarterly earnings, beating expectations by 15%..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
        />
        
        <button
            onClick={handleAnalyze}
            disabled={loading || !inputText}
            className={`mt-4 w-full py-3 px-6 rounded-lg font-bold text-white transition-all
                ${loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30'
                }
            `}
        >
            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing on GPU...
                </span>
            ) : "Analyze Sentiment"}
        </button>
      </div>
    </>
  );
}
