// frontend/src/views/ChartTestPage.js
import React, { useEffect, useRef, useState } from 'react' // useState 추가
// 이 부분을 다음과 같이 수정합니다:
import { createChart, CandlestickSeries } from 'lightweight-charts' // CandlestickSeries 임포트 추가!
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

const ChartTestPage = () => {
  const chartContainerRef = useRef()
  const chartRef = useRef(null)
  const candleSeriesRef = useRef(null)
  const [msftData, setMsftData] = useState([]) // MSFT 데이터를 저장할 상태
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // MSFT의 asset_id (실제 ID로 변경해야 합니다. 예시로 13 사용)
  const MSFT_ASSET_ID = 1

  useEffect(() => {
    const fetchMsftData = async () => {
      setLoading(true)
      setError(null)
      try {
        // 예시: 지난 1년간의 일일 데이터 요청
        const today = new Date()
        const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
        const startDate = oneYearAgo.toISOString().split('T')[0]
        const endDate = today.toISOString().split('T')[0]

        const response = await fetch(
          // 실제 백엔드 API 엔드포인트로 변경해야 합니다.
          `/api/v1/ohlcv/${MSFT_ASSET_ID}?data_interval=1d&start_date=${startDate}&end_date=${endDate}`,
        )
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        // Lightweight Charts 형식으로 데이터 변환
        const mappedData = data.map((item) => ({
          time: item.timestamp_utc.split('T')[0], // 'YYYY-MM-DD' 형식
          open: parseFloat(item.open_price),
          high: parseFloat(item.high_price),
          low: parseFloat(item.low_price),
          close: parseFloat(item.close_price),
        }))

        // 시간 오름차순으로 정렬
        const sortedData = mappedData.sort((a, b) => new Date(a.time) - new Date(b.time))

        // 중복된 타임스탬프 제거 (첫 번째 항목 유지)
        const uniqueData = sortedData.filter(
          (item, index, self) => index === self.findIndex((t) => t.time === item.time),
        )
        const formattedData = uniqueData
        setMsftData(formattedData)
      } catch (e) {
        console.error('Error fetching MSFT data:', e)
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMsftData()
  }, [MSFT_ASSET_ID]) // MSFT_ASSET_ID가 변경될 일은 없지만, 명시적으로 의존성 추가

  useEffect(() => {
    console.log('ChartTestPage useEffect: 시작')
    console.log('chartContainerRef.current:', chartContainerRef.current)
    if (chartContainerRef.current) {
      console.log('Container clientWidth:', chartContainerRef.current.clientWidth)
      console.log('Container clientHeight:', chartContainerRef.current.clientHeight)
    }
    console.log('msftData length:', msftData.length)

    if (
      !chartContainerRef.current ||
      msftData.length === 0 || // msftData로 변경
      chartContainerRef.current.clientWidth === 0 ||
      chartContainerRef.current.clientHeight === 0
    ) {
      console.warn('Chart cannot be created: container not ready (width/height is 0) or no data.')
      return
    }

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
      console.log('Existing chart removed.')
    }

    const chartOptions = {
      layout: {
        textColor: 'black',
        background: { type: 'solid', color: 'white' },
      },
      grid: {
        vertLines: { color: '#e0e0e0' },
        horzLines: { color: '#e0e0e0' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 600,
    }

    console.log('Attempting to create chart with options:', chartOptions)
    try {
      const chart = createChart(chartContainerRef.current, chartOptions)
      console.log('Chart created successfully.')

      // 이 부분을 다음과 같이 수정합니다.
      // chart.addCandlestickSeries() 대신 chart.addSeries(CandlestickSeries, options)
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        // <--- 이 부분이 핵심!
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      })

      console.log('Candlestick series added.')
      console.log('Setting data to candlestick series:', msftData) // msftData로 변경
      candlestickSeries.setData(msftData) // msftData로 변경
      console.log('Data set to series.')

      chart.timeScale().fitContent()
      console.log('Chart content fitted.')

      const handleResize = () => {
        if (chartContainerRef.current) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth })
          chart.timeScale().fitContent()
        }
      }
      window.addEventListener('resize', handleResize)

      chartRef.current = chart
      candleSeriesRef.current = candlestickSeries

      return () => {
        console.log('ChartTestPage cleanup: Removing listeners and chart.')
        window.removeEventListener('resize', handleResize)
        if (chartRef.current) {
          chartRef.current.remove()
          chartRef.current = null
        }
      }
    } catch (e) {
      console.error('Error during chart creation or data setting:', e)
    }
  }, [msftData]) // 의존성 배열에 msftData 추가

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Lightweight Charts 테스트 페이지</strong>
            <small className="text-medium-emphasis ms-2">MSFT 캔들스틱 차트</small>
          </CCardHeader>
          <CCardBody>
            <p className="text-gray-600 mb-4">
              TradingView Lightweight Charts를 사용하여 MSFT의 OHLCV 데이터를 표시합니다.
            </p>
            {loading && <p>MSFT 데이터 로딩 중...</p>}
            {error && (
              <p className="text-danger">데이터를 불러오는 중 오류가 발생했습니다: {error}</p>
            )}
            {!loading && !error && msftData.length === 0 && <p>표시할 데이터가 없습니다.</p>}
            <div
              ref={chartContainerRef}
              style={{
                height: '600px',
                width: '100%',
                marginBottom: '20px',
                border: '2px solid red',
              }}
            >
              차트 컨테이너
            </div>
            <p className="text-gray-600 text-sm">
              위 차트는 MSFT의 최근 1년간 일일 데이터를 기반으로 합니다.
            </p>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default ChartTestPage
