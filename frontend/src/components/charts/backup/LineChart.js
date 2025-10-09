import React, { useEffect, useState, useRef } from 'react'
import HighchartsReact from 'highcharts-react-official'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import CardTools from '../common/CardTools'
import Highcharts from 'highcharts/highstock'
import 'highcharts/modules/exporting'
// import 'highcharts/modules/export-data' // 문제가 있는 모듈 제거
import 'highcharts/modules/accessibility'
import 'highcharts/modules/stock-tools'
import { usePriceData, useOnChainMetricData } from '../../hooks/useIntegratedMetrics'

const LineChart = ({
  data = [],
  title = 'Line Chart',
  height = 600,
  backgroundColor = '#fff',
  color = '#007bff',
  showRangeSelector = true,
  showStockTools = true, // 추가
  customOptions = {},
  assetId = 'BTCUSDT',
  metricId = 'mvrv-zscore',
  useApiData = false, // API 데이터 사용 여부
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartData, setChartData] = useState([])
  const [seriesType, setSeriesType] = useState('line')
  const chartComponentRef = useRef(null)

  // API 데이터 fetching
  const { data: apiData, isLoading: apiLoading, error: apiError } = useOnChainMetricData(
    metricId, 
    assetId, 
    { limit: 1000 }
  );

  // 가격 데이터 fetching (metricId가 'price'인 경우)
  const { data: priceData, isLoading: priceLoading, error: priceError } = usePriceData(
    assetId, 
    { limit: 1000 }
  );

  useEffect(() => {
    setLoading(true)
    setError(null)
    try {
      console.log('=== LineChart 데이터 처리 ===');
      
      // API 데이터 사용 여부에 따라 데이터 소스 결정
      let dataSource;
      if (useApiData) {
        // metricId가 'price'인 경우 가격 데이터 사용
        if (metricId === 'price') {
          const rawData = priceData?.data || [];
          console.log('가격 API 응답 전체:', priceData);
          console.log('가격 API에서 추출한 data 배열:', rawData);
          
          if (rawData.length > 0 && rawData[0]) {
            const firstItem = rawData[0];
            console.log('첫 번째 가격 데이터 아이템 구조:', firstItem);
            
            dataSource = rawData.map(item => {
              try {
                const timestamp = item.date || item.timestamp || item.x;
                const value = item.value || item.price || item.close_price || item.y;
                
                if (!timestamp || value === undefined || value === null) {
                  console.warn('유효하지 않은 가격 데이터 포인트:', item);
                  return null;
                }
                
                const timeValue = new Date(timestamp).getTime();
                const numValue = parseFloat(value);
                
                if (isNaN(timeValue) || isNaN(numValue)) {
                  console.warn('가격 데이터 숫자 변환 실패:', { timestamp, value, timeValue, numValue });
                  return null;
                }
                
                return [timeValue, numValue];
              } catch (error) {
                console.error('가격 데이터 변환 에러:', error, item);
                return null;
              }
            }).filter(item => item !== null);
          } else {
            dataSource = [];
          }
        } else {
          // 메트릭 데이터 사용
          const rawData = apiData?.data || [];
          console.log('메트릭 API 응답 전체:', apiData);
          console.log('메트릭 API에서 추출한 data 배열:', rawData);
          
          if (rawData.length > 0 && rawData[0]) {
            const firstItem = rawData[0];
            console.log('첫 번째 메트릭 데이터 아이템 구조:', firstItem);
            
            dataSource = rawData.map(item => {
              try {
                const timestamp = item.timestamp_utc || item.timestamp || item.date || item.x;
                const value = item.value || item.mvrv_z_score || item.mvrvZscore || item.y;
                
                if (!timestamp || value === undefined || value === null) {
                  console.warn('유효하지 않은 메트릭 데이터 포인트:', item);
                  return null;
                }
                
                const timeValue = new Date(timestamp).getTime();
                const numValue = parseFloat(value);
                
                if (isNaN(timeValue) || isNaN(numValue)) {
                  console.warn('메트릭 데이터 숫자 변환 실패:', { timestamp, value, timeValue, numValue });
                  return null;
                }
                
                return [timeValue, numValue];
              } catch (error) {
                console.error('메트릭 데이터 변환 에러:', error, item);
                return null;
              }
            }).filter(item => item !== null);
          } else {
            dataSource = [];
          }
        }
      } else {
        dataSource = data;
      }
      
      console.log('받은 data:', dataSource);
      console.log('data 타입:', typeof dataSource);
      console.log('data가 배열인가:', Array.isArray(dataSource));
      console.log('data 길이:', dataSource?.length);
      
      if (!dataSource || !Array.isArray(dataSource) || dataSource.length === 0) {
        console.log('데이터가 없거나 유효하지 않습니다.');
        setChartData([])
        setError('차트 데이터가 없습니다.')
      } else {
        console.log('첫 번째 데이터 포인트:', dataSource[0]);
        console.log('데이터 형식 확인:', {
          isArray: Array.isArray(dataSource[0]),
          length: dataSource[0]?.length,
          timestamp: dataSource[0]?.[0],
          value: dataSource[0]?.[1]
        });
        
        // 데이터 정렬 (시간순 오름차순)
        const sortedData = dataSource.sort((a, b) => a[0] - b[0]);
        console.log('정렬 후 첫 번째 데이터:', sortedData[0]);
        console.log('정렬 후 마지막 데이터:', sortedData[sortedData.length - 1]);
        console.log('정렬 확인:', sortedData.slice(0, 3).map(item => new Date(item[0]).toISOString()));
        
        setChartData(sortedData)
      }
    } catch (err) {
      console.error('LineChart 데이터 처리 에러:', err);
      setError('차트 데이터를 처리하는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [data, apiData, priceData, metricId, useApiData])

  // API 에러 처리
  useEffect(() => {
    if (useApiData && apiError) {
      setError(`API 에러: ${apiError.message}`);
    }
    if (useApiData && metricId === 'price' && priceError) {
      setError(`가격 데이터 API 에러: ${priceError.message}`);
    }
  }, [apiError, priceError, useApiData, metricId]);

  // 로딩 상태 통합
  const isLoading = loading || (useApiData && apiLoading) || (useApiData && metricId === 'price' && priceLoading);

  useEffect(() => {
    // 차트 렌더 후 stocktools-wrapper를 아래로 이동
    const chartDiv = chartComponentRef.current?.container?.current
    if (chartDiv) {
      const stockTools = chartDiv.querySelector('.highcharts-stocktools-wrapper')
      if (stockTools) {
        stockTools.style.position = 'absolute'
        stockTools.style.bottom = '0'
        stockTools.style.left = '0'
        stockTools.style.width = '100%'
        stockTools.style.zIndex = 1
      }
    }
  }, [seriesType, loading])

  // 차트 타입 변경 핸들러
  const handleTypeChange = (type) => {
    setSeriesType(type)
    // Highcharts 인스턴스에 직접 적용
    const chart = chartComponentRef.current?.chart
    if (chart && chart.series && chart.series[0]) {
      chart.series[0].update({ type }, false)
      chart.redraw()
    }
  }

  const chartOptions = {
    chart: {
      type: seriesType,
      height: height,
      backgroundColor: backgroundColor,
    },
    title: {
      text: title,
    },
    xAxis: {
      type: 'datetime',
    },
    yAxis: {
      title: {
        text: 'Value',
      },
      labels: { align: 'left', format: '{value:.2f}' },
    },
    stockTools: {
      gui: {
        enabled: showStockTools,
      },
    },
    rangeSelector: {
      selected: showRangeSelector ? 4 : undefined,
      enabled: showRangeSelector,
    },
    tooltip: {
      shared: true,
      xDateFormat: '%Y-%m-%d',
    },
    series: [
      {
        type: seriesType,
        name: title,
        data: chartData,
        color: color,
        marker: { enabled: true, radius: 2 },
      },
    ],
    credits: {
      enabled: false,
    },
    exporting: {
      enabled: true,
    },
    ...customOptions,
  }

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>{error}</div>
  if (!chartData || chartData.length === 0) return <div>차트 데이터가 없습니다.</div>

  // 커스텀 버튼 스타일
  const buttonStyle = (active) => ({
    border: active ? '2px solid #007bff' : '1px solid #ccc',
    background: active ? '#e6f0ff' : '#fff',
    borderRadius: 6,
    marginRight: 8,
    padding: 6,
    cursor: 'pointer',
    outline: 'none',
    boxShadow: active ? '0 0 4px #007bff' : 'none',
    transition: 'all 0.2s',
    width: 32,
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  })

  // Stock Tools 툴바를 아래로 내리는 스타일
  const chartContainerStyle = {
    position: 'relative',
    paddingBottom: 48, // 아래 툴바 공간 확보
  }
  const stockToolsStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    zIndex: 1,
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{title}</h5>
        <CardTools />
      </CCardHeader>
      <CCardBody>
        {/* 커스텀 타입 버튼 */}
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
          <button
            style={buttonStyle(seriesType === 'line')}
            onClick={() => handleTypeChange('line')}
            title="Line"
          >
            <img src="/assets/icon/stock-icons/series-line.svg" alt="Line" width={20} height={20} />
          </button>
          <button
            style={buttonStyle(seriesType === 'spline')}
            onClick={() => handleTypeChange('spline')}
            title="Spline"
          >
            <img
              src="/assets/icon/stock-icons/series-spline.svg"
              alt="Spline"
              width={20}
              height={20}
            />
          </button>
        </div>
        <div style={chartContainerStyle}>
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

export default LineChart
