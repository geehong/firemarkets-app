
"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

import { useFearAndGreed } from "@/hooks/analysis/useFearAndGreed";

export default function FearAndGreedGauge() {
  const { fngData, loading } = useFearAndGreed();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fngValue = fngData ? parseInt(fngData.value) : 50;
  const fngLabel = fngData ? fngData.value_classification : "Loading...";
  
  const fngChartOptions: any = {
    chart: { type: 'radialBar', background: 'transparent' },
    plotOptions: {
      radialBar: {
        startAngle: -135, endAngle: 135, hollow: { size: '60%' },
        track: { background: isDark ? '#374151' : '#e5e7eb' },
        dataLabels: {
          name: { offsetY: -10, show: true, color: isDark ? '#9CA3AF' : '#888', fontSize: '14px' },
          value: { offsetY: 5, color: isDark ? '#fff' : '#111', fontSize: '30px', show: true }
        }
      }
    },
    colors: [fngValue < 25 ? '#FF4560' : fngValue < 45 ? '#FEB019' : fngValue < 55 ? '#775DD0' : fngValue < 75 ? '#008FFB' : '#00E396'],
    fill: { type: 'solid' },
    stroke: { lineCap: 'round' },
    labels: [fngLabel],
  };

  return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
        <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-gray-100 w-full text-left">Crypto Fear & Greed Index</h3>
        <div className="relative">
            <ReactApexChart options={fngChartOptions} series={[fngValue]} type="radialBar" height={350} />
        </div>
        {!loading && (
             <div className="text-center mt-[-20px]">
                <p className="text-sm text-gray-500">Next Update: {fngData ? new Date(parseInt(fngData.timestamp) * 1000 + 86400000).toLocaleTimeString() : 'Unknown'}</p>
             </div>
        )}
      </div>
  );
}
