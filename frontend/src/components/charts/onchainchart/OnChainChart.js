import React, { useEffect, useState, useRef, useCallback } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { useAPI } from '../../../hooks/useAPI';
import { CCard, CCardBody, CCardHeader } from '@coreui/react';
import CardTools from '../../common/CardTools';
import ChartControls from '../../common/ChartControls.js';
import { getColorMode } from '../../../constants/colorModes';
import styles from './css/CorrelationChart.module.css';

// Load Highcharts modules in correct order
import 'highcharts/modules/stock';
import 'highcharts/modules/exporting';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/drag-panes';
import 'highcharts/modules/navigator';
// import 'highcharts/modules/export-data'; // 문제가 있는 모듈 제거
// import 'highcharts/modules/stock-tools'; // 문제가 있는 모듈 제거
// import 'highcharts/modules/full-screen'; // 문제가 있는 모듈 제거
// import 'highcharts/modules/annotations-advanced'; // 문제가 있는 모듈 제거
// import 'highcharts/modules/price-indicator'; // 문제가 있는 모듈 제거
// import 'highcharts/indicators/indicators-all'; // 문제가 있는 모듈 제거
// Highcharts 모바일 지원은 기본적으로 포함되어 있음
// 추가 모바일 설정은 chartOptions에서 처리

const CorrelationChart = ({
  assetId = 'BTCUSDT',
  title = 'Bitcoin Price vs MVRV Z-Score Correlation',
  height = 800,
  showRangeSelector = true,
  showStockTools = false,
  showExporting = true,
  metricId = 'mvrv_z_score'
}) => {
  console.log('[OnChainChart] 마운트', { assetId, metricId, height, showRangeSelector, showStockTools, showExporting });
  const [priceData, setPriceData] = useState([]);
  const [mvrvData, setMvrvData] = useState([]);
  const [correlation, setCorrelation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fallbackTried, setFallbackTried] = useState(false);
  const [isFetchingFallback, setIsFetchingFallback] = useState(false);
  const [chartType, setChartType] = useState('line'); // line, spline, area
  const [showFlags, setShowFlags] = useState(true);
  const [useLogScale, setUseLogScale] = useState(false); // 로그 스케일 상태
  const [isAreaMode, setIsAreaMode] = useState(false);
  const [lineSplineMode, setLineSplineMode] = useState('line'); // 'line' 또는 'spline'
  const [colorMode, setColorMode] = useState('dark'); // 기본값: 다크 모드
  const [currentCorrelation, setCurrentCorrelation] = useState(null); // 현재 선택된 범위의 상관관계
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // 모바일 상태
  const chartRef = useRef(null);
  const previousCorrelationRef = useRef(null); // 이전 상관관계 값을 추적

  // 메트릭 ID를 표시 이름으로 변환하는 함수
  const getMetricDisplayName = (metricId) => {
    const metricNameMap = {
      'mvrv_z_score': 'MVRV Z-Score',
      'sopr': 'SOPR',
      'nupl': 'NUPL',
      'realized_price': 'Realized Price',
      'hashrate': 'Hash Rate',
      'difficulty': 'Difficulty',
      'miner_reserves': 'Miner Reserves',
      'etf_btc_total': 'ETF BTC Total',
      'etf_btc_flow': 'ETF BTC Flow',
      'open_interest_futures': 'Open Interest Futures',
      'realized_cap': 'Realized Cap',
      'cdd_90dma': 'CDD 90DMA',
      'true_market_mean': 'True Market Mean',
      'nrpl_btc': 'NRPL BTC',
      'aviv': 'AVIV',
      'thermo_cap': 'Thermo Cap',
      'hodl_waves_supply': 'HODL Waves Supply'
    };
    
    return metricNameMap[metricId] || metricId.toUpperCase().replace(/_/g, ' ');
  };

  // 화면 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 통합 메트릭 데이터 가져오기 - 통합 엔드포인트를 직접 호출 (price + metric + date 동시 수신)
  const { data: _ignoredHookData, loading: _ignoredLoading, error: _ignoredError } = useAPI.onchain.metrics(metricId, '1y');
  useEffect(() => {
    const controller = new AbortController();
    const url = `/api/v1/metrics/${assetId}?metrics=price,${metricId}&limit=10000&compute=correlation`;
    const run = async () => {
      try {
        setLoading(true);
        setIsFetchingFallback(true);
        setFallbackTried(true); // 초기 통합 호출로 폴백 루틴 비활성화
        console.log('[OnChainChart] 초기 통합 호출 시작', { url });
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data || !data.series) throw new Error('Invalid series');

        const dateData = data.series.date || [];
        const priceSeries = data.series.price || [];
        const metricSeries = data.series[metricId] || [];

        console.log('[OnChainChart] 응답 길이', { date: dateData.length, price: priceSeries.length, metric: metricSeries.length });

        const formattedPriceData = [];
        for (let i = 0; i < Math.min(dateData.length, priceSeries.length); i++) {
          const dateStr = dateData[i].date;
          const price = priceSeries[i].close_price;
          if (dateStr && price !== undefined && price !== null) {
            const t = new Date(dateStr).getTime();
            const v = parseFloat(price);
            if (!isNaN(t) && !isNaN(v) && t > 0) formattedPriceData.push([t, v]);
          }
        }

        const formattedMetricData = [];
        for (let i = 0; i < Math.min(dateData.length, metricSeries.length); i++) {
          const dateStr = dateData[i].date;
          const raw = metricSeries[i];
          const v = raw && typeof raw === 'object' && 'value' in raw ? raw.value : Number(raw);
          if (dateStr && v !== undefined && v !== null) {
            const t = new Date(dateStr).getTime();
            const nv = parseFloat(v);
            if (!isNaN(t) && !isNaN(nv)) formattedMetricData.push([t, nv]);
          }
        }

        const sp = formattedPriceData.sort((a, b) => a[0] - b[0]);
        const sm = formattedMetricData.sort((a, b) => a[0] - b[0]);
        console.log('[OnChainChart] 정렬 후 길이(초기 호출)', { price: sp.length, metric: sm.length });
        setPriceData(sp);
        setMvrvData(sm);
        if (data.analysis && data.analysis.correlation) {
          setCorrelation(data.analysis.correlation[metricId]);
        }
        setLoading(false);
        setIsFetchingFallback(false);
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error('[OnChainChart] 초기 통합 호출 실패', e);
        setError('메트릭 데이터를 불러오지 못했습니다.');
        setLoading(false);
        setIsFetchingFallback(false);
      }
    };
    run();
    return () => controller.abort();
  }, [assetId, metricId]);

  // 통합 엔드포인트를 기본으로 사용하므로, 추가 훅 기반 처리/폴백은 제거

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
      chart.series.forEach(series => {
        if (series.type !== 'flags') {
          series.update({ type: newChartType }, false);
        }
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
      chart.series.forEach(series => {
        if (series.type !== 'flags') {
          series.update({ type: newChartType }, false);
        }
      });
      chart.redraw();
    }
  };

  // 플래그 토글 핸들러
  const handleFlagsToggle = () => {
    setShowFlags(!showFlags);
  };

  // 로그 스케일 토글 핸들러
  const handleLogScaleToggle = () => {
    setUseLogScale(!useLogScale);
  };

  // 특정 범위의 상관관계 계산 함수 (메모이제이션)
  const calculateCorrelationForRange = useCallback((startTime, endTime) => {
    if (!priceData.length || !mvrvData.length) return null;

    // 선택된 범위 내의 데이터 필터링
    const filteredPriceData = priceData.filter(point => 
      point[0] >= startTime && point[0] <= endTime
    );
    const filteredMvrvData = mvrvData.filter(point => 
      point[0] >= startTime && point[0] <= endTime
    );

    if (filteredPriceData.length < 5) return null; // 최소 5개 데이터 필요

    // 공통 날짜의 데이터만 추출
    const priceMap = new Map(filteredPriceData.map(point => [point[0], point[1]]));
    const mvrvMap = new Map(filteredMvrvData.map(point => [point[0], point[1]]));
    
    const commonDates = [...priceMap.keys()].filter(date => mvrvMap.has(date));
    
    if (commonDates.length < 5) return null;

    const priceValues = commonDates.map(date => priceMap.get(date));
    const mvrvValues = commonDates.map(date => mvrvMap.get(date));

    // 상관계수 계산
    const n = priceValues.length;
    const sumX = priceValues.reduce((a, b) => a + b, 0);
    const sumY = mvrvValues.reduce((a, b) => a + b, 0);
    const sumXY = priceValues.reduce((sum, x, i) => sum + x * mvrvValues[i], 0);
    const sumX2 = priceValues.reduce((sum, x) => sum + x * x, 0);
    const sumY2 = mvrvValues.reduce((sum, y) => sum + y * y, 0);

    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    // 해석
    let interpretation = '';
    if (Math.abs(correlation) >= 0.7) {
      interpretation = correlation > 0 ? 'Strong Positive Correlation' : 'Strong Negative Correlation';
    } else if (Math.abs(correlation) >= 0.5) {
      interpretation = correlation > 0 ? 'Moderate Positive Correlation' : 'Moderate Negative Correlation';
    } else if (Math.abs(correlation) >= 0.3) {
      interpretation = correlation > 0 ? 'Weak Positive Correlation' : 'Weak Negative Correlation';
    } else {
      interpretation = 'No Significant Correlation';
    }

    const result = {
      correlation: Math.round(correlation * 1000) / 1000,
      interpretation,
      data_points: commonDates.length,
      start_date: new Date(startTime).toISOString().split('T')[0],
      end_date: new Date(endTime).toISOString().split('T')[0]
    };

    // 이전 값과 비교하여 변경사항이 있을 때만 상태 업데이트
    const previousCorrelation = previousCorrelationRef.current;
    if (!previousCorrelation || 
        previousCorrelation.correlation !== result.correlation ||
        previousCorrelation.start_date !== result.start_date ||
        previousCorrelation.end_date !== result.end_date) {
      previousCorrelationRef.current = result;
      return result;
    }

         return previousCorrelation;
   }, [priceData, mvrvData, isMobile]);

  const chartOptions = {
    chart: {
      height: height,
      type: 'line',
      animation: {
        duration: 500
      },
      // 모바일 설정
      zoomType: 'xy',
      panning: {
        enabled: true,
        type: 'xy'
      },
      pinchType: 'xy',
      events: {
        load: function() {
          console.log('차트 로드 완료');
          // 초기 상관관계 계산
          const extremes = this.xAxis[0].getExtremes();
          const initialCorrelation = calculateCorrelationForRange(extremes.min, extremes.max);
          if (initialCorrelation) {
            setCurrentCorrelation(initialCorrelation);
            previousCorrelationRef.current = initialCorrelation;
          }
        },
        render: function() {
          console.log('차트 렌더링 완료');
        }
      }
    },
    title: {
      text: title
    },
    subtitle: {
      text: correlation ? `상관계수: ${correlation.correlation} (${correlation.interpretation})` : '데이터 로딩 중...'
    },
    xAxis: {
      type: 'datetime',
      title: {
        text: '날짜'
      },
      events: {
        afterSetExtremes: function() {
          const extremes = this.getExtremes();
          const newCorrelation = calculateCorrelationForRange(extremes.min, extremes.max);
          
          // 이전 값과 비교하여 변경사항이 있을 때만 상태 업데이트
          if (newCorrelation && (!currentCorrelation || 
              currentCorrelation.correlation !== newCorrelation.correlation ||
              currentCorrelation.start_date !== newCorrelation.start_date ||
              currentCorrelation.end_date !== newCorrelation.end_date)) {
            setCurrentCorrelation(newCorrelation);
            console.log('범위 변경 - 새로운 상관관계:', newCorrelation);
          }
        }
      }
    },
    yAxis: [{
      title: {
        text: getMetricDisplayName(metricId)
      },
      labels: {
        format: '{value:.2f}',
        style: {
          fontSize: isMobile ? '0px' : '12px' // 모바일에서 라벨 숨김
        }
      },
      height: '100%',
      offset: 0,
      opposite: false
    }, {
      title: {
        text: 'Bitcoin 가격 (USD)'
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
      height: '100%',
      offset: 0,
      opposite: true,
      type: useLogScale ? 'logarithmic' : 'linear'
    }],
    rangeSelector: {
      enabled: showRangeSelector,
      buttons: [{
        type: 'month',
        count: 1,
        text: '1m'
      }, {
        type: 'month',
        count: 3,
        text: '3m'
      }, {
        type: 'month',
        count: 6,
        text: '6m'
      }, {
        type: 'year',
        count: 1,
        text: '1y'
      }, {
        type: 'all',
        text: 'All'
      }],
      selected: 2
    },
    tooltip: {
      shared: true,
      xDateFormat: '%Y-%m-%d',
      formatter: function() {
        let tooltip = `<b>${Highcharts.dateFormat('%Y-%m-%d', this.x)}</b><br/>`;
        
        // this.points가 존재하는지 확인
        if (this.points && Array.isArray(this.points)) {
          this.points.forEach(point => {
            if (point && point.series && point.series.name) {
              // 메트릭 이름을 동적으로 가져오기
              const metricName = getMetricDisplayName(metricId);
              
              if (point.series.name === metricName) {
                tooltip += `${point.series.name}: <b>${Number(point.y).toFixed(2)}</b><br/>`;
              } else if (point.series.name === 'Bitcoin Price') {
                const value = Number(point.y);
                let formattedValue;
                if (value >= 1000000) {
                  formattedValue = '$' + (value / 1000000).toFixed(2) + 'M';
                } else if (value >= 1000) {
                  formattedValue = '$' + (value / 1000).toFixed(2) + 'K';
                } else {
                  formattedValue = '$' + value.toFixed(2);
                }
                tooltip += `${point.series.name}: <b>${formattedValue}</b><br/>`;
              }
            }
          });
        }
        
        return tooltip;
      }
    },
    series: [{
      name: getMetricDisplayName(metricId),
      type: chartType,
      data: mvrvData,
      color: getColorMode(colorMode).metric,
      yAxis: 0,
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
            [0, Highcharts.color(getColorMode(colorMode).metric).setOpacity(0.7).get('rgba')],
            [0.5, Highcharts.color(getColorMode(colorMode).metric).setOpacity(0.35).get('rgba')],
            [0.8, Highcharts.color(getColorMode(colorMode).metric).setOpacity(0.05).get('rgba')],
            [0.9, Highcharts.color(getColorMode(colorMode).metric).setOpacity(0.02).get('rgba')],
            [1, Highcharts.color(getColorMode(colorMode).metric).setOpacity(0.01).get('rgba')]
          ]
        }
      }),
      tooltip: {
        valueDecimals: 2
      }
    }, {
      name: 'Bitcoin Price',
      type: isAreaMode ? 'line' : chartType, // Area 모드일 때는 항상 line으로 유지
      data: priceData,
      color: getColorMode(colorMode).coin,
      yAxis: 1,
      tooltip: {
        valueDecimals: 2,
        valuePrefix: '$'
      }
    }].concat(showFlags ? [{
      type: 'flags',
      color: '#fb922c',
      shape: 'squarepin',
      showInNavigator: true,
      navigatorOptions: {
        type: 'flags',
        data: [{
          x: '2012-11-28',
          title: '1st'
        },
        {
          x: '2016-07-09',
          title: '2nd'
        },
        {
          x: '2020-05-11',
          title: '3rd'
        }]
      },
      accessibility: {
        exposeAsGroupOnly: true,
        description: 'Bitcoin Halving Events'
      },
      data: [{
        x: '2012-11-28',
        title: '1st Halving',
        text: 'Reward down: 50 BTC to 25 BTC per block'
      },
      {
        x: '2016-07-09',
        title: '2nd Halving',
        text: 'Reward down: 25 BTC to 12.5 BTC per block'
      },
      {
        x: '2020-05-11',
        title: '3rd Halving',
        text: 'Reward down: 12.5 BTC to 6.25 BTC per block'
      }]
    }, {
      type: 'flags',
      color: '#fb922c',
      shape: 'squarepin',
      showInNavigator: true,
      navigatorOptions: {
        type: 'flags',
        data: [{
          x: '2024-04-19',
          title: '4th'
        }]
      },
      accessibility: {
        exposeAsGroupOnly: true,
        description: 'Bitcoin Halving Events'
      },
      data: [{
        x: '2024-04-19',
        title: '4th Halving',
        text: 'Reward down: 6.25 BTC to 3.125 BTC per block'
      }]
    }] : []),
    plotOptions: {
      line: {
        marker: {
          enabled: false
        }
      },
      // 모바일 터치 설정
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
    stockTools: {
      gui: {
        enabled: showStockTools
      }
    },
    // 모바일 최적화 설정
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
            inputEnabled: false
          },
          tooltip: {
            positioner: function (labelWidth, labelHeight, point) {
              return {
                x: Math.min(point.plotX + this.chart.plotLeft, this.chart.chartWidth - labelWidth - 10),
                y: Math.max(point.plotY + this.chart.plotTop - labelHeight - 10, 10)
              };
            }
          }
        }
      }]
    }
  };

  if (loading) {
    console.log('[OnChainChart] 로딩 중 렌더', { loading, priceLen: priceData.length, metricLen: mvrvData.length });
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-3">상관관계 차트 데이터 로딩 중...</span>
      </div>
    );
  }

  if (error) {
    console.error('[OnChainChart] 에러 렌더', { error });
    return (
      <div className="alert alert-danger">
        <h5>차트 에러</h5>
        <p>{error}</p>
      </div>
    );
  }

  if (!priceData.length || !mvrvData.length) {
    console.warn('[OnChainChart] 데이터 부족 렌더', { priceLen: priceData.length, metricLen: mvrvData.length, loading });
    return (
      <div className="alert alert-warning">
        <h5>데이터 없음</h5>
        <p>상관관계 분석을 위한 데이터가 충분하지 않습니다.</p>
      </div>
    );
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{title}</h5>
        <CardTools />
      </CCardHeader>
      <CCardBody>
        {/* Chart Controls */}
        <ChartControls
          chartType={lineSplineMode}
          onChartTypeChange={handleLineSplineToggle}
          isAreaMode={isAreaMode}
          onAreaModeToggle={handleAreaModeToggle}
          showFlags={showFlags}
          onFlagsToggle={handleFlagsToggle}
          useLogScale={useLogScale}
          onLogScaleToggle={handleLogScaleToggle}
          colorMode={colorMode}
          onColorModeChange={setColorMode}
          showFlagsButton={true} // Correlation 차트에서는 플래그 버튼 표시
        />



        {/* 현재 선택 범위 상관관계 표시 */}
        {currentCorrelation && (
          <div className={`${styles.correlationContainer} ${
            Math.abs(currentCorrelation.correlation) >= 0.7 ? styles.correlationStrong :
            Math.abs(currentCorrelation.correlation) >= 0.5 ? styles.correlationModerate :
            Math.abs(currentCorrelation.correlation) >= 0.3 ? styles.correlationWeak :
            styles.correlationNone
          }`}>
            <div className="row align-items-center">
              <div className="col-md-4">
                <div className="d-flex align-items-center">
                  <div className={`me-3 ${styles.correlationIndicator} ${
                    Math.abs(currentCorrelation.correlation) >= 0.7 ? styles.correlationIndicatorStrong :
                    Math.abs(currentCorrelation.correlation) >= 0.5 ? styles.correlationIndicatorModerate :
                    Math.abs(currentCorrelation.correlation) >= 0.3 ? styles.correlationIndicatorWeak :
                    styles.correlationIndicatorNone
                  }`}></div>
                  <div>
                    <strong className={
                      Math.abs(currentCorrelation.correlation) >= 0.7 ? styles.correlationTextStrong :
                      Math.abs(currentCorrelation.correlation) >= 0.5 ? styles.correlationTextModerate :
                      Math.abs(currentCorrelation.correlation) >= 0.3 ? styles.correlationTextWeak :
                      styles.correlationTextNone
                    }>
                      상관계수: {currentCorrelation.correlation}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <strong className={
                  Math.abs(currentCorrelation.correlation) >= 0.7 ? styles.correlationTextStrong :
                  Math.abs(currentCorrelation.correlation) >= 0.5 ? styles.correlationTextModerate :
                  Math.abs(currentCorrelation.correlation) >= 0.3 ? styles.correlationTextWeak :
                  styles.correlationTextNone
                }>
                  {currentCorrelation.interpretation}
                </strong>
              </div>
              <div className="col-md-4">
                <strong className={
                  Math.abs(currentCorrelation.correlation) >= 0.7 ? styles.correlationTextStrong :
                  Math.abs(currentCorrelation.correlation) >= 0.5 ? styles.correlationTextModerate :
                  Math.abs(currentCorrelation.correlation) >= 0.3 ? styles.correlationTextWeak :
                  styles.correlationTextNone
                }>
                  사용 포인트: {currentCorrelation.data_points}
                </strong>
              </div>
            </div>
          </div>
        )}
        
        {/* 차트 */}
        <div style={{ height: `${height}px` }}>
          <HighchartsReact
            highcharts={Highcharts}
            constructorType={'stockChart'}
            options={chartOptions}
            ref={chartRef}
          />
        </div>
      </CCardBody>
    </CCard>
  );
};

export default CorrelationChart;