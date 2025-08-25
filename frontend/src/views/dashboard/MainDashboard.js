import React from 'react'
import { CRow, CCol } from '@coreui/react'
import Widgets from 'src/components/widgets/WidgetsDropdown'
import DashboardChart from 'src/components/charts/DashboardChart'
import DashboardTable from 'src/components/tables/DashboardTable'
import PerformanceTreeMap from 'src/components/charts/PerformanceTreeMap'
import RealtimePriceWidget from 'src/components/widgets/RealtimePriceWidget'

const MainDashboard = () => {
  // 실시간 가격 위젯 설정
  const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'DOT', 'DOGE', 'XRP'];
  const stockSymbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX'];

  return (
    <>
      <div className="card mb-4">
        <div className="card-body">
          <PerformanceTreeMap />
        </div>
      </div>
      
      {/* 실시간 가격 위젯 */}
      <CRow className="mb-4">
        <CCol md={6}>
          <RealtimePriceWidget
            title="주요 암호화폐 시세 (Binance)"
            symbols={cryptoSymbols}
            assetType="crypto"
            limit={8}
            onDataLoad={(data) => console.log('암호화폐 데이터 로드:', data)}
            onError={(error) => console.error('암호화폐 데이터 오류:', error)}
          />
        </CCol>
        <CCol md={6}>
          <RealtimePriceWidget
            title="주요 미국 주식 시세 (Yahoo)"
            symbols={stockSymbols}
            assetType="stock"
            limit={8}
            onDataLoad={(data) => console.log('주식 데이터 로드:', data)}
            onError={(error) => console.error('주식 데이터 오류:', error)}
          />
        </CCol>
      </CRow>
      
      <Widgets />
      <DashboardChart />
      <DashboardTable />
    </>
  )
}

export default MainDashboard
