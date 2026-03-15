"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface SimpleAreaChartProps {
  data: { date: string; value: number }[];
  height?: number;
  color?: string;
}

export default function SimpleAreaChart({ data, height = 200, color = "#4f46e5" }: SimpleAreaChartProps) {
  // apexcharts expects oldest to newest
  // if data is [latest, oldest], we reverse it. 
  // We'll detect based on dates if possible or just assume reverse is needed if backend sent DESC.
  const chartData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const options: ApexOptions = {
    chart: {
      type: "area",
      height: height,
      toolbar: { show: false },
      sparkline: { enabled: true },
      animations: { enabled: false }, // Disable animations to avoid rendering glitches
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [20, 100],
      },
    },
    colors: [color],
    tooltip: {
      enabled: true,
      theme: "dark",
      x: { format: 'yyyy-MM-dd' },
      y: {
        formatter: (val) => val.toFixed(2),
      },
    },
    xaxis: {
      type: "datetime",
    },
    yaxis: {
      min: (min) => min * 0.99,
      max: (max) => max * 1.01,
      labels: { show: false },
    },
    grid: { show: false },
  };

  const series = [
    {
      name: "Data",
      data: chartData.map((d) => ({
        x: new Date(d.date).getTime(),
        y: d.value
      })),
    },
  ];

  return (
    <div style={{ height: height, width: '100%' }}>
      <ReactApexChart options={options} series={series} type="area" height={height} />
    </div>
  );
}
