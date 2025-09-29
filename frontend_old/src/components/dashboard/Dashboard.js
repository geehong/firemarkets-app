import React from 'react'

import { CCard, CCardBody, CCol, CRow } from '@coreui/react'

import WidgetsDropdown from '../widgets/WidgetsDropdown'
import DashboardChart from '../charts/DashboardChart'

const Dashboard = () => {
  return (
    <>
      <WidgetsDropdown className="mb-4" />

      {/* Chart Component */}
      <DashboardChart />

      {/* Simple Table Test */}
      <CCard className="mb-4">
        <CCardBody>
          <h4 className="card-title mb-0">Asset Data Table</h4>
          <div className="small text-body-secondary mb-3">Latest price information</div>
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Current Price</th>
                  <th>Change (24h)</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>BTCUSDT</td>
                  <td>$43,250.00</td>
                  <td className="text-success">+2.5%</td>
                  <td>$1.2B</td>
                </tr>
                <tr>
                  <td>GCUSD</td>
                  <td>$2,150.00</td>
                  <td className="text-danger">-0.8%</td>
                  <td>$850M</td>
                </tr>
                <tr>
                  <td>SPY</td>
                  <td>$485.50</td>
                  <td className="text-success">+1.2%</td>
                  <td>$2.1B</td>
                </tr>
                <tr>
                  <td>MSFT</td>
                  <td>$415.75</td>
                  <td className="text-success">+0.9%</td>
                  <td>$1.8B</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CCardBody>
      </CCard>
    </>
  )
}

export default Dashboard
