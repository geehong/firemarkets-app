"use client"

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { apiClient } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import ChartControls from '@/components/common/ChartControls';
import { getColorMode } from '@/constants/colorModes';

// Load Highcharts modules in correct order
import 'highcharts/modules/stock';
import 'highcharts/modules/exporting';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/drag-panes';
import 'highcharts/modules/navigator';

interface OnChainChartProps {
  assetId?: string;
  title?: string;
  height?: number;
  showRangeSelector?: boolean;
  showStockTools?: boolean;
  showExporting?: boolean;
  metricId?: string;
}

const OnChainChart: React.FC<OnChainChartProps> = ({
  assetId = 'BTCUSDT',
  title = 'Bitcoin Price vs MVRV Z-Score Correlation',
  height = 800,
  showRangeSelector = true,
  showStockTools = false,
  showExporting = true,
  metricId = 'mvrv_z_score'
}) => {
  console.log('[OnChainChart] 마운트', { assetId, metricId, height, showRangeSelector, showStockTools, showExporting });
  const [priceData, setPriceData] = useState<number[][]>([]);
  const [mvrvData, setMvrvData] = useState<number[][]>([]);
  const [correlation, setCorrelation] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackTried, setFallbackTried] = useState(false);
  const [isFetchingFallback, setIsFetchingFallback] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'spline' | 'area'>('line');
  const [showFlags, setShowFlags] = useState(true);
  const [useLogScale, setUseLogScale] = useState(false);
  const [isAreaMode, setIsAreaMode] = useState(false);
  const [lineSplineMode, setLineSplineMode] = useState<'line' | 'spline'>('line');
  const [colorMode, setColorMode] = useState<'dark' | 'vivid' | 'high-contrast' | 'simple'>('vivid');
  const [currentCorrelation, setCurrentCorrelation] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const chartRef = useRef<HighchartsReact.RefObject>(null);

  // 모바일 감지
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // 차트 타입 변경 핸들러
  const handleChartTypeChange = (type: 'line' | 'spline' | 'area') => {
    setChartType(type);
    const chart = chartRef.current?.chart;
    if (chart && chart.series && chart.series.length > 0) {
      chart.series.forEach((series: any) => {
        series.update({ type }, false);
      });
      chart.redraw();
    }
  };

  // Line/Spline 토글 핸들러
  const handleLineSplineToggle = () => {
    const newLineSplineMode = lineSplineMode === 'line' ? 'spline' : 'line';
    setLineSplineMode(newLineSplineMode);
    
    // Area 모드가 켜져있으면 spline-area 또는 area, 꺼져있으면 line/spline
    let newChartType;
    if (isAreaMode) {
      newChartType = newLineSplineMode === 'spline' ? 'areaspline' : 'area';
    } else {
      newChartType = newLineSplineMode;
    }
    setChartType(newChartType);
    
    const chart = chartRef.current?.chart;
    if (chart && chart.series && chart.series.length > 0) {
      chart.series.forEach((series: any) => {
        series.update({ type: newChartType }, false);
      });
      chart.redraw();
    }
  };

  // Area 모드 토글 핸들러
  const handleAreaModeToggle = () => {
    const newAreaMode = !isAreaMode;
    setIsAreaMode(newAreaMode);
    
    // Area 모드가 켜져있으면 현재 lineSplineMode에 따라 area/areaspline, 꺼져있으면 line/spline
    let newChartType;
    if (newAreaMode) {
      newChartType = lineSplineMode === 'spline' ? 'areaspline' : 'area';
    } else {
      newChartType = lineSplineMode;
    }
    setChartType(newChartType);
    
    const chart = chartRef.current?.chart;
    if (chart && chart.series && chart.series.length > 0) {
      chart.series.forEach((series: any) => {
        series.update({ type: newChartType }, false);
      });
      chart.redraw();
    }
  };

  // 로그 스케일 토글 핸들러
  const handleLogScaleToggle = () => {
    setUseLogScale(!useLogScale);
    const chart = chartRef.current?.chart;
    if (chart) {
      // 모든 Y축을 로그 스케일로 변경
      chart.yAxis.forEach((axis: any) => {
        axis.update({
          type: !useLogScale ? 'logarithmic' : 'linear'
        }, false);
      });
      chart.redraw();
    }
  };

  // 온체인 메트릭 데이터 조회 (통합 엔드포인트)
  const { data: onchainData, isLoading: onchainLoading, error: onchainError } = useQuery({
    queryKey: ['onchain', assetId, metricId],
    queryFn: () => apiClient.getOnchainMetricsData(assetId, metricId, 10000),
    enabled: !!assetId && !!metricId,
    staleTime: 10 * 60 * 1000, // 10분
    retry: 3,
  });

  // 데이터 처리
  useEffect(() => {
    if (onchainData?.series) {
      try {
        const dateData = onchainData.series.date || [];
        const priceSeries = onchainData.series.price || [];
        const metricSeries = onchainData.series[metricId] || [];

        // 가격 데이터 처리
        const formattedPriceData: number[][] = [];
        for (let i = 0; i < Math.min(dateData.length, priceSeries.length); i++) {
          const dateStr = dateData[i].date;
          const price = priceSeries[i].close_price;
          if (dateStr && price !== undefined && price !== null) {
            const t = new Date(dateStr).getTime();
            const v = parseFloat(price);
            if (!isNaN(t) && !isNaN(v) && t > 0) {
              formattedPriceData.push([t, v]);
            }
          }
        }

        // 메트릭 데이터 처리
        const formattedMetricData: number[][] = [];
        for (let i = 0; i < Math.min(dateData.length, metricSeries.length); i++) {
          const dateStr = dateData[i].date;
          const raw = metricSeries[i];
          const v = raw && typeof raw === 'object' && 'value' in raw ? raw.value : Number(raw);
          if (dateStr && v !== undefined && v !== null) {
            const t = new Date(dateStr).getTime();
            const nv = parseFloat(v);
            if (!isNaN(t) && !isNaN(nv)) {
              formattedMetricData.push([t, nv]);
            }
          }
        }

        const sortedPriceData = formattedPriceData.sort((a, b) => a[0] - b[0]);
        const sortedMetricData = formattedMetricData.sort((a, b) => a[0] - b[0]);

        setPriceData(sortedPriceData);
        setMvrvData(sortedMetricData);

        // 백엔드에서 계산된 상관관계 사용
        if (onchainData.analysis && onchainData.analysis.correlation) {
          setCorrelation(onchainData.analysis.correlation[metricId]);
        }

        setError(null);
      } catch (err) {
        setError(`데이터 처리 중 오류 발생: ${err}`);
      }
    }

    setLoading(onchainLoading);
    
    if (onchainError) {
      setError(`데이터 로딩 실패: ${onchainError}`);
    }
  }, [onchainData, metricId, onchainLoading, onchainError]);

  // 상관계수 계산 함수
  const calculateCorrelation = (priceData: number[][], metricData: number[][]) => {
    if (priceData.length === 0 || metricData.length === 0) return null;

    // 시간 기준으로 데이터 매칭
    const matchedData: { price: number; metric: number }[] = [];
    
    priceData.forEach(([timestamp, price]) => {
      const closestMetric = metricData.reduce((closest, [metricTimestamp, metricValue]) => {
        const currentDiff = Math.abs(timestamp - metricTimestamp);
        const closestDiff = Math.abs(timestamp - closest[0]);
        return currentDiff < closestDiff ? [metricTimestamp, metricValue] : closest;
      }, metricData[0]);
      
      if (closestMetric) {
        matchedData.push({ price, metric: closestMetric[1] });
      }
    });

    if (matchedData.length < 2) return null;

    // 피어슨 상관계수 계산
    const n = matchedData.length;
    const sumX = matchedData.reduce((sum, item) => sum + item.price, 0);
    const sumY = matchedData.reduce((sum, item) => sum + item.metric, 0);
    const sumXY = matchedData.reduce((sum, item) => sum + item.price * item.metric, 0);
    const sumX2 = matchedData.reduce((sum, item) => sum + item.price * item.price, 0);
    const sumY2 = matchedData.reduce((sum, item) => sum + item.metric * item.metric, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  // 차트 옵션
  const chartOptions: Highcharts.Options = {
    chart: {
      height: height,
      backgroundColor: '#ffffff',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif'
      }
    },
    title: {
      text: title,
      style: {
        color: '#1f2937',
        fontSize: isMobile ? '16px' : '20px'
      }
    },
    subtitle: {
      text: correlation !== null ? `상관계수: ${typeof correlation === 'number' ? correlation.toFixed(3) : correlation}` : '',
      style: {
        color: '#6b7280'
      }
    },
    xAxis: {
      type: 'datetime',
      labels: {
        style: {
          color: '#374151'
        }
      },
      gridLineColor: '#e5e7eb'
    },
    yAxis: [
      {
        title: {
          text: 'Bitcoin Price (USD)',
          style: {
            color: '#1f2937'
          }
        },
        labels: {
          style: {
            color: '#374151'
          },
          formatter: function() {
            return '$' + this.value.toLocaleString();
          }
        },
        gridLineColor: '#e5e7eb',
        opposite: false,
        type: useLogScale ? 'logarithmic' : 'linear'
      },
      {
        title: {
          text: 'MVRV Z-Score',
          style: {
            color: '#1f2937'
          }
        },
        labels: {
          style: {
            color: '#374151'
          }
        },
        gridLineColor: '#e5e7eb',
        opposite: true,
        type: useLogScale ? 'logarithmic' : 'linear'
      }
    ],
    tooltip: {
      shared: true,
      backgroundColor: '#ffffff',
      borderColor: '#d1d5db',
      style: {
        color: '#1f2937'
      },
      formatter: function() {
        const points = this.points || [];
        let tooltip = `<b>${Highcharts.dateFormat('%Y-%m-%d', this.x)}</b><br/>`;
        
        points.forEach((point: any) => {
          if (point.series.name === 'Bitcoin Price') {
            tooltip += `${point.series.name}: $${point.y.toLocaleString()}<br/>`;
          } else {
            tooltip += `${point.series.name}: ${point.y.toFixed(3)}<br/>`;
          }
        });
        
        return tooltip;
      }
    },
    legend: {
      itemStyle: {
        color: '#1f2937'
      },
      itemHoverStyle: {
        color: '#374151'
      }
    },
    plotOptions: {
      series: {
        marker: {
          enabled: false
        }
      }
    },
    series: [
      {
        name: 'Bitcoin Price',
        type: chartType,
        data: priceData,
        color: '#3b82f6',
        yAxis: 0,
        tooltip: {
          valueDecimals: 2,
          valuePrefix: '$'
        }
      },
      {
        name: 'MVRV Z-Score',
        type: chartType,
        data: mvrvData,
        color: '#f59e0b',
        yAxis: 1,
        tooltip: {
          valueDecimals: 3
        }
      }
    ],
    rangeSelector: showRangeSelector ? {
      enabled: true,
      buttonTheme: {
        fill: '#f3f4f6',
        stroke: '#d1d5db',
        style: {
          color: '#1f2937'
        },
        states: {
          hover: {
            fill: '#e5e7eb'
          },
          select: {
            fill: '#3b82f6',
            style: {
              color: '#ffffff'
            }
          }
        }
      },
      inputStyle: {
        backgroundColor: '#ffffff',
        color: '#1f2937'
      },
      labelStyle: {
        color: '#1f2937'
      }
    } : {
      enabled: false
    },
    navigator: {
      enabled: showRangeSelector,
      handles: {
        backgroundColor: '#3b82f6',
        borderColor: '#1d4ed8'
      },
      outlineColor: '#d1d5db',
      maskFill: 'rgba(59, 130, 246, 0.1)',
      series: {
        color: '#6b7280'
      }
    },
    scrollbar: {
      enabled: showRangeSelector,
      barBackgroundColor: '#f3f4f6',
      barBorderRadius: 7,
      barBorderWidth: 0,
      buttonBackgroundColor: '#f3f4f6',
      buttonBorderWidth: 0,
      buttonBorderRadius: 7,
      rifleColor: '#6b7280',
      trackBackgroundColor: '#ffffff',
      trackBorderWidth: 1,
      trackBorderRadius: 8,
      trackBorderColor: '#d1d5db'
    },
    exporting: {
      enabled: showExporting,
      buttons: {
        contextButton: {
          theme: {
            fill: '#f3f4f6',
            stroke: '#d1d5db',
            style: {
              color: '#1f2937'
            }
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-gray-700">온체인 데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️ 오류 발생</div>
          <div className="text-gray-700 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (priceData.length === 0 || mvrvData.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="text-gray-500 mb-2">📊</div>
          <div className="text-gray-700">데이터가 없습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4">
      <ChartControls
        chartType={lineSplineMode}
        onChartTypeChange={handleLineSplineToggle}
        isAreaMode={isAreaMode}
        onAreaModeToggle={handleAreaModeToggle}
        showFlags={showFlags}
        onFlagsToggle={() => setShowFlags(!showFlags)}
        useLogScale={useLogScale}
        onLogScaleToggle={handleLogScaleToggle}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        showFlagsButton={false}
      />
      <div style={{ height: `${height}px` }}>
        <HighchartsReact
          ref={chartRef}
          highcharts={Highcharts}
          constructorType={'stockChart'}
          options={chartOptions}
        />
      </div>
    </div>
  );
};

export default OnChainChart;