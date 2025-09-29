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

const ExchangeDistributionChart = ({
  data,
  exchangeData,
  height = 800,
  isLoading,
  error
}) => {
  const [useLogScale, setUseLogScale] = useState(false);
  const [isAreaMode, setIsAreaMode] = useState(true); // 기본값을 area로 설정
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

  // 거래소 색상 가져오기
  const getExchangeColor = (exchangeName) => {
    const colorModeConfig = getColorMode(colorMode);
    const exchangeKey = `exchange_${exchangeName.toLowerCase()}`;
    return colorModeConfig[exchangeKey] || colorModeConfig.exchange_other;
  };

  // 차트 데이터 변환
  const getChartSeries = () => {
    const series = [];

    if (data && data.data && data.data.length > 0) {
      const exchanges = Object.keys(data.data[0].exchanges || {});
      
      exchanges.forEach((exchange) => {
        const exchangeData = data.data
          .filter(point => point.timestamp && point.exchanges && point.exchanges[exchange] != null)
          .map(point => [
            new Date(point.timestamp).getTime(),
            Number(point.exchanges[exchange] || 0)
          ])
          .sort((a, b) => a[0] - b[0]);

        if (exchangeData.length > 0) {
          series.push({
            name: exchange.toUpperCase(),
            type: isAreaMode ? (lineSplineMode === 'spline' ? 'areaspline' : 'area') : lineSplineMode,
            data: exchangeData,
            color: getExchangeColor(exchange),
            fillOpacity: 0.7,
            lineWidth: 1,
            stack: 'exchanges',
            connectNulls: false,
            gapSize: 0
          });
        }
      });
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
        text: '거래소별 Open Interest 분포',
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
        xDateFormat: '%Y-%m-%d'
      },
      plotOptions: {
        line: {
          marker: { enabled: false }
        },
        area: {
          fillOpacity: 0.7,
          lineWidth: 1,
          stacking: 'normal'
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
          <p>거래소별 데이터 로딩 중...</p>
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

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="alert alert-warning">
        <h5>데이터 없음</h5>
        <p>거래소별 Open Interest 데이터가 없습니다.</p>
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
                <h6>거래소 수</h6>
                <h4>{data.metadata?.exchanges_included?.length || 0}</h4>
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
    </>
  );
};

export default ExchangeDistributionChart;
