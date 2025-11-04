"use client";
import React, { useMemo } from "react";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useQueries } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface MultiAssetLineChartProps {
  assetIdentifiers: string[];
  assetNames?: string[];
  height?: number;
}

export default function MultiAssetLineChart({ 
  assetIdentifiers, 
  assetNames,
  height = 350 
}: MultiAssetLineChartProps) {
  // 각 자산의 OHLCV 데이터 가져오기 - useQueries를 사용하여 동적 쿼리 처리
  const ohlcvQueries = useQueries({
    queries: assetIdentifiers.map(identifier => ({
      queryKey: ['ohlcv', identifier, { dataInterval: '1d', limit: 90 }],
      queryFn: () => apiClient.getAssetsOhlcv({
        asset_identifier: identifier,
        data_interval: '1d',
        limit: 90,
      }),
      enabled: !!identifier,
      staleTime: 1 * 60 * 1000, // 1분
    })),
  });

  // 차트 데이터 준비
  const series = useMemo(() => {
    if (!assetIdentifiers || assetIdentifiers.length === 0) {
      return [];
    }
    
    return assetIdentifiers.map((identifier, index) => {
      const query = ohlcvQueries[index];
      if (!query) {
        return {
          name: assetNames?.[index] || identifier,
          data: []
        };
      }
      
      const data = query.data;
      const chartData = Array.isArray(data) 
        ? data 
        : (data?.data || data?.rows || []);
      
      if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
        return {
          name: assetNames?.[index] || identifier,
          data: []
        };
      }

      // 가격 데이터를 시계열로 변환
      const seriesData = chartData.map((item: any) => {
        const timestamp = new Date(item.timestamp_utc || item.Date).getTime();
        const price = parseFloat(item.close_price || item.Price || item.price || '0');
        return [timestamp, price];
      }).sort((a: any, b: any) => a[0] - b[0]);

      return {
        name: assetNames?.[index] || identifier,
        data: seriesData
      };
    }).filter(s => s.data.length > 0);
  }, [assetIdentifiers, assetNames, ohlcvQueries]);

  const isLoading = ohlcvQueries.some((q: any) => q.isLoading);
  const hasError = ohlcvQueries.some((q: any) => q.error);

  const colors = [
    "#465FFF", 
    "#9CB9FF", 
    "#2ecc59", 
    "#f73539",
    "#FFA500",
    "#9B59B6"
  ];

  const options: ApexOptions = {
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      labels: {
        colors: "#ffffff",
      },
    },
    colors: colors.slice(0, assetIdentifiers.length),
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: height,
      type: "line",
      background: "transparent",
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: true,
        type: 'x',
      },
    },
    stroke: {
      curve: "smooth",
      width: [2, 2, 2, 2, 2, 2],
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
      borderColor: "#374151",
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
          color: "#374151",
        },
      },
    },
    tooltip: {
      enabled: true,
      theme: "dark",
      x: {
        format: "dd MMM yyyy",
      },
      y: {
        formatter: (value: number) => {
          return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(value);
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      type: "datetime",
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: "#9CA3AF",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "12px",
          colors: "#9CA3AF",
        },
        formatter: (value: number) => {
          return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 2
          }).format(value);
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <div className="text-gray-500">Loading chart data...</div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <div className="text-red-500">Error loading chart data</div>
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div id="multiAssetChart" className="min-w-[1000px]">
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

