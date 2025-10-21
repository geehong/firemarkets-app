"use client"

import React, { useState, useRef, useEffect } from 'react';
import { useMultipleHalvingData } from '@/hooks/useCrypto';
import { useNavigation } from '@/hooks/useNavigation';
import ChartControls from '@/components/common/ChartControls';
import { getColorMode } from '@/constants/colorModes';

interface HalvingChartProps {
  title?: string;
  height: number; // 필수 prop으로 변경
  showRangeSelector?: boolean;
  showExporting?: boolean;
  singlePeriod?: number | null;
}

const HalvingChart: React.FC<HalvingChartProps> = ({
  title = 'Bitcoin Halving Price Analysis',
  height,
  showRangeSelector = false,
  showExporting = true,
  singlePeriod = null
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

  const [showHalving1, setShowHalving1] = useState(true);
  const [showHalving2, setShowHalving2] = useState(true);
  const [showHalving3, setShowHalving3] = useState(true);
  const [showHalving4, setShowHalving4] = useState(true);
  const [showFlags, setShowFlags] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [colorMode, setColorMode] = useState<'dark' | 'vivid' | 'high-contrast' | 'simple'>('vivid'); // 다크모드 제거
  const [showSettings, setShowSettings] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [HighchartsReact, setHighchartsReact] = useState<any>(null);
  const [Highcharts, setHighcharts] = useState<any>(null);
  const chartRef = useRef<any>(null);

  // 네비게이션 메뉴 데이터 가져오기
  const { currentMenuItem } = useNavigation();

  // 4차 반감기 시작가격 기본값
  const isLoadingStartPrice = false;
  const defaultStartPrice = 0;

  // 반감기 데이터 - 훅 사용
  const periodsToLoad = singlePeriod ? [singlePeriod] : [1, 2, 3, 4];
  const { queries: halvingQueries, isLoading, isError, errors } = useMultipleHalvingData(
    periodsToLoad, 
    startPrice, 
    !!startPrice && startPrice > 0
  );

  // 에러 확인
  const error = errors && errors.length > 0 ? errors[0] : null;

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

        // Highcharts 모듈들 동적 로드
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

  // 차트 타입 변경 핸들러
  const handleChartTypeChange = (type: string) => {
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
        sum += data[i][1]; // close price
        result.push(null);
      } else {
        if (i === period - 1) {
          sum += data[i][1];
        } else {
          sum = sum - data[i - period][1] + data[i][1];
        }
        result.push([data[i][0], sum / period]); // [timestamp, MA value]
      }
    }
    
    return result;
  };

  // 차트 데이터에 이동평균 추가
  const getChartSeriesWithMA = () => {
    const series = getChartSeries();
    
    if (showMovingAverage) {
      // 각 반감기 데이터에 대해 이동평균 계산
      halvingQueries.forEach((query, index) => {
        const period = periodsToLoad[index];
        const data = query.data;
        
        if (data && (data.ohlcv_data || data.close_price_data)) {
          const priceData = data.ohlcv_data || data.close_price_data;
          const chartData = priceData.map((point: any) => {
            const pointDate = new Date(point.timestamp_utc + 'T00:00:00.000Z');
            
            // 각 반감기의 시작일 정의
            const halvingStartDates = {
              1: new Date('2012-11-28T00:00:00.000Z'),
              2: new Date('2016-07-09T00:00:00.000Z'),
              3: new Date('2020-05-11T00:00:00.000Z'),
              4: new Date('2024-04-20T00:00:00.000Z')
            };
            
            const startDate = halvingStartDates[period as keyof typeof halvingStartDates];
            const days = Math.floor((pointDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
            
            // 모든 반감기를 동일한 시작 가격으로 정규화
            const normalizedPrice = point.close_price;
            return [days, normalizedPrice];
          }).sort((a: any, b: any) => a[0] - b[0]); // 날짜순으로 정렬
          
          const maData = calculateMovingAverage(chartData, maPeriod);
          const maSeries = maData
            .filter(point => point !== null)
            .map(point => [point![0], point![1]]);
          
          if (maSeries.length > 0) {
            const currentColors = getColorMode(colorMode);
            series.push({
              name: `${period}st MA(${maPeriod})`,
              type: chartType === 'area' ? 'area' : 'line',
              data: maSeries,
              color: Highcharts.color(currentColors.moving_average).setOpacity(0.6).get('rgba'),
              line: {
                dash: 'dot',
                width: maWidth
              },
              // Area 차트일 때 그라데이션 효과 추가
              ...(chartType === 'area' && {
                fillColor: {
                  linearGradient: {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: 1
                  },
                  stops: [
                    [0, Highcharts.color(currentColors.moving_average).setOpacity(0.4).get('rgba')],
                    [1, Highcharts.color(currentColors.moving_average).setOpacity(0.05).get('rgba')]
                  ]
                }
              }),
              tooltip: {
                valueDecimals: 2,
                valuePrefix: '$',
                formatter: function() {
                  // 각 반감기의 시작일 기준으로 날짜 계산
                  const halvingStartDates = {
                    1: new Date('2012-11-28T00:00:00.000Z'),
                    2: new Date('2016-07-09T00:00:00.000Z'),
                    3: new Date('2020-05-11T00:00:00.000Z'),
                    4: new Date('2024-04-20T00:00:00.000Z')
                  };
                  
                  // 시리즈 이름에서 반감기 번호 추출 (예: "1st MA(20)" -> 1)
                  const periodMatch = this.series.name.match(/(\d+)st/);
                  const period = periodMatch ? parseInt(periodMatch[1]) : 4;
                  const startDate = halvingStartDates[period as keyof typeof halvingStartDates];
                  
                  const currentDate = new Date(startDate.getTime() + this.x * 24 * 60 * 60 * 1000);
                  const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;
                  
                  // 가격을 K 단위로 표시
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
                          <b>${dateStr}</b><br/>
                          <b>${priceStr}</b>`;
                }
              }
            });
          }
        }
      });
    }
    
    return series;
  };

  // 반감기 색상 가져오기
  const getHalvingColors = () => {
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
    const lineWidths = [2, 2, 2, 4]; // 4차 반감기는 굵게
    
    halvingQueries.forEach((query, index) => {
      const period = periodsToLoad[index];
      const data = query.data;
      
      // 반감기 표시 설정 확인
      const showHalving = {
        1: showHalving1,
        2: showHalving2,
        3: showHalving3,
        4: showHalving4
      }[period];
      
      if (!showHalving) return; // 표시하지 않을 반감기는 건너뛰기
      
      if (data && (data.ohlcv_data || data.close_price_data)) {
        const priceData = data.ohlcv_data || data.close_price_data;
        
        // 가로축을 일수로 변경 (각 반감기의 시작일 기준으로 계산)
        let chartData = priceData.map((point: any) => {
          const pointDate = new Date(point.timestamp_utc + 'T00:00:00.000Z');
          
          // 각 반감기의 시작일 정의
          const halvingStartDates = {
            1: new Date('2012-11-28T00:00:00.000Z'),
            2: new Date('2016-07-09T00:00:00.000Z'),
            3: new Date('2020-05-11T00:00:00.000Z'),
            4: new Date('2024-04-20T00:00:00.000Z')
          };
          
          const startDate = halvingStartDates[period as keyof typeof halvingStartDates];
          const days = Math.floor((pointDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
          
          // 모든 반감기를 동일한 시작 가격으로 정규화
          const normalizedPrice = point.close_price;
          return [days, normalizedPrice]; // 정규화된 가격 사용
        }).sort((a: any, b: any) => a[0] - b[0]); // 날짜순으로 정렬
        
        // 4차 반감기의 경우 데이터가 끝나는 지점 이후부터 1400일까지 빈 데이터 추가
        if (period === 4) {
          const maxDay = Math.max(...chartData.map(point => point[0]));
          const lastPrice = chartData.length > 0 ? chartData[chartData.length - 1][1] : null;
          
          // 1400일까지 빈 데이터 추가 (마지막 데이터 이후부터)
          for (let day = maxDay + 1; day <= 1400; day++) {
            chartData.push([day, null]); // null 값으로 빈 데이터 표시
          }
        }
        
        series.push({
          name: `${period}st`,
          type: chartType,
          data: chartData,
          color: currentColors[`halving_${period}` as keyof typeof currentColors],
          line: {
            width: lineWidths[index % lineWidths.length]
          },
          // Area 차트일 때 그라데이션 효과 추가
          ...(chartType === 'area' && {
            fillColor: {
              linearGradient: {
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 1
              },
              stops: [
                [0, Highcharts.color(currentColors[`halving_${period}` as keyof typeof currentColors]).setOpacity(0.7).get('rgba')],
                [0.5, Highcharts.color(currentColors[`halving_${period}` as keyof typeof currentColors]).setOpacity(0.35).get('rgba')],
                [0.8, Highcharts.color(currentColors[`halving_${period}` as keyof typeof currentColors]).setOpacity(0.05).get('rgba')],
                [0.9, Highcharts.color(currentColors[`halving_${period}` as keyof typeof currentColors]).setOpacity(0.02).get('rgba')],
                [1, Highcharts.color(currentColors[`halving_${period}` as keyof typeof currentColors]).setOpacity(0.01).get('rgba')]
              ]
            }
          }),
          tooltip: {
            valueDecimals: 2,
            valuePrefix: '$',
            formatter: function() {
              // 각 반감기의 시작일 기준으로 날짜 계산
              const halvingStartDates = {
                1: new Date('2012-11-28T00:00:00.000Z'),
                2: new Date('2016-07-09T00:00:00.000Z'),
                3: new Date('2020-05-11T00:00:00.000Z'),
                4: new Date('2024-04-20T00:00:00.000Z')
              };
              
              // 시리즈 이름에서 반감기 번호 추출 (예: "1st" -> 1)
              const periodMatch = this.series.name.match(/(\d+)st/);
              const period = periodMatch ? parseInt(periodMatch[1]) : 4;
              const startDate = halvingStartDates[period as keyof typeof halvingStartDates];
              
              const currentDate = new Date(startDate.getTime() + this.x * 24 * 60 * 60 * 1000);
              const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;
          
              // 가격을 K 단위로 표시
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
                      <b>${dateStr}</b><br/>
                      <b>${priceStr}</b>`;
            }
          }
        });
      }
    });
    
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
        margin: [10, 10, 10, 10],
        events: {
          load: function() {
            //console.log('Halving chart loaded');
          }
        }
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
          text: 'Days After Halving'
        },
        labels: {
          formatter: function() {
            // 4차 반감기 기준으로 날짜 계산 (2024-04-20 UTC)
            const fourthHalvingDate = new Date('2024-04-20T00:00:00.000Z');
            const currentDate = new Date(fourthHalvingDate.getTime() + this.value * 24 * 60 * 60 * 1000);
            const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;
            return `${String(this.value).padStart(3, '0')}Day [${dateStr}]`;
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
          text: 'Bitcoin Price (USD)',
          style: {
            fontSize: isMobile ? '0px' : '12px' // 모바일에서 제목 숨김
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
            fontSize: isMobile ? '0px' : '12px' // 모바일에서 라벨 숨김
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
          
          // Format the date based on the fourth halving (2024-04-20 UTC) - 공통 기준
          const fourthHalvingDate = new Date('2024-04-20T00:00:00.000Z');
          const currentDate = new Date(fourthHalvingDate.getTime() + days * 24 * 60 * 60 * 1000);
          const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;
          
          let tooltip = [`Day ${days} <span style="font-weight: bold; color: blue;">[${dateStr}]</span>`];
          
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
          connectNulls: false // null 값 연결하지 않음
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
              // 4차 반감기 기준으로 날짜 계산 (2024-04-20 UTC)
              const fourthHalvingDate = new Date('2024-04-20T00:00:00.000Z');
              const currentDate = new Date(fourthHalvingDate.getTime() + this.value * 24 * 60 * 60 * 1000);
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
                    // 4차 반감기 기준으로 날짜 계산 (2024-04-20 UTC)
                    const fourthHalvingDate = new Date('2024-04-20T00:00:00.000Z');
                    const currentDate = new Date(fourthHalvingDate.getTime() + this.value * 24 * 60 * 60 * 1000);
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

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-3">반감기 데이터 로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <h5>차트 에러</h5>
        <p>{error.message}</p>
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
            showFlagsButton={false} // Halving 차트에서는 플래그 버튼 숨김
            isHalvingChart={true}
            halvingStates={{
              showHalving1,
              showHalving2,
              showHalving3,
              showHalving4
            }}
            onHalvingToggle={(id) => {
              const setters = {
                1: setShowHalving1,
                2: setShowHalving2,
                3: setShowHalving3,
                4: setShowHalving4
              };
              const states = {
                1: showHalving1,
                2: showHalving2,
                3: showHalving3,
                4: showHalving4
              };
              setters[id as keyof typeof setters](!states[id as keyof typeof states]);
            }}
            halvingColors={getHalvingColors()}
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
          {/* Input Settings */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Input Settings</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-12 mb-3">
                    <label className="form-label">Start Price</label>
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
                  <div className="col-12">
                    <div className="d-flex align-items-center gap-3">
                      <label className="form-label mb-0">Range: {dayRange} Days</label>
                      <div className="flex-grow-1">
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
                      </div>
                      <span className="text-muted">{dayRange} Days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Indicate Settings */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Indicate Settings</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  {/* Plot Bands Section */}
                  <div className="col-md-6">
                    <div className="form-check mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={showPlotBands}
                        onChange={(e) => setShowPlotBands(e.target.checked)}
                      />
                      <label className="form-check-label">Plot Bands/Lines</label>
                    </div>
                    {showPlotBands && (
                      <div className="row">
                        <div className="col-md-4">
                          <label className="form-label">PL Day</label>
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
                          <label className="form-label">PB Start</label>
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
                          <label className="form-label">PB End</label>
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

                  {/* Moving Average Section */}
                  <div className="col-md-6">
                    <div className="form-check mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={showMovingAverage}
                        onChange={(e) => setShowMovingAverage(e.target.checked)}
                      />
                      <label className="form-check-label">Moving Average</label>
                    </div>
                    {showMovingAverage && (
                      <div className="row">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default HalvingChart;