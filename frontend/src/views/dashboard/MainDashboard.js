import React from 'react'
import { CRow, CCol, CCard, CCardHeader, CCardBody, CCardTitle } from '@coreui/react'
import DashboardChart from 'src/components/charts/DashboardChart'
import DashboardTable from 'src/components/tables/DashboardTable'
import PerformanceTreeMap from 'src/components/charts/PerformanceTreeMap'
import RealTimeWidgetsTypeA from 'src/components/widgets/RealTimeWidgetsTypeA'
import MiniPriceChart from 'src/components/charts/MiniPriceChart'
 

const MainDashboard = () => {
  const symbols = [ 'BTCUSDT', 'ETHUSDT', 'GCUSD', 'NVDA', 'MSFT', 'AAPL', 'SPY', 'QQQ' ]

  return (
    <>
      <CCard className="mb-4">
        <CCardBody style={{ padding: '8px' }}>
          <MiniPriceChart symbols={symbols} />
        </CCardBody>
      </CCard>

      <div className="card mb-4">
        <div className="card-body">
          <PerformanceTreeMap />
        </div>
      </div>
      
      <CCard className="mb-4">
        <CCardHeader>
          <CCardTitle className="card-title">Real-time Widgets</CCardTitle>
        </CCardHeader>
        <CCardBody>
          <RealTimeWidgetsTypeA symbols={symbols} />
        </CCardBody>
      </CCard>
      <DashboardChart />
      <DashboardTable />
    </>
  )
}

export default MainDashboard
