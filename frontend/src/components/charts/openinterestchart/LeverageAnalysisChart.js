import React, { useState, useRef, useEffect } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import ChartControls from '../../common/ChartControls';
import { getColorMode } from '../../../constants/colorModes';

// Load Highcharts modules
import 'highcharts/modules/boost';
import 'highcharts/modules/stock';
import 'highcharts/modules/exporting';
import 'highcharts/modules/accessibility';

const LeverageAnalysisChart = ({
  data,
  leverageData,
  height = 800,
  isLoading,
  error
}) => {
  const [useLogScale, setUseLogScale] = useState(false);
  const [isAreaMode, setIsAreaMode] = useState(false);
  const [lineSplineMode, setLineSplineMode] = useState('line');
  const [colorMode, setColorMode] = useState('dark');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const chartRef = useRef(null);

  // 화면 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 차트 데이터 변환
  const getChartSeries = () => {
    const series = [];
    const currentColors = getColorMode(colorMode);

    if (leverageData && leverageData.length > 0) {
      const leverageSeries = leverageData
        .filter(point => point.timestamp && point.leverage_ratio != null)
        .map(point => [
          new Date(point.timestamp).getTime(),
          Number(point.leverage_ratio)
        ])
        .sort((a, b) => a[0] - b[0]);

      if (leverageSeries.length > 0) {
        series.push({
          name: 'Leverage Ratio',
          type: isAreaMode ? (lineSplineMode === 'spline' ? 'areaspline' : 'area') : lineSplineMode,
          data: leverageSeries,
          color: currentColors.warning,
          lineWidth: 3,
          connectNulls: false,
          gapSize: 0
        });
      }
    }

    return series;
  };

  // 차트 옵션 생성
  const getChartOptions = () => {
    const series = getChartSeries();
    
    if (!series || series.length === 0) {
      return {
        chart: { height: height },
        title: { text: 'No Data Available' },
        series: []
      };
    }
    
    return {
      chart: {
        height: height,
        type: 'line',
        animation: { duration: 500 },
        zoomType: 'xy',
        panning: { enabled: true, type: 'xy' },
        pinchType: 'xy',
        spacing: [5, 5, 5, 5],
        margin: [10, 10, 10, 10]
      },
      boost: {
        useGPUTranslations: true,
        seriesThreshold: 1,
        usePreallocated: true
      },
      title: {
        text: 'Open Interest 레버리지 분석',
        style: { fontSize: '14px' }
      },
      subtitle: {
        text: data?.summary ? `현재 총 Open Interest: $${(data.summary.current_total / 1e9).toFixed(2)}B` : '',
        style: { fontSize: '12px' }
      },
      xAxis: {
        type: 'datetime',
        title: { text: '날짜' },
        labels: { style: { fontSize: '11px' } }
      },
      yAxis: [{
        title: {
          text: '레버리지 비율 (%)'
        },
        labels: {
          formatter: function() {
            return this.value.toFixed(2) + '%';
          },
          style: { fontSize: isMobile ? '0px' : '12px' }
        },
        type: useLogScale ? 'logarithmic' : 'linear'
      }],
      rangeSelector: {
        enabled: true,
        buttons: [{
          type: 'week',
          count: 1,
          text: '1w'
        }, {
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
        }],
        selected: 1
      },
      tooltip: {
        shared: true,
        xDateFormat: '%Y-%m-%d',
        formatter: function() {
          let tooltip = `<b>${Highcharts.dateFormat('%Y-%m-%d', this.x)}</b><br/>`;
          
          if (this.points && Array.isArray(this.points)) {
            this.points.forEach(point => {
              if (point && point.series && point.series.name) {
                tooltip += `${point.series.name}: <b>${Number(point.y).toFixed(2)}%</b><br/>`;
              }
            });
          }
          
          return tooltip;
        }
      },
      plotOptions: {
        line: {
          marker: { enabled: false }
        },
        area: {
          fillOpacity: 0.7,
          lineWidth: 1
        },
        series: {
          stickyTracking: false,
          enableMouseTracking: true
        }
      },
      credits: { enabled: false },
      exporting: { enabled: true },
      series: series,
      responsive: {
        rules: [{
          condition: { maxWidth: 768 },
          chartOptions: {
            chart: {
              height: Math.min(height, 600),
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
            }
          }
        }]
      }
    };
  };

  // Line/Spline 토글 핸들러
  const handleLineSplineToggle = () => {
    const newLineSplineMode = lineSplineMode === 'line' ? 'spline' : 'line';
    setLineSplineMode(newLineSplineMode);
  };

  // Area 모드 토글 핸들러
  const handleAreaModeToggle = () => {
    setIsAreaMode(!isAreaMode);
  };

  // 로그 스케일 토글 핸들러
  const handleLogScaleToggle = () => {
    setUseLogScale(!useLogScale);
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: `${height}px` }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>레버리지 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <h5>데이터 로딩 오류</h5>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!leverageData || leverageData.length === 0) {
    return (
      <div className="alert alert-warning">
        <h5>데이터 없음</h5>
        <p>레버리지 분석 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      {/* 요약 정보 */}
      {data?.summary && (
        <div className="row mb-3">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body text-center">
                <h6>현재 총 Open Interest</h6>
                <h4>${(data.summary.current_total / 1e9).toFixed(2)}B</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body text-center">
                <h6>평균</h6>
                <h4>${(data.summary.average_total / 1e9).toFixed(2)}B</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning text-white">
              <div className="card-body text-center">
                <h6>최고점</h6>
                <h4>${(data.summary.max_total / 1e9).toFixed(2)}B</h4>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-info text-white">
              <div className="card-body text-center">
                <h6>평균 레버리지</h6>
                <h4>
                  {leverageData.length > 0 
                    ? (leverageData.reduce((sum, item) => sum + item.leverage_ratio, 0) / leverageData.length).toFixed(2) + '%'
                    : 'N/A'
                  }
                </h4>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Controls */}
      <ChartControls
        chartType={lineSplineMode}
        onChartTypeChange={handleLineSplineToggle}
        isAreaMode={isAreaMode}
        onAreaModeToggle={handleAreaModeToggle}
        showFlags={false}
        onFlagsToggle={() => {}}
        useLogScale={useLogScale}
        onLogScaleToggle={handleLogScaleToggle}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
      />

      {/* 차트 */}
      <div style={{ height: `${height}px` }}>
        <HighchartsReact
          highcharts={Highcharts}
          constructorType={'stockChart'}
          options={getChartOptions()}
          ref={chartRef}
        />
      </div>

      {/* 레버리지 분석 정보 */}
      <div className="mt-4">
        <div className="card">
          <div className="card-header">
            <h6>레버리지 분석 정보</h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <h6>레버리지 비율이란?</h6>
                <p className="text-muted">
                  Open Interest와 시가총액의 비율로 계산됩니다.
                  높은 레버리지는 시장 위험 증가를 의미할 수 있습니다.
                </p>
              </div>
              <div className="col-md-4">
                <h6>위험도 해석</h6>
                <p className="text-muted">
                  • 5% 미만: 낮은 레버리지<br/>
                  • 5-10%: 보통 레버리지<br/>
                  • 10% 이상: 높은 레버리지
                </p>
              </div>
              <div className="col-md-4">
                <h6>시장 영향</h6>
                <p className="text-muted">
                  높은 레버리지는 가격 변동성을 증대시키고,
                  청산 리스크를 높일 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LeverageAnalysisChart;
