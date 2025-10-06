import React, { useState, useEffect, useRef } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { usePriceData, useIntegratedMetrics } from '../../../hooks/useIntegratedMetrics';
import { CCard, CCardBody, CCardHeader } from '@coreui/react';

// Load Highcharts modules
import 'highcharts/modules/exporting';
import 'highcharts/modules/accessibility';
import 'highcharts/modules/drag-panes';
import 'highcharts/modules/navigator';
// import 'highcharts/modules/export-data'; // 문제가 있는 모듈 제거
// import 'highcharts/modules/stock-tools'; // 문제가 있는 모듈 제거
// import 'highcharts/modules/full-screen'; // 문제가 있는 모듈 제거
// import 'highcharts/modules/annotations-advanced'; // 문제가 있는 모듈 제거
// import 'highcharts/modules/price-indicator'; // 문제가 있는 모듈 제거
//import 'highcharts/indicators/indicators-all';

const OnChainChart = ({ 
  assetId = 'BTCUSDT',
  title = 'Bitcoin Historical Price and Halvings',
  height = 800,
  showRangeSelector = true,
  showStockTools = false,
  showExporting = true,
  useIntegratedData = false, // 통합 메트릭 데이터 사용 여부
  metrics = ['price'] // 통합 메트릭에서 사용할 메트릭들
}) => {
  const [chartData, setChartData] = useState([]);
  const [metricData, setMetricData] = useState([]); // integrated metric series
  const [chartType, setChartType] = useState('line'); // line, spline, area
  const [showHalvingLines, setShowHalvingLines] = useState(true);
  const [showFlags, setShowFlags] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentDataSource, setCurrentDataSource] = useState(useIntegratedData ? 'integrated' : 'price');
  const chartRef = useRef(null);
  
  // Use the price data hook with 1000 limit
  const { data: priceData, isLoading, error: priceError } = usePriceData(assetId, {
    limit: 10000,
    dataInterval: '1d'
  });

  // 통합 메트릭 데이터 훅
  const { data: integratedData, isLoading: integratedLoading, error: integratedError } = useIntegratedMetrics(
    assetId,
    metrics,
    { limit: 10000 }
  );

  useEffect(() => {

    
    if (currentDataSource === 'integrated') {
      // Build metric series
      if (integratedData && Array.isArray(integratedData.data)) {
        const metric = integratedData.data
          .map((p) => {
            const ts = new Date(p.date).getTime();
            const val = parseFloat(p.value);
            if (isNaN(ts) || isNaN(val) || ts <= 0) return null;
            return [ts, val];
          })
          .filter(Boolean)
          .sort((a, b) => a[0] - b[0]);
        setMetricData(metric);
      } else if (!integratedLoading && !integratedError) {
        setMetricData([]);
      }

      // Also keep price series for comparison when integrated mode
      if (priceData && priceData.data && priceData.data.length > 0) {
        const formattedPrice = priceData.data
          .map(item => {
            try {
              const timestamp = new Date(item.date).getTime();
              const price = parseFloat(item.value);
              if (isNaN(timestamp) || isNaN(price) || timestamp <= 0) return null;
              return [timestamp, price];
            } catch (_) { return null }
          })
          .filter(Boolean)
          .sort((a, b) => a[0] - b[0]);
        setChartData(formattedPrice);
      } else if (!isLoading && !priceError) {
        setChartData([]);
      }
    } else {
      // 기존 가격 데이터 사용
      if (priceData && priceData.data && priceData.data.length > 0) {
        
        // API 데이터를 Highcharts 형식으로 변환
        const formattedData = priceData.data
          .map(item => {
            try {
              const timestamp = new Date(item.date).getTime();
              const price = parseFloat(item.value);
              
              // 유효한 날짜와 가격인지 확인
              if (isNaN(timestamp) || isNaN(price) || timestamp <= 0) {
                console.warn('Invalid data point:', item);
                return null;
              }
              
              return [timestamp, price];
            } catch (error) {
              console.error('Error processing data point:', item, error);
              return null;
            }
          })
          .filter(item => item !== null); // null 값 제거     
   
        
        if (formattedData.length > 0) {
          // 데이터 정렬 (시간순 오름차순)
          const sortedData = formattedData.sort((a, b) => a[0] - b[0]);
          // 가격 범위 확인
          const prices = sortedData.map(item => item[1]);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          
          setChartData(sortedData);
        } else {
          console.log('유효한 데이터가 없습니다.');
          setChartData([]);
        }
      } else {
        console.log('priceData가 없거나 빈 배열입니다.');
        setChartData([]);
      }
    }
  }, [priceData, integratedData, currentDataSource, isLoading, priceError, integratedLoading, integratedError]);

  // 차트 데이터 변경 시 차트 업데이트
  useEffect(() => {
    const chart = chartRef.current?.chart;
    if (chart && chartData && chartData.length > 0) {
      console.log('차트 데이터 업데이트:', chartData.length, '포인트');
      
      try {
        // 시리즈 업데이트
        if (chart.series && chart.series[0]) {
          chart.series[0].setData(chartData, true, true, true);
          console.log('시리즈 데이터 업데이트 완료');
        }
        
        // 차트 범위 자동 조정 (StockChart 방식)
        if (chart.xAxis && chart.xAxis[0]) {
          chart.xAxis[0].setExtremes();
        }
        if (chart.yAxis && chart.yAxis[0]) {
          chart.yAxis[0].setExtremes();
        }
        
        console.log('차트 업데이트 완료');
      } catch (error) {
        console.error('차트 업데이트 에러:', error);
      }
    }
  }, [chartData]);

  // 데이터 소스 변경 시 차트 업데이트
  useEffect(() => {
    console.log(`데이터 소스 변경 감지: ${currentDataSource}`);
    console.log('현재 차트 데이터 개수:', chartData.length);
  }, [currentDataSource, chartData.length]);

  // 차트 타입 변경 핸들러
  const handleChartTypeChange = (type) => {
    setChartType(type);
    const chart = chartRef.current?.chart;
    if (chart && chart.series && chart.series[0]) {
      chart.series[0].update({ type }, false);
      chart.redraw();
    }
  };

  // 반감기 라인 토글 핸들러
  const handleHalvingLinesToggle = () => {
    setShowHalvingLines(!showHalvingLines);
  };

  // 플래그 토글 핸들러
  const handleFlagsToggle = () => {
    setShowFlags(!showFlags);
  };

  // 줌 인 핸들러
  const handleZoomIn = () => {
    const chart = chartRef.current?.chart;
    if (chart) {
      chart.zoomIn();
      setZoomLevel(prev => prev + 1);
    }
  };

  // 줌 아웃 핸들러
  const handleZoomOut = () => {
    const chart = chartRef.current?.chart;
    if (chart) {
      chart.zoomOut();
      setZoomLevel(prev => Math.max(1, prev - 1));
    }
  };

  // 전체 보기 핸들러
  const handleResetZoom = () => {
    const chart = chartRef.current?.chart;
    if (chart) {
      chart.resetZoom();
      setZoomLevel(1);
    }
  };

  // 차트 완전 새로고침 핸들러
  const handleChartRefresh = () => {
    const chart = chartRef.current?.chart;
    if (chart) {
      try {
        // 안전한 차트 새로고침 방법
        if (chart.series && chart.series[0]) {
          chart.series[0].setData(chartData, true, true, true);
        }
        
        // 축 범위 재설정
        if (chart.xAxis && chart.xAxis[0]) {
          chart.xAxis[0].setExtremes();
        }
        if (chart.yAxis && chart.yAxis[0]) {
          chart.yAxis[0].setExtremes();
        }
        
        // 차트 다시 그리기
        chart.redraw();
        console.log('차트 새로고침 완료');
      } catch (error) {
        console.error('차트 새로고침 에러:', error);
      }
    }
  };

  // 데이터 소스 전환 핸들러
  const handleDataSourceToggle = () => {
    const newDataSource = currentDataSource === 'price' ? 'integrated' : 'price';
    setCurrentDataSource(newDataSource);
    console.log(`데이터 소스 전환: ${currentDataSource} -> ${newDataSource}`);
    
    // 차트 데이터 초기화하여 새로운 데이터로 업데이트
    setChartData([]);
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
        },
        render: function() {
          console.log('차트 렌더링 완료');
        }
      }
    },
    accessibility: {
      typeDescription: `Stock chart with a line series and a flags series indicating key events.`
    },
    title: {
      text: title
    },
    xAxis: {
      type: 'datetime',
      overscroll: 2678400000, // 1 month
      plotLines: showHalvingLines ? [{
        value: new Date('2012-11-28').getTime(),
        color: '#ff0000',
        width: 2,
        dashStyle: 'solid',
        label: {
          style: { color: '#ff0000', fontWeight: 'bold' }
        }
      }, {
        value: new Date('2016-07-09').getTime(),
        color: '#ff0000',
        width: 2,
        dashStyle: 'solid',
        label: {
          style: { color: '#ff0000', fontWeight: 'bold' }
        }
      }, {
        value: new Date('2020-05-11').getTime(),
        color: '#ff0000',
        width: 2,
        dashStyle: 'solid',
        label: {
          style: { color: '#ff0000', fontWeight: 'bold' }
        }
      }, {
        value: new Date('2024-04-19').getTime(),
        color: '#ff0000',
        width: 2,
        dashStyle: 'solid',
        label: {
          style: { color: '#ff0000', fontWeight: 'bold' }
        }
      }] : []
    },
    yAxis: currentDataSource === 'integrated' ? [
      {
        title: { text: 'Price (USD)' },
        opposite: false
      },
      {
        title: { text: (metrics && metrics[0]) || 'Metric' },
        opposite: true
      }
    ] : {
      title: { text: 'Price (USD)' }
    },
    rangeSelector: {
      selected: 3,
      enabled: showRangeSelector,
      buttons: [{
        type: 'month',
        count: 3,
        text: '3m',
        title: 'View 3 months'
      }, {
        type: 'month',
        count: 6,
        text: '6m',
        title: 'View 6 months'
      }, {
        type: 'ytd',
        text: 'YTD',
        title: 'View year to date'
      }, {
        type: 'year',
        count: 1,
        text: '1y',
        title: 'View 1 year'
      }, {
        type: 'all',
        text: 'All',
        title: 'View all'
      }]
    },
    series: (function() {
      const series = []
      const priceSeries = {
        name: 'Bitcoin Price',
        type: chartType,
        color: '#ffbf00',
        data: chartData,
        id: 'dataseries',
        tooltip: { valueDecimals: 2, valuePrefix: '$' },
        dataGrouping: { enabled: false },
        turboThreshold: 0,
        animation: { duration: 500 },
        yAxis: currentDataSource === 'integrated' ? 0 : undefined
      }
      series.push(priceSeries)
      if (currentDataSource === 'integrated' && metricData.length > 0) {
        series.push({
          name: (metrics && metrics[0]) || 'Metric',
          type: 'line',
          color: '#2c7be5',
          data: metricData,
          tooltip: { valueDecimals: 4 },
          yAxis: 1,
          dataGrouping: { enabled: false },
          turboThreshold: 0
        })
      }
      if (showFlags) {
        series.push({
          type: 'flags',
          color: '#fb922c',
          onSeries: 'dataseries',
          shape: 'squarepin',
          showInNavigator: true,
          navigatorOptions: {
            type: 'flags',
            onSeries: undefined,
            data: [{ x: '2012-11-28', title: '1st' }, { x: '2016-07-09', title: '2nd' }, { x: '2020-05-11', title: '3rd' }]
          },
          accessibility: { exposeAsGroupOnly: true, description: 'Bitcoin Halving Events' },
          data: [
            { x: '2012-11-28', title: '1st Halving', text: 'Reward down: 50 BTC to 25 BTC per block' },
            { x: '2016-07-09', title: '2nd Halving', text: 'Reward down: 25 BTC to 12.5 BTC per block' },
            { x: '2020-05-11', title: '3rd Halving', text: 'Reward down: 12.5 BTC to 6.25 BTC per block' }
          ]
        })
        series.push({
          type: 'flags',
          color: '#fb922c',
          shape: 'squarepin',
          showInNavigator: true,
          navigatorOptions: {
            type: 'flags',
            data: [{ x: '2024-04-19', title: '4th' }]
          },
          accessibility: { exposeAsGroupOnly: true, description: 'Bitcoin Halving Events' },
          data: [{ x: '2024-04-19', title: '4th Halving', text: 'Reward down: 6.25 BTC to 3.125 BTC per block' }]
        })
      }
      return series
    })(),
    tooltip: {
      shared: true,
      formatter: function() {
        try {
          if (this.y === undefined || this.y === null || isNaN(this.y)) {
            return `<b>${Highcharts.dateFormat('%Y-%m-%d', this.x)}</b><br/>
                    Price: <b>No data</b>`;
          }
          return `<b>${Highcharts.dateFormat('%Y-%m-%d', this.x)}</b><br/>
                  Price: <b>$${Number(this.y).toLocaleString()}</b>`;
        } catch (error) {
          console.error('Tooltip formatter error:', error);
          return `<b>${Highcharts.dateFormat('%Y-%m-%d', this.x)}</b><br/>
                  Price: <b>Error</b>`;
        }
      }
    },
    exporting: {
      enabled: showExporting
    },
    credits: {
      enabled: false
    },
    stockTools: {
      gui: {
        enabled: showStockTools
      }
    }
  };

  // 로딩 상태 처리
  const isChartLoading = currentDataSource === 'integrated' ? integratedLoading : isLoading;

  // 에러 상태 처리
  const chartError = currentDataSource === 'integrated' ? integratedError : priceError;

  if (isChartLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: height 
      }}>
        <div>Loading chart data...</div>
      </div>
    );
  }

  // 에러 상태 처리
  if (chartError) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: height 
      }}>
        <div>Error loading data: {chartError.message}</div>
      </div>
    );
  }

  // 데이터 유효성 검사
  if (!chartData || chartData.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: height 
      }}>
        <div>No data available</div>
      </div>
    );
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{title}</h5>
      </CCardHeader>
      <CCardBody>
        {/* 인터랙티브 컨트롤 버튼들 */}
        <div className="mb-3 d-flex flex-wrap gap-2">
          {/* 차트 타입 버튼들 */}
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn btn-sm ${chartType === 'line' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleChartTypeChange('line')}
            >
              Line
            </button>
            <button
              type="button"
              className={`btn btn-sm ${chartType === 'spline' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleChartTypeChange('spline')}
            >
              Spline
            </button>
            <button
              type="button"
              className={`btn btn-sm ${chartType === 'area' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleChartTypeChange('area')}
            >
              Area
            </button>
          </div>

          {/* 줌 컨트롤 버튼들 */}
          <div className="btn-group" role="group">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <i className="fas fa-search-plus"></i>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              <i className="fas fa-search-minus"></i>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handleResetZoom}
              title="Reset Zoom"
            >
              <i className="fas fa-expand"></i>
            </button>
          </div>

          {/* 토글 버튼들 */}
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn btn-sm ${showHalvingLines ? 'btn-success' : 'btn-outline-success'}`}
              onClick={handleHalvingLinesToggle}
              title="Toggle Halving Lines"
            >
              <i className="fas fa-grip-lines-vertical"></i> Lines
            </button>
            <button
              type="button"
              className={`btn btn-sm ${showFlags ? 'btn-info' : 'btn-outline-info'}`}
              onClick={handleFlagsToggle}
              title="Toggle Flags"
            >
              <i className="fas fa-flag"></i> Flags
            </button>
            <button
              type="button"
              className={`btn btn-sm ${currentDataSource === 'integrated' ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={handleDataSourceToggle}
              title="Toggle Data Source"
            >
              <i className="fas fa-exchange-alt"></i> Data
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={handleChartRefresh}
              title="Refresh Chart"
            >
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
          </div>

          {/* 데이터 소스 표시 */}
          <div className="ms-auto">
            <span className={`badge ${currentDataSource === 'integrated' ? 'bg-warning' : 'bg-secondary'}`}>
              {currentDataSource === 'integrated' ? 'Integrated Data' : 'Price Data'}
            </span>
          </div>
        </div>

        {/* 차트 컨테이너 */}
        <div style={{ width: '100%', height: `${height}px` }}>
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

export default OnChainChart;
