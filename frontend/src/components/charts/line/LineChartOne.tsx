"use client";

import React, { useMemo } from "react";

import { ApexAxisChartSeries, ApexOptions } from "apexcharts";

import dynamic from "next/dynamic";
// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

const DEFAULT_CATEGORIES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DEFAULT_SERIES: ApexAxisChartSeries = [
  {
    name: "Sales",
    data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235],
  },
  {
    name: "Revenue",
    data: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140],
  },
];

type LineChartOneProps = {
  categories?: string[];
  series?: ApexAxisChartSeries;
  height?: number;
  title?: string;
  colors?: string[];
  yAxisLabelFormatter?: (value: number) => string;
  minWidth?: number | string;
};

export default function LineChartOne({
  categories = DEFAULT_CATEGORIES,
  series = DEFAULT_SERIES,
  height = 310,
  title,
  colors = ["#465FFF", "#9CB9FF"],
  yAxisLabelFormatter,
  minWidth = "1000px",
}: LineChartOneProps) {
  const options: ApexOptions = useMemo(() => ({
    legend: {
      show: series.length > 1,
      position: "top",
      horizontalAlign: "left",
    },
    colors,
    chart: {
      fontFamily: "Outfit, sans-serif",
      height,
      type: "line",
      toolbar: {
        show: false,
      },
      animations: {
        enabled: true,
      },
    },
    stroke: {
      curve: "straight",
      width: series.map(() => 2),
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0,
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 6,
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      enabled: true,
      x: {
        show: true,
      },
      y: {
        formatter: yAxisLabelFormatter,
      },
    },
    title: title
      ? {
          text: title,
          align: "left",
          style: {
            fontSize: "16px",
            fontWeight: 600,
          },
        }
      : undefined,
    xaxis: {
      type: "category",
      categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      tooltip: {
        enabled: false,
      },
      labels: {
        style: {
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: "#6B7280",
        },
        formatter: yAxisLabelFormatter,
      },
    },
  }), [categories, series, height, title, colors, yAxisLabelFormatter]);

  const computedMinWidth = typeof minWidth === "number" ? `${minWidth}px` : minWidth;

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div id="chartEight" style={{ minWidth: computedMinWidth }}>
        <ReactApexChart
          options={options}
          series={series}
          type="area"
          height={height}
        />
      </div>
    </div>
  );
}
