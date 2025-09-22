import React, { useEffect, useState, useRef, useCallback } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { useIntegratedMetrics } from '../../../hooks/useIntegratedMetrics';
import { CCard, CCardBody, CCardHeader } from '@coreui/react';
import CardTools from '../../common/CardTools';
import ChartControls from '../../common/ChartControls';
import { getColorMode } from '../../../constants/colorModes';
import styles from '../css/CorrelationChart.module.css';

// Load Highcharts modules in correct order
import 'highcharts/modules/stock';
import 'highcharts/modules/exporting';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/drag-panes';
import 'highcharts/modules/navigator';

const OpenInterestChart = ({
  title = 'Open Interest Futures Analysis',
  height = 800,
  showRangeSelector = true,
  showStockTools = false,
  showExporting = true
}) => {
  const [openInterestData, setOpenInterestData] = useState([]);
  const [bitcoinPriceData, setBitcoinPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('line');
  const [showFlags, setShowFlags] = useState(true);
  const [useLogScale, setUseLogScale] = useState(false);
  const [isAreaMode, setIsAreaMode] = useState(false);
  const [lineSplineMode, setLineSplineMode] = useState('line');
  const [colorMode, setColorMode] = useState('dark');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const chartRef = useRef(null);

  // Open Interest 데이터 가져오기
  const { data: integratedData, isLoading, error: apiError } = useOpenInterestData({
    limit: 1000,
    includeAnalysis: true,
    includeExchanges: true,
    includeLeverage: true
  });

  // 비트코인 가격 데이터 가져오기
  const { data: priceData, isLoading: priceLoading, error: priceError } = useIntegratedMetrics(
    'BTCUSDT',
    ['price'],
    { 
      limit: 1000
    }
  );

  // 화면 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (integratedData && integratedData.analysis && integratedData.analysis.data) {
      try {
        console.log('=== Open Interest 차트 데이터 처리 ===');
        console.log('통합 데이터:', integratedData);
        
        const data = integratedData.analysis.data;
        
        // 총 Open Interest 데이터 변환
        const formattedData = [];
        for (let i = 0; i < data.length; i++) {
          try {
            const point = data[i];
            if (point.timestamp && point.total !== undefined && point.total !== null) {
              const timeValue = new Date(point.timestamp).getTime();
              
              // total 값이 숫자인지 확인하고 변환
              let numValue;
              if (typeof point.total === 'number') {
                numValue = point.total;
              } else if (typeof point.total === 'string') {
                numValue = parseFloat(point.total);
              } else if (point.total && typeof point.total === 'object' && point.total.total) {
                // JSON 객체인 경우 total 필드 추출
                numValue = typeof point.total.total === 'number' ? point.total.total : parseFloat(point.total.total);
              } else {
                console.warn('Open Interest total 값이 예상과 다릅니다:', point.total);
                continue;
              }
             
              if (!isNaN(timeValue) && !isNaN(numValue) && timeValue > 0 && numValue > 0) {
                formattedData.push([timeValue, numValue]);
              }
            }
          } catch (error) {
            console.error('Open Interest 데이터 변환 에러:', error, 'point:', point);
          }
        }
        
        // 데이터 정렬
        const sortedData = formattedData.sort((a, b) => a[0] - b[0]);
        
        console.log('정렬된 Open Interest 데이터:', sortedData.length);
        
        setOpenInterestData(sortedData);
      } catch (error) {
        console.error('Open Interest 차트 데이터 처리 에러:', error);
        setError('데이터 처리 중 오류가 발생했습니다.');
      }
    }
  }, [integratedData]);

  // 비트코인 가격 데이터 처리
  useEffect(() => {
    if (priceData && priceData.series && priceData.series.price) {
      try {
        console.log('=== 비트코인 가격 데이터 처리 ===');
        console.log('가격 데이터:', priceData);
        
        const priceSeries = priceData.series.price;
        const dateData = priceData.series.date || [];
        
        // 비트코인 가격 데이터 변환
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
            console.error('비트코인 가격 데이터 변환 에러:', error);
          }
        }
        
        // 데이터 정렬
        const sortedPriceData = formattedPriceData.sort((a, b) => a[0] - b[0]);
        
        console.log('정렬된 비트코인 가격 데이터:', sortedPriceData.length);
        
        setBitcoinPriceData(sortedPriceData);
      } catch (error) {
        console.error('비트코인 가격 데이터 처리 에러:', error);
      }
    }
  }, [priceData]);

  // 로딩 상태 업데이트
  useEffect(() => {
    const allDataLoaded = !isLoading && !priceLoading && openInterestData.length > 0;
    setLoading(!allDataLoaded);
  }, [isLoading, priceLoading, openInterestData.length]);

  // API 에러 처리
  useEffect(() => {
    if (apiError || priceError) {
      const errorMessage = apiError ? `Open Interest API 에러: ${apiError.message}` : 
                          priceError ? `가격 API 에러: ${priceError.message}` : '알 수 없는 에러';
      setError(errorMessage);
      setLoading(false);
    }
  }, [apiError, priceError]);

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

  const chartOptions = {
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
      events: {
        load: function() {
          console.log('Open Interest 차트 로드 완료');
        },
        render: function() {
          console.log('Open Interest 차트 렌더링 완료');
        }
      }
    },
    title: {
      text: title
    },
    subtitle: {
      text: integratedData?.analysis?.summary ? 
        `현재 총 Open Interest: $${(integratedData.analysis.summary.current_total / 1e9).toFixed(2)}B` : 
        '데이터 로딩 중...'
    },
    xAxis: {
      type: 'datetime',
      title: {
        text: '날짜'
      },
      labels: {
        style: { fontSize: '11px' }
      }
    },
    yAxis: [{
      title: {
        text: 'Open Interest (USD)'
      },
      labels: {
        formatter: function() {
          const value = this.value;
          if (value >= 1e9) {
            return '$' + (value / 1e9).toFixed(1) + 'B';
          } else if (value >= 1e6) {
            return '$' + (value / 1e6).toFixed(1) + 'M';
          } else {
            return '$' + (value / 1e3).toFixed(1) + 'K';
          }
        },
        style: {
          fontSize: isMobile ? '0px' : '12px'
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
          fontSize: isMobile ? '0px' : '12px'
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
        
        if (this.points && Array.isArray(this.points)) {
          this.points.forEach(point => {
            if (point && point.series && point.series.name) {
              if (point.series.name === 'Total Open Interest') {
                const value = Number(point.y);
                let formattedValue;
                if (value >= 1e9) {
                  formattedValue = '$' + (value / 1e9).toFixed(2) + 'B';
                } else if (value >= 1e6) {
                  formattedValue = '$' + (value / 1e6).toFixed(2) + 'M';
                } else {
                  formattedValue = '$' + (value / 1e3).toFixed(2) + 'K';
                }
                tooltip += `${point.series.name}: <b>${formattedValue}</b><br/>`;
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
      name: 'Total Open Interest',
      type: chartType,
      data: openInterestData,
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
      data: bitcoinPriceData,
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
            inputEnabled: false,
            buttons: [{
              type: 'month',
              count: 1,
              text: '1m'
            }, {
              type: 'month',
              count: 3,
              text: '3m'
            }, {
              type: 'year',
              count: 1,
              text: '1y'
            }, {
              type: 'all',
              text: 'All'
            }]
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
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-3">Open Interest 데이터 로딩 중...</span>
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

  if (!openInterestData.length && !bitcoinPriceData.length) {
    return (
      <div className="alert alert-warning">
        <h5>데이터 없음</h5>
        <p>Open Interest 또는 비트코인 가격 데이터가 충분하지 않습니다.</p>
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
          showFlagsButton={true} // Open Interest 차트에서는 플래그 버튼 표시
        />

        {/* 요약 정보 */}
        {integratedData?.analysis?.summary && (
          <div className="row mb-3">
            <div className="col-md-3">
              <div className="card bg-primary text-white">
                <div className="card-body text-center">
                  <h6>현재 총 Open Interest</h6>
                  <h4>${(integratedData.analysis.summary.current_total / 1e9).toFixed(2)}B</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-success text-white">
                <div className="card-body text-center">
                  <h6>평균</h6>
                  <h4>${(integratedData.analysis.summary.average_total / 1e9).toFixed(2)}B</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-warning text-white">
                <div className="card-body text-center">
                  <h6>최고점</h6>
                  <h4>${(integratedData.analysis.summary.max_total / 1e9).toFixed(2)}B</h4>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-info text-white">
                <div className="card-body text-center">
                  <h6>거래소 수</h6>
                  <h4>{integratedData.analysis.metadata?.exchanges_included?.length || 0}</h4>
                </div>
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

export default OpenInterestChart;