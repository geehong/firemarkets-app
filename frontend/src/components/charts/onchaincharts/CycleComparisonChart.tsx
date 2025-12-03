"use client"

import React, { useState, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { useNavigation } from '@/hooks/useNavigation';
import ChartControls from '@/components/common/ChartControls';
import { getColorMode } from '@/constants/colorModes';

interface CycleComparisonChartProps {
  title?: string;
  height: number;
  showRangeSelector?: boolean;
  showExporting?: boolean;
}

// ERA 정의
const ERA_DATES = {
  1: { start: '2011-11-28', end: '2015-11-28' },
  2: { start: '2015-01-14', end: '2019-01-14' },
  3: { start: '2018-12-15', end: '2022-12-15' },
  4: { start: '2022-11-21', end: new Date().toISOString().split('T')[0] }
};

// 대표 자산 목록
const REPRESENTATIVE_ASSETS = [
  { ticker: 'BTCUSDT', name: 'Bitcoin' },
  { ticker: 'AAPL', name: 'Apple' },
  { ticker: 'MSFT', name: 'Microsoft' },
  { ticker: 'NVDA', name: 'NVIDIA' },
  { ticker: 'SPY', name: 'SPDR S&P 500' },
  { ticker: 'QQQ', name: 'Invesco QQQ' },
  { ticker: 'GOLD', name: 'Gold' },
  { ticker: 'SILVER', name: 'Silver' }
];

const CycleComparisonChart: React.FC<CycleComparisonChartProps> = ({
  title = 'Bitcoin Cycle Comparison',
  height,
  showRangeSelector = false,
  showExporting = true
}) => {
  const [chartType, setChartType] = useState('line');
  const [useLogScale, setUseLogScale] = useState(true);
  const [isAreaMode, setIsAreaMode] = useState(false);
  const [lineSplineMode, setLineSplineMode] = useState<'line' | 'spline'>('line');
  const [startPrice, setStartPrice] = useState(64940);
  const [customStartPrice, setCustomStartPrice] = useState(64940);
  const [showPlotBands, setShowPlotBands] = useState(false);
  const [showMovingAverage, setShowMovingAverage] = useState(false);
  const [maPeriod, setMaPeriod] = useState(20);
  const [maWidth, setMaWidth] = useState(2);
  const [dayRange, setDayRange] = useState(1460);
  const [plotLineDay, setPlotLineDay] = useState(365);
  const [plotBandStart, setPlotBandStart] = useState(366);
  const [plotBandEnd, setPlotBandEnd] = useState(550);

  const [showEra1, setShowEra1] = useState(true);
  const [showEra2, setShowEra2] = useState(true);
  const [showEra3, setShowEra3] = useState(true);
  const [showEra4, setShowEra4] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<string[]>(['BTCUSDT']);
  const [showFlags, setShowFlags] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [colorMode, setColorMode] = useState<'dark' | 'vivid' | 'high-contrast' | 'simple'>('vivid');
  const [showSettings, setShowSettings] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [HighchartsReact, setHighchartsReact] = useState<any>(null);
  const [Highcharts, setHighcharts] = useState<any>(null);
  const chartRef = useRef<any>(null);

  // 네비게이션 메뉴 데이터 가져오기
  const { currentMenuItem } = useNavigation();

  // ERA 데이터 상태
  const [eraData, setEraData] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  // ERA 4 시작가격 로드
  useEffect(() => {
    const loadEra4StartPrice = async () => {
      try {
        const result = await apiClient.getComparisonCycleData(4, {
          assetIdentifiers: 'BTCUSDT'
        });
        if (result && result.assets && result.assets.length > 0) {
          const btcAsset = result.assets.find((a: any) => a.ticker === 'BTCUSDT' || a.ticker === 'BTC');
          if (btcAsset && btcAsset.data && btcAsset.data.length > 0) {
            const startPrice = btcAsset.data[0].close_price;
            setStartPrice(startPrice);
            setCustomStartPrice(startPrice);
          }
        }
      } catch (err) {
        console.error('Failed to load ERA 4 start price:', err);
      }
    };
    loadEra4StartPrice();
  }, []);

  // ERA 데이터 로드
  useEffect(() => {
    const loadEraData = async () => {
      if (!startPrice || startPrice <= 0) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const erasToLoad = [1, 2, 3, 4].filter(era => {
          if (era === 1) return showEra1;
          if (era === 2) return showEra2;
          if (era === 3) return showEra3;
          if (era === 4) return showEra4;
          return false;
        });

        const promises = erasToLoad.map(era =>
          apiClient.getComparisonCycleData(era, {
            normalizeToPrice: startPrice,
            assetIdentifiers: selectedAssets.join(',')
          })
        );

        const results = await Promise.all(promises);
        const dataMap: Record<number, any> = {};
        results.forEach((result, index) => {
          dataMap[erasToLoad[index]] = result;
        });
        
        setEraData(dataMap);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadEraData();
  }, [startPrice, selectedAssets, showEra1, showEra2, showEra3, showEra4]);

  // 클라이언트 사이드에서 Highcharts 동적 로드
  useEffect(() => {
    const loadHighcharts = async () => {
      try {
        const [
          { default: HighchartsReactComponent },
          { default: HighchartsCore }
        ] = await Promise.all([
          import('highcharts-react-official'),
          import('highcharts/highstock')
        ])

        await Promise.all([
          import('highcharts/modules/stock'),
          import('highcharts/modules/exporting'),
          import('highcharts/modules/accessibility'),
          import('highcharts/modules/drag-panes'),
          import('highcharts/modules/navigator')
        ])

        setHighchartsReact(() => HighchartsReactComponent)
        setHighcharts(HighchartsCore)
        setIsClient(true)
      } catch (error) {
        console.error('Failed to load Highcharts:', error)
      }
    }

    loadHighcharts()
  }, [])

  // 화면 크기 변경 감지
  useEffect(() => {
    if (!isClient) return

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient]);

  // Line/Spline 토글 핸들러
  const handleLineSplineToggle = () => {
    const newLineSplineMode = lineSplineMode === 'line' ? 'spline' : 'line';
    setLineSplineMode(newLineSplineMode);
    
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
      chart.yAxis.forEach((axis: any) => {
        axis.update({
          type: !useLogScale ? 'logarithmic' : 'linear'
        }, false);
      });
      chart.redraw();
    }
  };

  // 시작가격 실행 핸들러
  const handleExecuteStartPrice = () => {
    setStartPrice(customStartPrice);
  };

  // dayRange 변경 시 차트 x축 범위 업데이트
  useEffect(() => {
    const chart = chartRef.current?.chart;
    if (chart) {
      chart.xAxis[0].setExtremes(0, dayRange);
    }
  }, [dayRange]);

  // 이동평균 계산 함수
  const calculateMovingAverage = (data: number[][], period: number) => {
    if (!data || data.length < period) return [];
    
    const result: (number[] | null)[] = [];
    let sum = 0;
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sum += data[i][1];
        result.push(null);
      } else {
        if (i === period - 1) {
          sum += data[i][1];
        } else {
          sum = sum - data[i - period][1] + data[i][1];
        }
        result.push([data[i][0], sum / period]);
      }
    }
    
    return result;
  };

  // ERA 색상 가져오기
  const getEraColors = () => {
    const currentColors = getColorMode(colorMode);
    return {
      1: currentColors.halving_1,
      2: currentColors.halving_2,
      3: currentColors.halving_3,
      4: currentColors.halving_4
    };
  };

  // 차트 데이터 변환
  const getChartSeries = () => {
    const series: any[] = [];
    const currentColors = getColorMode(colorMode);
    const eraColors = getEraColors();
    const lineWidths = [2, 2, 2, 4]; // ERA 4는 굵게
    
    [1, 2, 3, 4].forEach((era) => {
      const showEra = {
        1: showEra1,
        2: showEra2,
        3: showEra3,
        4: showEra4
      }[era];
      
      if (!showEra) return;
      
      const eraInfo = eraData[era];
      if (!eraInfo || !eraInfo.assets) return;
      
      eraInfo.assets.forEach((asset: any, assetIndex: number) => {
        const isBitcoin = asset.ticker === 'BTCUSDT' || asset.ticker === 'BTC';
        if (!isBitcoin && !selectedAssets.includes(asset.ticker)) {
          return;
        }
        
        if (asset.data && asset.data.length > 0) {
          const chartData = asset.data.map((point: any) => [point.days, point.normalized_price]);
          
          const isBitcoin = asset.ticker === 'BTCUSDT' || asset.ticker === 'BTC';
          const seriesName = `${era}st ${asset.ticker}`;
          
          series.push({
            name: seriesName,
            type: chartType,
            data: chartData,
            color: isBitcoin
              ? eraColors[era as keyof typeof eraColors]
              : currentColors.moving_average,
            line: {
              width: isBitcoin
                ? lineWidths[era - 1]
                : 1.5
            },
            ...(chartType === 'area' && Highcharts && {
              fillColor: {
                linearGradient: {
                  x1: 0,
                  y1: 0,
                  x2: 0,
                  y2: 1
                },
                stops: [
                  [0, Highcharts.color(isBitcoin
                    ? eraColors[era as keyof typeof eraColors]
                    : currentColors.moving_average).setOpacity(0.7).get('rgba')],
                  [0.5, Highcharts.color(isBitcoin
                    ? eraColors[era as keyof typeof eraColors]
                    : currentColors.moving_average).setOpacity(0.35).get('rgba')],
                  [0.8, Highcharts.color(isBitcoin
                    ? eraColors[era as keyof typeof eraColors]
                    : currentColors.moving_average).setOpacity(0.05).get('rgba')],
                  [1, Highcharts.color(isBitcoin
                    ? eraColors[era as keyof typeof eraColors]
                    : currentColors.moving_average).setOpacity(0.01).get('rgba')]
                ]
              }
            }),
            tooltip: {
              valueDecimals: 2,
              formatter: function() {
                // ERA 4 기준 날짜 계산
                const era4StartDate = new Date('2022-11-21T00:00:00.000Z');
                const currentDate = new Date(era4StartDate.getTime() + this.x * 24 * 60 * 60 * 1000);
                const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;
                
                const price = this.y;
                let priceStr;
                if (price >= 1000000) {
                  priceStr = `$${(price / 1000000).toFixed(1)}M`;
                } else if (price >= 1000) {
                  priceStr = `$${(price / 1000).toFixed(0)}k`;
                } else {
                  priceStr = `$${price.toFixed(0)}`;
                }
                
                return `<b>${this.series.name}</b><br/>
                        <b>Day ${String(this.x).padStart(3, '0')}[${dateStr}(ERA4기준)]</b><br/>
                        <b>${priceStr}</b>`;
              }
            }
          });
        }
      });
    });
    
    return series;
  };

  // 차트 데이터에 이동평균 추가
  const getChartSeriesWithMA = () => {
    const series = getChartSeries();
    
    if (showMovingAverage && Highcharts) {
      [1, 2, 3, 4].forEach((era) => {
        const showEra = {
          1: showEra1,
          2: showEra2,
          3: showEra3,
          4: showEra4
        }[era];
        
        if (!showEra) return;
        
        const eraInfo = eraData[era];
        if (!eraInfo || !eraInfo.assets) return;
        
        eraInfo.assets.forEach((asset: any) => {
          if (asset.ticker !== 'BTCUSDT' && asset.ticker !== 'BTC') return;
          if (!asset.data || asset.data.length === 0) return;
          
          const chartData = asset.data.map((point: any) => [point.days, point.normalized_price]);
          const maData = calculateMovingAverage(chartData, maPeriod);
          const maSeries = maData
            .filter(point => point !== null)
            .map(point => [point![0], point![1]]);
          
          if (maSeries.length > 0) {
            const currentColors = getColorMode(colorMode);
            const eraColors = getEraColors();
            series.push({
              name: `${era}st MA(${maPeriod})`,
              type: chartType === 'area' ? 'area' : 'line',
              data: maSeries,
              color: Highcharts.color(eraColors[era as keyof typeof eraColors]).setOpacity(0.6).get('rgba'),
              line: {
                dash: 'dot',
                width: maWidth
              },
              ...(chartType === 'area' && {
                fillColor: {
                  linearGradient: {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 1
                  },
                  stops: [
                    [0, Highcharts.color(eraColors[era as keyof typeof eraColors]).setOpacity(0.4).get('rgba')],
                    [1, Highcharts.color(eraColors[era as keyof typeof eraColors]).setOpacity(0.05).get('rgba')]
                  ]
                }
              }),
              tooltip: {
                valueDecimals: 2,
                formatter: function() {
                  const era4StartDate = new Date('2022-11-21T00:00:00.000Z');
                  const currentDate = new Date(era4StartDate.getTime() + this.x * 24 * 60 * 60 * 1000);
                  const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;
                  
                  const price = this.y;
                  let priceStr;
                  if (price >= 1000000) {
                    priceStr = `$${(price / 1000000).toFixed(1)}M`;
                  } else if (price >= 1000) {
                    priceStr = `$${(price / 1000).toFixed(0)}k`;
                  } else {
                    priceStr = `$${price.toFixed(0)}`;
                  }
                  
                  return `<b>${this.series.name}</b><br/>
                          <b>Day ${String(this.x).padStart(3, '0')}[${dateStr}(ERA4기준)]</b><br/>
                          <b>${priceStr}</b>`;
                }
              }
            });
          }
        });
      });
    }
    
    return series;
  };

  const getChartOptions = () => {
    const currentColors = getColorMode(colorMode);
    
    return {
      chart: {
        height: height,
        type: 'line',
        animation: {
          duration: 500
        },
        zoomType: 'xy',
        panning: {
          enabled: true,
          type: 'xy'
        },
        pinchType: 'xy',
        spacing: [5, 5, 5, 5],
        margin: [10, 10, 10, 10]
      },
      boost: {
        useGPUTranslations: true,
        seriesThreshold: 1
      },
      title: {
        text: title,
        style: {
          fontSize: '14px'
        },
        useHTML: true,
        ...(currentMenuItem?.metadata?.description && {
          text: `<span title="${currentMenuItem.metadata.description.ko || currentMenuItem.metadata.description.en || ''}">${title}</span>`
        })
      },
      subtitle: {
        text: `Normalized to $${startPrice.toLocaleString('en-US')}`,
        style: {
          fontSize: '12px'
        }
      },
      xAxis: {
        type: 'linear',
        title: {
          text: 'Days After Start'
        },
        labels: {
          formatter: function() {
            // ERA 4 기준으로 날짜 계산
            const era4StartDate = new Date('2022-11-21T00:00:00.000Z');
            const currentDate = new Date(era4StartDate.getTime() + this.value * 24 * 60 * 60 * 1000);
            const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;
            return `${String(this.value).padStart(3, '0')}Day [${dateStr}(ERA4기준)]`;
          },
          style: { fontSize: '11px' }
        },
        tickPositioner: function() {
          const positions = [];
          const max = Math.min(this.dataMax, dayRange);
          const interval = Math.ceil(max / 6);
          
          for (let i = 0; i <= max; i += interval) {
            positions.push(i);
          }
          
          if (positions.indexOf(max) === -1) {
            positions.push(max);
          }
          
          return positions;
        },
        crosshair: true,
        min: 0,
        max: dayRange,
        plotBands: showPlotBands ? [{
          color: currentColors.plot_band,
          from: plotBandStart,
          to: plotBandEnd,
          label: {
            text: 'Custom Band',
            style: {
              color: '#606060'
            }
          }
        }] : [],
        plotLines: showPlotBands ? [{
          color: currentColors.plot_line,
          width: 2,
          value: plotLineDay,
          label: {
            text: 'Plot Line',
            style: {
              color: currentColors.plot_line
            }
          }
        }] : []
      },
      yAxis: {
        title: {
          text: 'Normalized Price (USD)',
          style: {
            fontSize: isMobile ? '0px' : '12px'
          }
        },
        labels: {
          formatter: function() {
            const value = this.value;
            if (value >= 1000000) {
              return '$' + (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return '$' + (value / 1000).toFixed(1) + 'K';
            } else {
              return '$' + value.toFixed(0);
            }
          },
          style: {
            fontSize: isMobile ? '0px' : '12px'
          }
        },
        crosshair: true,
        type: useLogScale ? 'logarithmic' : 'linear'
      },
      rangeSelector: {
        enabled: false
      },
      tooltip: {
        split: true,
        valueDecimals: 2,
        formatter: function () {
          const points = this.points;
          const days = this.x;
          
          // ERA 4 기준으로 날짜 계산
          const era4StartDate = new Date('2022-11-21T00:00:00.000Z');
          const currentDate = new Date(era4StartDate.getTime() + days * 24 * 60 * 60 * 1000);
          const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;
          
          let tooltip = [`Day ${String(days).padStart(3, '0')} <span style="font-weight: bold; color: blue;">[${dateStr}(ERA4기준)]</span>`];
          
          points.forEach((point: any) => {
            tooltip.push(`<span style="color:${point.series.color}">\u25CF ${point.series.name}</span>: <b>$${Highcharts.numberFormat(point.y, 2)}</b>`);
          });
          
          return tooltip;
        },
        style: { fontSize: '12px' }
      },
      series: getChartSeriesWithMA(),
      plotOptions: {
        line: {
          marker: {
            enabled: false
          },
          connectNulls: false
        },
        series: {
          stickyTracking: false,
          enableMouseTracking: true
        }
      },
      credits: {
        enabled: false
      },
      exporting: {
        enabled: showExporting
      },
      navigator: {
        enabled: !isMobile,
        xAxis: {
          labels: {
            formatter: function() {
              const era4StartDate = new Date('2022-11-21T00:00:00.000Z');
              const currentDate = new Date(era4StartDate.getTime() + this.value * 24 * 60 * 60 * 1000);
              const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;
              return dateStr;
            }
          }
        }
      },
      responsive: {
        rules: [{
          condition: {
            maxWidth: 768
          },
          chartOptions: {
            chart: {
              height: Math.min(height, 800),
              spacing: [10, 10, 10, 10]
            },
            rangeSelector: {
              enabled: false
            },
            navigator: {
              enabled: true,
              xAxis: {
                labels: {
                  formatter: function() {
                    const era4StartDate = new Date('2022-11-21T00:00:00.000Z');
                    const currentDate = new Date(era4StartDate.getTime() + this.value * 24 * 60 * 60 * 1000);
                    const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;
                    return dateStr;
                  }
                }
              }
            }
          }
        }]
      }
    };
  };

  // 클라이언트 사이드에서만 차트 렌더링
  if (!isClient || !HighchartsReact || !Highcharts) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-3">Loading chart library...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-3">사이클 데이터 로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <h5>차트 에러</h5>
        <p>{error.message || String(error)}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 
          className="mb-0" 
          title={currentMenuItem?.metadata?.description?.ko || currentMenuItem?.metadata?.description?.en || ''}
          style={{ cursor: 'help' }}
        >
          {title}
        </h5>
      </div>
      
      {/* Chart Controls */}
      <div className="row justify-content-center mb-3">
        <div className="col-md-8">
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
            isHalvingChart={true}
            halvingStates={{
              showHalving1: showEra1,
              showHalving2: showEra2,
              showHalving3: showEra3,
              showHalving4: showEra4
            }}
            onHalvingToggle={(id) => {
              const setters = {
                1: setShowEra1,
                2: setShowEra2,
                3: setShowEra3,
                4: setShowEra4
              };
              const states = {
                1: showEra1,
                2: showEra2,
                3: showEra3,
                4: showEra4
              };
              setters[id as keyof typeof setters](!states[id as keyof typeof states]);
            }}
            halvingColors={getEraColors()}
          />
        </div>
      </div>

      {/* 차트 */}
      <div style={{ height: `${height}px` }}>
        <HighchartsReact
          highcharts={Highcharts}
          constructorType={'stockChart'}
          options={getChartOptions()}
          ref={chartRef}
        />
      </div>

      {/* Settings Toggle Button */}
      <div className="row mt-4">
        <div className="col-12">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setShowSettings(!showSettings)}
            style={{ width: '100%' }}
          >
            {showSettings ? '▼ Option' : '▶ Option'}
          </button>
        </div>
      </div>

      {/* Input Controls and Indicate Controls */}
      {showSettings && (
        <div className="row mt-3">
          {/* Row 1: Day Range and Start Price */}
          <div className="col-md-6 mb-3">
            <div className="card" style={{ border: '1px solid #dee2e6', borderRadius: '0.375rem', boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)' }}>
              <div className="card-header" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6', padding: '0.75rem 1.25rem' }}>
                <h6 className="mb-0">Day Range</h6>
              </div>
              <div className="card-body" style={{ padding: '1.25rem' }}>
                <label className="form-label">Range: {dayRange} Days</label>
                <input
                  type="range"
                  className="form-range"
                  min="0"
                  max="1460"
                  value={dayRange}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setDayRange(value);
                  }}
                />
                <div className="text-center mt-2">
                  <span className="badge bg-secondary">{dayRange} Days</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-6 mb-3">
            <div className="card" style={{ border: '1px solid #dee2e6', borderRadius: '0.375rem', boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)' }}>
              <div className="card-header" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6', padding: '0.75rem 1.25rem' }}>
                <h6 className="mb-0">Start Price</h6>
              </div>
              <div className="card-body" style={{ padding: '1.25rem' }}>
                <label className="form-label">Normalize To Price</label>
                <div className="input-group">
                  <input
                    type="number"
                    className="form-control"
                    value={customStartPrice}
                    onChange={(e) => setCustomStartPrice(Number(e.target.value))}
                    placeholder="Enter start price"
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleExecuteStartPrice}
                  >
                    Execute
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Select Assets and Plot Bands/Lines */}
          <div className="col-md-6 mb-3">
            <div className="card" style={{ border: '1px solid #dee2e6', borderRadius: '0.375rem', boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)' }}>
              <div className="card-header" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6', padding: '0.75rem 1.25rem' }}>
                <h6 className="mb-0">Select Assets</h6>
              </div>
              <div className="card-body" style={{ padding: '1.25rem' }}>
                {REPRESENTATIVE_ASSETS.map((asset) => (
                  <div key={asset.ticker} className="form-check mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={selectedAssets.includes(asset.ticker)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAssets([...selectedAssets, asset.ticker]);
                        } else {
                          // BTCUSDT는 최소 하나는 선택되어야 함
                          if (asset.ticker === 'BTCUSDT' && selectedAssets.length === 1) {
                            return;
                          }
                          setSelectedAssets(selectedAssets.filter(a => a !== asset.ticker));
                        }
                      }}
                      id={`asset-select-${asset.ticker}`}
                      disabled={asset.ticker === 'BTCUSDT' && selectedAssets.length === 1 && selectedAssets.includes('BTCUSDT')}
                    />
                    <label className="form-check-label" htmlFor={`asset-select-${asset.ticker}`}>
                      {asset.ticker}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-md-6 mb-3">
            <div className="card" style={{ border: '1px solid #dee2e6', borderRadius: '0.375rem', boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)' }}>
              <div className="card-header" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6', padding: '0.75rem 1.25rem' }}>
                <h6 className="mb-0">Plot Bands/Lines</h6>
              </div>
              <div className="card-body" style={{ padding: '1.25rem' }}>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={showPlotBands}
                    onChange={(e) => setShowPlotBands(e.target.checked)}
                    id="plot-bands-check"
                  />
                  <label className="form-check-label" htmlFor="plot-bands-check">
                    Show Plot Bands/Lines
                  </label>
                </div>
                {showPlotBands && (
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Plot Line Day</label>
                      <input
                        type="number"
                        className="form-control"
                        value={plotLineDay}
                        onChange={(e) => setPlotLineDay(Number(e.target.value))}
                        min="0"
                        max="1460"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Band Start</label>
                      <input
                        type="number"
                        className="form-control"
                        value={plotBandStart}
                        onChange={(e) => setPlotBandStart(Number(e.target.value))}
                        min="0"
                        max="1460"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Band End</label>
                      <input
                        type="number"
                        className="form-control"
                        value={plotBandEnd}
                        onChange={(e) => setPlotBandEnd(Number(e.target.value))}
                        min={plotBandStart}
                        max="1460"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Moving Average */}
          <div className="col-md-6 mb-3">
            <div className="card" style={{ border: '1px solid #dee2e6', borderRadius: '0.375rem', boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)' }}>
              <div className="card-header" style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6', padding: '0.75rem 1.25rem' }}>
                <h6 className="mb-0">Moving Average</h6>
              </div>
              <div className="card-body" style={{ padding: '1.25rem' }}>
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={showMovingAverage}
                    onChange={(e) => setShowMovingAverage(e.target.checked)}
                    id="moving-average-check"
                  />
                  <label className="form-check-label" htmlFor="moving-average-check">
                    Show Moving Average
                  </label>
                </div>
                {showMovingAverage && (
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">MA Period</label>
                      <input
                        type="number"
                        className="form-control"
                        value={maPeriod}
                        onChange={(e) => setMaPeriod(Number(e.target.value))}
                        min="1"
                        max="100"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">MA Width</label>
                      <input
                        type="number"
                        className="form-control"
                        value={maWidth}
                        onChange={(e) => setMaWidth(Number(e.target.value))}
                        min="1"
                        max="10"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CycleComparisonChart;
