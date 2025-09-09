import React from 'react'
import { CRow, CCol } from '@coreui/react'
import Widgets from 'src/components/widgets/WidgetsDropdown'
import DashboardChart from 'src/components/charts/DashboardChart'
import DashboardTable from 'src/components/tables/DashboardTable'
import PerformanceTreeMap from 'src/components/charts/PerformanceTreeMap'
import RealTimeWidgets from 'src/components/widgets/RealTimeWidgets'
 

const MainDashboard = () => {
  

  return (
    <>
      <div className="card mb-4">
        <div className="card-body">
          <PerformanceTreeMap />
        </div>
      </div>
      
      <RealTimeWidgets />
      
      
      
      <Widgets />
      <DashboardChart />
      <DashboardTable />
    </>
  )
}

export default MainDashboard
