import React, { useState, useRef, useEffect } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { CCard, CCardBody, CCardHeader } from '@coreui/react';
import CardTools from '../common/CardTools';
import { useFourthHalvingStartPrice, useHalvingData } from '../../hooks/useIntegratedMetrics';
import styles from './css/CorrelationChart.module.css';

// Load Highcharts modules in correct order
import 'highcharts/modules/stock';
import 'highcharts/modules/exporting';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/drag-panes';
import 'highcharts/modules/navigator';

const HalvingChart = ({
  title = 'Bitcoin Halving Price Analysis',
  height = 1500,
  showRangeSelector = false,
  showExporting = true,
  singlePeriod = null
}) => {
  const [chartType, setChartType] = useState('line');
  const [useLogScale, setUseLogScale] = useState(false);
  const [startPrice, setStartPrice] = useState(64940);
  const [customStartPrice, setCustomStartPrice] = useState(64940);
  const [showPlotBands, setShowPlotBands] = useState(true);
  const [showMovingAverage, setShowMovingAverage] = useState(false);
  const [maPeriod, setMaPeriod] = useState(20);
  const [maWidth, setMaWidth] = useState(2);
  const [dayRange, setDayRange] = useState(1460);
  const [plotLineDay, setPlotLineDay] = useState(0);
  const [plotBandStart, setPlotBandStart] = useState(0);
  const [plotBandEnd, setPlotBandEnd] = useState(1460);
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [showHalving1, setShowHalving1] = useState(true);
  const [showHalving2, setShowHalving2] = useState(true);
  const [showHalving3, setShowHalving3] = useState(true);
  const [showHalving4, setShowHalving4] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const chartRef = useRef(null);

  // 4차 반감기 시작가격 가져오기
  const { data: defaultStartPrice = 0, isLoading: isLoadingStartPrice } = useFourthHalvingStartPrice();

  // 반감기 데이터 가져오기
  const periodsToLoad = singlePeriod ? [singlePeriod] : [1, 2, 3, 4];
  const halvingQueries = periodsToLoad.map(period => 
    useHalvingData(period, startPrice, { enabled: startPrice > 0 })
  );

  // 모든 쿼리의 로딩 상태 확인
  const isLoading = isLoadingStartPrice || halvingQueries.some(query => query.isLoading);
  
  // 에러 확인
  const error = halvingQueries.find(query => query.error)?.error;

  // 화면 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 차트 타입 변경 핸들러
  const handleChartTypeChange = (type) => {
    setChartType(type);
    const chart = chartRef.current?.chart;
    if (chart && chart.series && chart.series.length > 0) {
      chart.series.forEach(series => {
        series.update({ type }, false);
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
      chart.yAxis.forEach(axis => {
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
      console.log('Updating chart xAxis max to:', dayRange);
      chart.xAxis[0].setExtremes(0, dayRange);
    }
  }, [dayRange]);



  // 이동평균 계산 함수
  const calculateMovingAverage = (data, period) => {
    if (!data || data.length < period) return [];
    
    const result = [];
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
        
        if (data && data.ohlcv_data) {
          const ohlcvData = data.ohlcv_data;
          const chartData = ohlcvData.map((point) => [
            point.days || 0,
            point.close_price
          ]);
          
          const maData = calculateMovingAverage(chartData, maPeriod);
          const maSeries = maData
            .filter(point => point !== null)
            .map(point => [point[0], point[1]]);
          
          if (maSeries.length > 0) {
            series.push({
              name: `${period}st MA(${maPeriod})`,
              type: 'line',
              data: maSeries,
              color: `rgba(255, 107, 107, 0.6)`,
              line: {
                dash: 'dot',
                width: maWidth
              },
              tooltip: {
                valueDecimals: 2,
                valuePrefix: '$',
                formatter: function() {
                  // 4차 반감기 기준으로 날짜 계산
                  const fourthHalvingDate = new Date('2024-04-19');
                  const currentDate = new Date(fourthHalvingDate.getTime() + this.x * 24 * 60 * 60 * 1000);
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

  // 차트 데이터 변환
  const getChartSeries = () => {
    const series = [];
    const colors = ['#ff0000', '#ff8c00', '#32cd32', '#000000']; // 빨강, 주황, 초록, 검정
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
      
      if (data && data.ohlcv_data) {
        const ohlcvData = data.ohlcv_data;
        
        // 가로축을 일수로 변경 (days 필드 사용)
        let chartData = ohlcvData.map((point) => [
          point.days || 0, // days 필드 사용, 없으면 0
          point.close_price // 정규화된 가격
        ]);
        
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
          color: colors[index % colors.length],
          line: {
            width: lineWidths[index % lineWidths.length]
          },
          tooltip: {
            valueDecimals: 2,
            valuePrefix: '$',
            formatter: function() {
              // 4차 반감기 기준으로 날짜 계산
              const fourthHalvingDate = new Date('2024-04-19');
              const currentDate = new Date(fourthHalvingDate.getTime() + this.x * 24 * 60 * 60 * 1000);
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
      spacing: [5, 5, 5, 5],
      margin: [10, 10, 10, 10],
      events: {
        load: function() {
          console.log('Halving chart loaded');
        }
      }
    },
    title: {
      text: title,
      style: {
        fontSize: '14px'
      }
    },
    subtitle: {
      text: `Normalized to $${startPrice.toLocaleString()}`,
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
          return this.value + ' days';
        }
      },
      min: 0,
      max: dayRange,
      plotBands: showPlotBands ? [{
        color: 'rgba(68, 170, 213, 0.1)',
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
        color: '#ff0000',
        width: 2,
        value: plotLineDay,
        label: {
          text: 'Plot Line',
          style: {
            color: '#ff0000'
          }
        }
      }] : []
    },
    yAxis: {
      title: {
        text: 'Bitcoin Price (USD)'
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
          fontSize: '12px'
        }
      },
      type: useLogScale ? 'logarithmic' : 'linear'
    },
    rangeSelector: {
      enabled: false
    },
    tooltip: {
      shared: true,
      crosshairs: showCrosshair,
      formatter: function() {
        // 4차 반감기 기준으로 날짜 계산
        const fourthHalvingDate = new Date('2024-04-19');
        const currentDate = new Date(fourthHalvingDate.getTime() + this.x * 24 * 60 * 60 * 1000);
        const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;
        
        let tooltip = `<b>${dateStr}</b><br/>`;
        
        if (this.points && Array.isArray(this.points)) {
          this.points.forEach(point => {
            if (point && point.series && point.series.name) {
              const value = Number(point.y);
              let formattedValue;
              if (value >= 1000000) {
                formattedValue = '$' + (value / 1000000).toFixed(1) + 'M';
              } else if (value >= 1000) {
                formattedValue = '$' + (value / 1000).toFixed(0) + 'k';
              } else {
                formattedValue = '$' + value.toFixed(0);
              }
              tooltip += `${point.series.name}: <b>${formattedValue}</b><br/>`;
            }
          });
        }
        
        return tooltip;
      }
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
      enabled: true,
      xAxis: {
        labels: {
          formatter: function() {
            // 4차 반감기 기준으로 날짜 계산
            const fourthHalvingDate = new Date('2024-04-19');
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
                  // 4차 반감기 기준으로 날짜 계산
                  const fourthHalvingDate = new Date('2024-04-19');
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
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{title}</h5>
        <CardTools />
      </CCardHeader>
      <CCardBody>
        {/* Input Controls and Indicate Controls */}
        <div className="row mb-3">
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

        {/* Option Controls */}
        <div className="row mb-3">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Option Settings</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={showCrosshair}
                        onChange={(e) => setShowCrosshair(e.target.checked)}
                      />
                      <label className="form-check-label">Crosshair</label>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={showHalving1}
                        onChange={(e) => setShowHalving1(e.target.checked)}
                      />
                      <label className="form-check-label">Halving 1</label>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={showHalving2}
                        onChange={(e) => setShowHalving2(e.target.checked)}
                      />
                      <label className="form-check-label">Halving 2</label>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={showHalving3}
                        onChange={(e) => setShowHalving3(e.target.checked)}
                      />
                      <label className="form-check-label">Halving 3</label>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={showHalving4}
                        onChange={(e) => setShowHalving4(e.target.checked)}
                      />
                      <label className="form-check-label">Halving 4</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Type Icons */}
        <div className={styles.controlsContainer}>
          {/* 차트 타입 버튼들 */}
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={`${styles.chartButton} ${chartType === 'line' ? styles.chartButtonActive : styles.chartButtonInactive}`}
              onClick={() => handleChartTypeChange('line')}
            >
              <img 
                src="/assets/icon/stock-icons/linechart2.svg" 
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
                src="/assets/icon/stock-icons/splinechart.svg" 
                alt="Spline Chart" 
                className={styles.chartIcon}
              />
            </button>
            <button
              type="button"
              className={`${styles.chartButton} ${chartType === 'area' ? styles.chartButtonActive : styles.chartButtonInactive}`}
              onClick={() => handleChartTypeChange('area')}
            >
              <img 
                src="/assets/icon/stock-icons/areachart.svg" 
                alt="Area Chart" 
                className={styles.chartIcon}
              />
            </button>
          </div>

          {/* 로그 스케일 버튼 */}
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={`${styles.chartButton} ${useLogScale ? styles.logButtonActive : styles.logButtonInactive}`}
              onClick={handleLogScaleToggle}
              title="Toggle Log Scale"
            >
              <img 
                src={useLogScale ? "/assets/icon/stock-icons/linear.svg" : "/assets/icon/stock-icons/logarithmic.svg"} 
                alt="Log Scale" 
                className={styles.chartIcon}
              />
            </button>
          </div>
        </div>

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

export default HalvingChart; 