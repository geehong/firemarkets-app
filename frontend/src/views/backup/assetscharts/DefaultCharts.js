import React from 'react'
import { CCard, CCardBody, CCardHeader, CButton } from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import { useNavigate } from 'react-router-dom'

const DefaultCharts = ({ ohlcvData, assetTicker }) => {
  const navigate = useNavigate()

  const handleDetailChartClick = () => {
    // 상세 차트 페이지로 이동
    navigate(`/assetsdetail/${assetTicker}/chart`)
  }

  if (!ohlcvData || ohlcvData.length === 0) {
    return (
      <CCard className="mb-4">
        <CCardHeader>Chart</CCardHeader>
        <CCardBody>
          <p>No chart data available.</p>
        </CCardBody>
      </CCard>
    )
  }

  // 차트를 1년전부터 최신 데이터 순으로 표시하기 위해 데이터를 내림차순으로 정렬합니다.
  // 최신 데이터가 먼저 오도록 정렬하여 차트에서 오른쪽에 최신 데이터가 표시되도록 합니다.
  const sortedOhlcvData = [...ohlcvData].sort(
    (a, b) => new Date(b.timestamp_utc) - new Date(a.timestamp_utc),
  )

  const chartData = {
    // 가로축 라벨을 년월만 표시하도록 포맷합니다. (예: "Jan 2023")
    labels: sortedOhlcvData.map((d) =>
      new Date(d.timestamp_utc).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
    ),
    datasets: [
      {
        label: `${assetTicker} Close Price`,
        backgroundColor: 'rgba(75,192,192,0.2)', // Area 차트 스타일을 위한 배경색
        borderColor: 'rgba(75,192,192,1)',
        pointBackgroundColor: 'rgba(75,192,192,1)',
        pointBorderColor: '#fff',
        data: sortedOhlcvData.map((d) => parseFloat(d.close_price)),
        fill: true, // Area 차트 스타일을 위해 fill 속성을 true로 설정
      },
    ],
  }

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // 범례 숨김
      },
    },
    scales: {
      x: {
        // x축 라벨이 너무 많을 경우 자동으로 건너뛰어 표시하도록 설정
        ticks: {
          autoSkip: true,
          maxRotation: 0, // 라벨 회전 방지
        },
      },
      y: {}, // y축은 기본 설정 사용
    },
    elements: {
      point: {
        radius: 0, // 차트의 모든 점(포인트)을 숨깁니다.
      },
    },
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>Price Chart</span>
        <CButton color="primary" size="sm" onClick={handleDetailChartClick}>
          Detail Chart
        </CButton>
      </CCardHeader>
      <CCardBody>
        <CChartLine data={chartData} options={chartOptions} />
      </CCardBody>
    </CCard>
  )
}

export default DefaultCharts
