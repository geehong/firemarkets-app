import React, { useEffect, useState, useRef } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { useIntegratedMetrics } from '../../hooks/useIntegratedMetrics';
import { CCard, CCardBody, CCardHeader } from '@coreui/react';
import CardTools from '../common/CardTools';
import styles from './css/CorrelationChart.module.css';

// Load Highcharts modules
import 'highcharts/modules/exporting';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/stock';
import 'highcharts/modules/drag-panes';
import 'highcharts/modules/navigator';
import 'highcharts/modules/export-data';
import 'highcharts/modules/stock-tools';
import 'highcharts/modules/full-screen';
import 'highcharts/modules/annotations-advanced';
import 'highcharts/modules/price-indicator';
import 'highcharts/indicators/indicators-all';

const CorrelationChart = ({
  assetId = 'BTCUSDT',
  title = 'Bitcoin Price vs MVRV Z-Score Correlation',
  height = 800,
  showRangeSelector = true,
  showStockTools = true,
  showExporting = true,
  metricId = 'mvrv-zscore'
}) => {
  const [priceData, setPriceData] = useState([]);
  const [mvrvData, setMvrvData] = useState([]);
  const [correlation, setCorrelation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('line'); // line, spline, area
  const [showFlags, setShowFlags] = useState(true);
  const [useLogScale, setUseLogScale] = useState(false); // 로그 스케일 상태
  const [currentCorrelation, setCurrentCorrelation] = useState(null); // 현재 선택된 범위의 상관관계
  const chartRef = useRef(null);

  // 통합 메트릭 데이터 가져오기
  const { data: integratedData, isLoading, error: apiError } = useIntegratedMetrics(
    assetId,
    ['price', metricId],
    { 
      limit: 10000,
      compute: 'correlation'
    }
  );

  useEffect(() => {
    if (integratedData && integratedData.series) {
      try {
        console.log('=== 상관관계 차트 데이터 처리 ===');
        console.log('통합 데이터:', integratedData);
        
        const series = integratedData.series;
        const dateData = series.date || [];
        const priceSeries = series.price || [];
        const mvrvSeries = series[metricId] || []; // Use the dynamic metricId
        
        console.log('날짜 데이터:', dateData.length);
        console.log('가격 데이터:', priceSeries.length);
        console.log('MVRV 데이터:', mvrvSeries.length);
        
        // 가격 데이터 변환
        const formattedPriceData = [];
        for (let i = 0; i < Math.min(dateData.length, priceSeries.length); i++) {
          try {
            const dateStr = dateData[i].date;
            const price = priceSeries[i].close_price;
            
            if (dateStr && price !== undefined && price !== null) {
              const timeValue = new Date(dateStr).getTime();
              const numValue = parseFloat(price);
             
              if (!isNaN(timeValue) && !isNaN(numValue) && timeValue > 0) {
                formattedPriceData.push([timeValue, numValue]);
              }
            }
          } catch (error) {
            console.error('가격 데이터 변환 에러:', error);
          }
        }
        
        // MVRV 데이터 변환
        const formattedMvrvData = [];
        for (let i = 0; i < Math.min(dateData.length, mvrvSeries.length); i++) {
          try {
            const dateStr = dateData[i].date;
            const mvrvValue = mvrvSeries[i].value;
            
            if (dateStr && mvrvValue !== undefined && mvrvValue !== null) {
              const timeValue = new Date(dateStr).getTime();
              const numValue = parseFloat(mvrvValue);
             
              if (!isNaN(timeValue) && !isNaN(numValue)) {
                formattedMvrvData.push([timeValue, numValue]);
              }
            }
          } catch (error) {
            console.error('MVRV 데이터 변환 에러:', error);
          }
        }
        
        // 데이터 정렬
        const sortedPriceData = formattedPriceData.sort((a, b) => a[0] - b[0]);
        const sortedMvrvData = formattedMvrvData.sort((a, b) => a[0] - b[0]);
        
        console.log('정렬된 가격 데이터:', sortedPriceData.length);
        console.log('정렬된 MVRV 데이터:', sortedMvrvData.length);
        
        setPriceData(sortedPriceData);
        setMvrvData(sortedMvrvData);
        
        // 상관관계 정보 설정
        if (integratedData.analysis && integratedData.analysis.correlation) {
          setCorrelation(integratedData.analysis.correlation[metricId]);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('상관관계 차트 데이터 처리 에러:', error);
        setError('데이터 처리 중 오류가 발생했습니다.');
        setLoading(false);
      }
    }
  }, [integratedData]);

  // API 에러 처리
  useEffect(() => {
    if (apiError) {
      setError(`API 에러: ${apiError.message}`);
      setLoading(false);
    }
  }, [apiError]);

  // 차트 타입 변경 핸들러
  const handleChartTypeChange = (type) => {
    setChartType(type);
    const chart = chartRef.current?.chart;
    if (chart && chart.series && chart.series.length > 0) {
      chart.series.forEach(series => {
        if (series.type !== 'flags') {
          series.update({ type }, false);
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

  // 특정 범위의 상관관계 계산 함수
  const calculateCorrelationForRange = (startTime, endTime) => {
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

    return {
      correlation: Math.round(correlation * 1000) / 1000,
      interpretation,
      data_points: commonDates.length,
      start_date: new Date(startTime).toISOString().split('T')[0],
      end_date: new Date(endTime).toISOString().split('T')[0]
    };
  };

  const chartOptions = {
    chart: {
      height: height,
      type: 'line',
      animation: {
        duration: 500
      },
      events: {
        load: function() {
          console.log('차트 로드 완료');
          // 초기 상관관계 계산
          const extremes = this.xAxis[0].getExtremes();
          const initialCorrelation = calculateCorrelationForRange(extremes.min, extremes.max);
          setCurrentCorrelation(initialCorrelation);
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
          setCurrentCorrelation(newCorrelation);
          console.log('범위 변경 - 새로운 상관관계:', newCorrelation);
        }
      }
    },
    yAxis: [{
      title: {
        text: 'MVRV Z-Score'
      },
      labels: {
        format: '{value:.2f}'
      },
      height: '100%',
      offset: 0,
      opposite: false
    }, {
      title: {
        text: 'Bitcoin 가격 (USD)'
      },
      labels: {
        format: '${value:,.0f}'
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
        
        this.points.forEach(point => {
          if (point.series.name === 'MVRV Z-Score') {
            tooltip += `${point.series.name}: <b>${Number(point.y).toFixed(2)}</b><br/>`;
          } else if (point.series.name === 'Bitcoin Price') {
            tooltip += `${point.series.name}: <b>$${Number(point.y).toLocaleString()}</b><br/>`;
          }
        });
        
        return tooltip;
      }
    },
    series: [{
      name: metricId === 'mvrv_z_score' ? 'MVRV Z-Score' : 
             metricId === 'sopr' ? 'SOPR' :
             metricId === 'nupl' ? 'NUPL' :
             metricId === 'realized_price' ? 'Realized Price' :
             metricId === 'hashrate' ? 'Hash Rate' :
             metricId === 'difficulty' ? 'Difficulty' :
             metricId === 'miner_reserves' ? 'Miner Reserves' :
             metricId === 'etf_btc_total' ? 'ETF BTC Total' :
             metricId === 'etf_btc_flow' ? 'ETF BTC Flow' :
             metricId === 'open_interest_futures' ? 'Open Interest Futures' :
             metricId === 'realized_cap' ? 'Realized Cap' :
             metricId === 'cdd_90dma' ? 'CDD 90DMA' :
             metricId === 'true_market_mean' ? 'True Market Mean' :
             metricId === 'nrpl_btc' ? 'NRPL BTC' :
             metricId === 'aviv' ? 'AVIV' :
             metricId === 'thermo_cap' ? 'Thermo Cap' :
             metricId === 'hodl_waves_supply' ? 'HODL Waves Supply' :
             metricId.toUpperCase().replace(/_/g, ' '),
      type: chartType,
      data: mvrvData,
      color: '#ff6b6b',
      yAxis: 0,
      tooltip: {
        valueDecimals: 2
      }
    }, {
      name: 'Bitcoin Price',
      type: chartType,
      data: priceData,
      color: '#ffbf00',
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
    }
  };

  if (loading) {
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
    return (
      <div className="alert alert-danger">
        <h5>차트 에러</h5>
        <p>{error}</p>
      </div>
    );
  }

  if (!priceData.length || !mvrvData.length) {
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
        {/* 인터랙티브 컨트롤 버튼들 */}
        <div className={styles.controlsContainer}>
          {/* 차트 타입 버튼들 */}
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={`${styles.chartButton} ${chartType === 'line' ? styles.chartButtonActive : styles.chartButtonInactive}`}
              onClick={() => handleChartTypeChange('line')}
            >
              <img 
                src="/assets/icon/stock-icons/series-line.svg" 
                alt="Line Chart" 
                className={styles.chartIcon}
              />
            </button>
            <button
              type="button"
              className={`${styles.chartButton} ${chartType === 'spline' ? styles.chartButtonActive : styles.chartButtonInactive}`}
              onClick={() => handleChartTypeChange('spline')}
            >
              <img 
                src="/assets/icon/stock-icons/series-spline.svg" 
                alt="Spline Chart" 
                className={styles.chartIcon}
              />
            </button>
            <button
              type="button"
              className={`${styles.chartButton} ${chartType === 'area' ? styles.chartButtonActive : styles.chartButtonInactive}`}
              onClick={() => handleChartTypeChange('area')}
            >
              <svg viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.areaIcon}>
                <g clipPath="url(#area-charts_svg__a)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15.055 4.769s-.008 0 0-.008m-3.681-2.766H4.626C2.275 1.995.8 3.66.8 6.015v6.359c0 2.356 1.468 4.02 3.826 4.02h6.747c2.36 0 3.827-1.664 3.827-4.02V6.016c0-2.356-1.467-4.021-3.826-4.021Z"></path>
                  <path d="m.942 13.565 5.254-6.001 3.37 3.005 5.488-5.8L14.5 13l-1 2-3 1h-5l-3-.5-1.558-1.935Z" fill="currentColor"></path>
                </g>
                <defs>
                  <clipPath id="area-charts_svg__a">
                    <path fill="#fff" transform="translate(0 .5)" d="M0 0h16v17H0z"></path>
                  </clipPath>
                </defs>
              </svg>
            </button>
          </div>

          {/* 토글 버튼들 */}
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={`${styles.chartButton} ${showFlags ? styles.flagButtonActive : styles.flagButtonInactive}`}
              onClick={handleFlagsToggle}
              title="Toggle Flags"
            >
              {showFlags ? (
                <img 
                  src="/assets/icon/stock-icons/flag-basic.svg" 
                  alt="Flags On" 
                  className={styles.chartIcon}
                />
              ) : (
                <div className={styles.flagContainer}>
                  <img 
                    src="/assets/icon/stock-icons/flag-basic.svg" 
                    alt="Flags Off" 
                    className={styles.flagIconInactive}
                  />
                  <div className={`${styles.xLine} ${styles.xLine1}`}></div>
                  <div className={`${styles.xLine} ${styles.xLine2}`}></div>
                </div>
              )}
            </button>
            <button
              type="button"
              className={`${styles.chartButton} ${useLogScale ? styles.logButtonActive : styles.logButtonInactive}`}
              onClick={handleLogScaleToggle}
              title="Toggle Log Scale (Price only)"
            >
              <img 
                src={useLogScale ? "/assets/icon/stock-icons/linear.svg" : "/assets/icon/stock-icons/logarithmic.svg"} 
                alt="Log Scale" 
                className={styles.chartIcon}
              />
            </button>
          </div>
        </div>



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