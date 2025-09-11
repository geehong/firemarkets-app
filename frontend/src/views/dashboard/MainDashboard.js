import React from 'react'
import { CRow, CCol, CCard, CCardHeader, CCardBody, CCardTitle } from '@coreui/react'
import DashboardChart from 'src/components/charts/DashboardChart'
import DashboardTable from 'src/components/tables/DashboardTable'
import PerformanceTreeMap from 'src/components/charts/PerformanceTreeMap'
import RealTimeWidgetsTypeA from 'src/components/widgets/RealTimeWidgetsTypeA'
 

const MainDashboard = () => {
  

  return (
    <>
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
          <RealTimeWidgetsTypeA symbols={[ 'BTCUSDT', 'ETHUSDT', 'GCUSD', 'NVDA', 'MSFT', 'AAPL', 'SPY', 'QQQ' ]} />
        </CCardBody>
      </CCard>
      <DashboardChart />
      <DashboardTable />
    </>
  )
}

export default MainDashboard
