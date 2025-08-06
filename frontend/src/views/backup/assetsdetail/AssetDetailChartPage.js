import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CCard, CCardBody, CCardHeader, CCol, CRow, CNav, CNavItem, CNavLink } from '@coreui/react'
import DetailCharts from '../assetscharts/DetailCharts'

const AssetDetailChartPage = () => {
  const { assetId } = useParams()
  const navigate = useNavigate()
  const [dataInterval, setDataInterval] = useState('1d')

  const handleBackToDetail = () => {
    navigate(`/assetsdetail/${assetId}`)
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="card-title mb-0">{assetId} - Detail Chart</h5>
              <small className="text-muted">Interactive OHLCV Chart</small>
            </div>
            <button className="btn btn-outline-secondary btn-sm" onClick={handleBackToDetail}>
              ← Back to Detail
            </button>
          </CCardHeader>
          <CCardBody>
            {/* Data interval selection tabs */}
            <CNav variant="tabs" className="mb-3">
              <CNavItem>
                <CNavLink
                  active={dataInterval === '1d'}
                  onClick={() => setDataInterval('1d')}
                  style={{ cursor: 'pointer' }}
                >
                  Daily
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={dataInterval === '1W'}
                  onClick={() => setDataInterval('1W')}
                  style={{ cursor: 'pointer' }}
                >
                  Weekly
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink
                  active={dataInterval === '1M'}
                  onClick={() => setDataInterval('1M')}
                  style={{ cursor: 'pointer' }}
                >
                  Monthly
                </CNavLink>
              </CNavItem>
            </CNav>

            <DetailCharts assetIdentifier={assetId} dataInterval={dataInterval} />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default AssetDetailChartPage
