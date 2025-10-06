import React, { useEffect, useState, useRef } from 'react'
import HighchartsReact from 'highcharts-react-official'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import CardTools from '../common/CardTools'
import Highcharts from 'highcharts/highstock'
import 'highcharts/modules/exporting'
import 'highcharts/modules/export-data'
import 'highcharts/modules/accessibility'
import 'highcharts/modules/stock-tools'
import { useOnChainMetricData } from '../../hooks/useIntegratedMetrics'

const SplineChart = ({
  title = 'MVRV Z-Score Chart',
  height = 600,
  backgroundColor = '#fff',
  color = '#ff6b6b',
  showRangeSelector = true,
  showStockTools = true,
  customOptions = {},
  assetId = 'BTCUSDT',
  metricId = 'mvrv-zscore',
  useApiData = true,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartData, setChartData] = useState([])
  const chartComponentRef = useRef(null)

  // API 데이터 fetching
  const { data: apiData, isLoading: apiLoading, error: apiError } = useOnChainMetricData(
    metricId, 
    assetId, 
    { limit: 10000 }
  );

  useEffect(() => {
    setLoading(true)
    setError(null)
    try {
      console.log('=== SplineChart 데이터 처리 ===');
      
      let dataSource;
      if (useApiData) {
        // API 응답에서 data 배열 추출
        const rawData = apiData?.data || [];
        console.log('API 응답 전체:', apiData);
        console.log('API에서 추출한 data 배열:', rawData);
        
        // MVRV Z-Score 데이터 형식 변환
        if (rawData.length > 0 && rawData[0]) {
          const firstItem = rawData[0];
          console.log('첫 번째 데이터 아이템 구조:', firstItem);
          
          // 데이터 형식에 따라 변환
          const transformedData = rawData.map(item => {
            try {
              // 다양한 필드명에 대응
              const timestamp = item.timestamp_utc || item.timestamp || item.date || item.x;
              const value = item.value || item.mvrv_z_score || item.mvrvZscore || item.y;
              
              if (!timestamp || value === undefined || value === null) {
                console.warn('유효하지 않은 데이터 포인트:', item);
                return null;
              }
              
              const timeValue = new Date(timestamp).getTime();
              const numValue = parseFloat(value);
              
              if (isNaN(timeValue) || isNaN(numValue)) {
                console.warn('숫자 변환 실패:', { timestamp, value, timeValue, numValue });
                return null;
              }
              
              return [timeValue, numValue];
            } catch (error) {
              console.error('데이터 변환 에러:', error, item);
              return null;
            }
          }).filter(item => item !== null);
          
          // 데이터 정렬 (시간순 오름차순)
          transformedData.sort((a, b) => a[0] - b[0]);
          console.log('변환 후 정렬된 데이터 샘플:', transformedData.slice(0, 3));
          
          // 데이터 샘플링 (성능 개선)
          if (transformedData.length > 50) {
            const step = Math.ceil(transformedData.length / 50);
            dataSource = transformedData.filter((_, index) => index % step === 0);
            console.log(`데이터 샘플링: ${transformedData.length} -> ${dataSource.length} 포인트`);
          } else {
            dataSource = transformedData;
          }
          
          // 중복 제거 (같은 시간대의 데이터)
          const uniqueData = [];
          const seen = new Set();
          dataSource.forEach(point => {
            const timeKey = Math.floor(point[0] / (24 * 60 * 60 * 1000)); // 일 단위로 그룹화
            if (!seen.has(timeKey)) {
              seen.add(timeKey);
              uniqueData.push(point);
            }
          });
          
          // 중복 제거 후 다시 정렬
          uniqueData.sort((a, b) => a[0] - b[0]);
          dataSource = uniqueData;
          console.log(`중복 제거 후: ${dataSource.length} 포인트`);
        } else {
          dataSource = [];
        }
      } else {
        dataSource = [];
      }
      
      console.log('변환된 데이터:', dataSource.slice(0, 5));
      console.log('총 데이터 포인트:', dataSource.length);
      
      if (dataSource.length > 0) {
        // 최종 데이터 정렬 (x값 기준 오름차순)
        const sortedData = dataSource.sort((a, b) => a[0] - b[0]);
        console.log('정렬 후 첫 번째 데이터:', sortedData[0]);
        console.log('정렬 후 마지막 데이터:', sortedData[sortedData.length - 1]);
        console.log('정렬 확인:', sortedData.slice(0, 3).map(item => new Date(item[0]).toISOString()));
        
        setChartData(sortedData);
      } else {
        setChartData([]);
        setError('차트 데이터가 없습니다.');
      }
    } catch (err) {
      console.error('SplineChart 데이터 처리 에러:', err);
      setError('차트 데이터를 처리하는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [apiData, useApiData])

  // API 에러 처리
  useEffect(() => {
    if (useApiData && apiError) {
      setError(`API 에러: ${apiError.message}`);
    }
  }, [apiError, useApiData]);

  // 로딩 상태 통합
  const isLoading = loading || (useApiData && apiLoading);

  const chartOptions = {
    chart: {
      type: 'spline',
      height: height,
      backgroundColor: backgroundColor,
      events: {
        load: function () {
          console.log('SplineChart 로드 완료');
        }
      },
      zooming: {
        type: 'x'
      },
      // 성능 개선 설정
      animation: {
        duration: 300
      }
    },
    title: {
      text: title,
      align: 'left'
    },
    subtitle: {
      text: 'MVRV Z-Score Analysis',
      align: 'left'
    },
    xAxis: {
      type: 'datetime',
      ordinal: false,
      // 축 설정 최적화
      tickInterval: 24 * 3600 * 1000, // 1일 간격
      minRange: 24 * 3600 * 1000 // 최소 1일 범위
    },
    yAxis: {
      title: {
        text: 'MVRV Z-Score'
      },
      plotLines: [
        {
          value: 7,
          color: '#ff4d4d',
          dashStyle: 'dash',
          width: 1,
          label: {
            text: 'Extremely Overvalued (7)',
            align: 'right',
            style: { color: '#ff4d4d' }
          }
        },
        {
          value: 3,
          color: '#ffcc00',
          dashStyle: 'dash',
          width: 1,
          label: {
            text: 'Overvalued (3)',
            align: 'right',
            style: { color: '#ffcc00' }
          }
        },
        {
          value: 0,
          color: '#00cc00',
          dashStyle: 'dash',
          width: 1,
          label: {
            text: 'Neutral (0)',
            align: 'right',
            style: { color: '#00cc00' }
          }
        },
        {
          value: -1,
          color: '#0066cc',
          dashStyle: 'dash',
          width: 1,
          label: {
            text: 'Undervalued (-1)',
            align: 'right',
            style: { color: '#0066cc' }
          }
        }
      ]
    },
    rangeSelector: {
      enabled: showRangeSelector,
      buttons: [{
        type: 'day',
        count: 3,
        text: '3d'
      }, {
        type: 'week',
        count: 1,
        text: '1w'
      }, {
        type: 'month',
        count: 1,
        text: '1m'
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
      selected: 3
    },
    stockTools: {
      gui: {
        enabled: showStockTools
      }
    },
    tooltip: {
      shared: true,
      xDateFormat: '%Y-%m-%d',
      formatter: function() {
        try {
          if (this.y === undefined || this.y === null || isNaN(this.y)) {
            return `<b>${Highcharts.dateFormat('%Y-%m-%d', this.x)}</b><br/>
                    MVRV Z-Score: <b>No data</b>`;
          }
          return `<b>${Highcharts.dateFormat('%Y-%m-%d', this.x)}</b><br/>
                  MVRV Z-Score: <b>${Number(this.y).toFixed(2)}</b>`;
        } catch (error) {
          console.error('Tooltip formatter error:', error);
          return `<b>${Highcharts.dateFormat('%Y-%m-%d', this.x)}</b><br/>
                  MVRV Z-Score: <b>Error</b>`;
        }
      }
    },
    series: [{
      name: 'MVRV Z-Score',
      type: 'spline',
      data: chartData,
      color: color,
      tooltip: {
        valueDecimals: 2
      },
      // 시리즈 최적화
      turboThreshold: 50,
      connectNulls: false
    }],
    credits: {
      enabled: false
    },
    exporting: {
      enabled: true
    },
    ...customOptions
  }

  if (isLoading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <span className="ms-3">Loading MVRV Z-Score data...</span>
    </div>
  )
  
  if (error) return (
    <div className="alert alert-danger">
      <h5>Chart Error</h5>
      <p>{error}</p>
    </div>
  )
  
  if (!chartData || chartData.length === 0) return (
    <div className="alert alert-warning">
      <h5>No Data Available</h5>
      <p>MVRV Z-Score 데이터가 없습니다. (데이터 포인트: {chartData?.length || 0})</p>
    </div>
  )

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{title}</h5>
        <CardTools />
      </CCardHeader>
      <CCardBody>
        <div style={{ height: `${height}px` }}>
          <HighchartsReact
            highcharts={Highcharts}
            constructorType={'stockChart'}
            options={chartOptions}
            ref={chartComponentRef}
          />
        </div>
      </CCardBody>
    </CCard>
  )
}

export default SplineChart
