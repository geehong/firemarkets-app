import React from 'react'

import { CCard, CCardBody, CCol, CRow } from '@coreui/react'

import WidgetsDropdown from '../widgets/WidgetsDropdown'
import MainChart from './MainChart'
import TickerDataTable from './MainTable' // Import the new component

const Dashboard = () => {
  return (
    <>
      <WidgetsDropdown className="mb-4" />
      <CCard className="mb-4">
        <CCardBody>
          <CRow>
            <CCol sm={5}>
              <h4 id="traffic" className="card-title mb-0">
                Market Trends
              </h4>
              <div className="small text-body-secondary">Last 1 Year</div>
            </CCol>
            <CCol sm={7} className="d-none d-md-block">
              {/* Buttons can be added here if needed */}
            </CCol>
          </CRow>
          <MainChart />
        </CCardBody>
      </CCard>

      <TickerDataTable />
    </>
  )
}

export default Dashboard
