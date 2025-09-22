// frontend/src/views/assetsdetail/AssetsDetail.js
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { createChart } from 'lightweight-charts';
import { CCard, CCardBody, CCardHeader, CCol, CRow, CButton, CButtonGroup, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell } from '@coreui/react';

const AssetDetail = () => {
  const { assetId } = useParams();
  console.log('AssetDetail 컴포넌트 로드됨, assetId:', assetId);
  
  const [asset, setAsset] = useState(null);
  const [ohlcvData, setOhlcvData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interval, setInterval] = useState('1d');
  const [dateRange, setDateRange] = useState('3m');
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);

  const getDateRange = (range) => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate = new Date(today);

    switch (range) {
      case '3m':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(today.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      case '2y':
        startDate.setFullYear(today.getFullYear() - 2);
        break;
      case 'all':
        startDate = new Date('2010-01-01');
        break;
      default:
        startDate.setMonth(today.getMonth() - 3);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      console.log('데이터 페칭 시작, assetId:', assetId);
      setLoading(true);
      setError(null);
      try {
        console.log('자산 정보 요청 시작');
        const assetResponse = await axios.get(`/api/assets/${assetId}`);
        console.log('자산 정보 응답:', assetResponse.data);
        setAsset(assetResponse.data);

        const { startDate, endDate } = getDateRange(dateRange);
        console.log('OHLCV 데이터 요청 시작, 기간:', { startDate, endDate, interval });
        const ohlcvResponse = await axios.get(`/api/ohlcv/${assetId}`, {
          params: {
            data_interval: interval,
            start_date: startDate,
            end_date: endDate
          },
        });
        console.log('OHLCV 데이터 응답:', ohlcvResponse.data);
        
        const formattedOhlcv = ohlcvResponse.data.map(d => ({
          time: d.timestamp_utc.split('T')[0],
          open: Number(d.open_price),
          high: Number(d.high_price),
          low: Number(d.low_price),
          close: Number(d.close_price),
          volume: Number(d.volume)
        }));
        console.log('포맷팅된 OHLCV 데이터:', formattedOhlcv);
        setOhlcvData(formattedOhlcv);

      } catch (err) {
        console.error('데이터 페칭 에러:', err);
        if (err.response && err.response.status === 404) {
          setError('자산을 찾을 수 없습니다.');
        } else {
          setError('데이터를 불러오는데 실패했습니다.');
        }
      } finally {
        setLoading(false);
        console.log('데이터 페칭 완료');
      }
    };

    fetchData();
  }, [assetId, interval, dateRange]);

  useEffect(() => {
    if (!chartContainerRef.current || ohlcvData.length === 0 || chartContainerRef.current.clientWidth === 0 || chartContainerRef.current.clientHeight === 0) {
      return;
    }

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chartOptions = {
      layout: {
        textColor: 'black',
        background: { type: 'solid', color: 'white' }
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
      height: 400,
    };

    try {
        const chart = createChart(chartContainerRef.current, chartOptions);

        const candleSeries = chart.addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });

        candleSeries.setData(ohlcvData);

        chart.timeScale().fitContent();

        const handleResize = () => {
          if (chartContainerRef.current) {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            chart.timeScale().fitContent();
          }
        };
        window.addEventListener('resize', handleResize);

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;

        return () => {
          window.removeEventListener('resize', handleResize);
          if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
          }
        };
    } catch (e) {
        console.error("차트 생성 또는 데이터 설정 중 오류 발생:", e);
        setError("차트를 불러오는데 실패했습니다. 데이터 형식을 확인해주세요.");
    }
  }, [ohlcvData]);

  const handleIntervalChange = (newInterval) => {
    setInterval(newInterval);
  };

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };

  if (loading) return <p>자산 상세 정보를 불러오는 중...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (!asset) return <p>자산 정보를 찾을 수 없습니다.</p>;

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>{asset.name} ({asset.ticker})</strong>
            <small className="text-medium-emphasis ms-2">{asset.type_name}</small>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              <CCol md={6}>
                <p><strong>티커:</strong> {asset.ticker}</p>
                <p><strong>유형:</strong> {asset.type_name}</p>
                <p><strong>거래소:</strong> {asset.exchange || 'N/A'}</p>
                <p><strong>통화:</strong> {asset.currency || 'N/A'}</p>
                <p><strong>설명:</strong> {asset.description || '설명 없음'}</p>
              </CCol>
            </CRow>

            <h5 className="mb-3">시세 차트</h5>
            <div className="mb-3">
              <CButtonGroup role="group" aria-label="Interval selection" className="me-3">
                <CButton color="primary" variant={interval === '1d' ? 'solid' : 'outline'} onClick={() => handleIntervalChange('1d')}>1일</CButton>
                <CButton color="primary" variant={interval === '1h' ? 'solid' : 'outline'} onClick={() => handleIntervalChange('1h')}>1시간</CButton>
              </CButtonGroup>
              <CButtonGroup role="group" aria-label="Date range selection">
                <CButton color="secondary" variant={dateRange === '3m' ? 'solid' : 'outline'} onClick={() => handleDateRangeChange('3m')}>3개월</CButton>
                <CButton color="secondary" variant={dateRange === '6m' ? 'solid' : 'outline'} onClick={() => handleDateRangeChange('6m')}>6개월</CButton>
                <CButton color="secondary" variant={dateRange === '1y' ? 'solid' : 'outline'} onClick={() => handleDateRangeChange('1y')}>1년</CButton>
                <CButton color="secondary" variant={dateRange === '2y' ? 'solid' : 'outline'} onClick={() => handleDateRangeChange('2y')}>2년</CButton>
                <CButton color="secondary" variant={dateRange === 'all' ? 'solid' : 'outline'} onClick={() => handleDateRangeChange('all')}>전체</CButton>
              </CButtonGroup>
            </div>

            {ohlcvData.length > 0 ? (
              <>
                <div ref={chartContainerRef} style={{ height: '400px', width: '100%' }} className="mb-4"></div>
                <CTable>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>날짜</CTableHeaderCell>
                      <CTableHeaderCell>시가</CTableHeaderCell>
                      <CTableHeaderCell>고가</CTableHeaderCell>
                      <CTableHeaderCell>저가</CTableHeaderCell>
                      <CTableHeaderCell>종가</CTableHeaderCell>
                      <CTableDataCell>거래량</CTableDataCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {ohlcvData.map((data, index) => (
                      <CTableRow key={index}>
                        <CTableDataCell>{data.time}</CTableDataCell>
                        <CTableDataCell>{data.open}</CTableDataCell>
                        <CTableDataCell>{data.high}</CTableDataCell>
                        <CTableDataCell>{data.low}</CTableDataCell>
                        <CTableDataCell>{data.close}</CTableDataCell>
                        <CTableDataCell>{data.volume}</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </>
            ) : (
              <p>선택된 기간에 대한 시세 데이터가 없습니다.</p>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

export default AssetDetail;
