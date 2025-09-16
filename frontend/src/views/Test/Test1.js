import React, { useState } from 'react'
import { CCard, CCardBody, CCardHeader, CFormSelect, CFormInput, CButton, CRow, CCol } from '@coreui/react'
import AssetsListTables from '../../components/tables/AssetsListTables'

const Test1 = () => {
  const [typeName, setTypeName] = useState('Stocks')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('market_cap')
  const [order, setOrder] = useState('desc')

  const assetTypes = [
    { value: 'Stocks', label: 'Stocks' },
    { value: 'Crypto', label: 'Crypto' },
    { value: 'ETFs', label: 'ETFs' },
    { value: 'Indices', label: 'Indices' },
    { value: 'Commodities', label: 'Commodities' },
    { value: 'Currencies', label: 'Currencies' },
    { value: 'Bonds', label: 'Bonds' },
    { value: 'Funds', label: 'Funds' }
  ]

  const sortOptions = [
    { value: 'market_cap', label: 'Market Cap' },
    { value: 'price', label: 'Price' },
    { value: 'change_percent_today', label: 'Change %' },
    { value: 'volume_today', label: 'Volume' }
  ]

  const orderOptions = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' }
  ]

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Test 1 - Assets Table API Test</strong>
            <p className="text-muted mb-0">새로운 Assets Table API와 AG Grid 스파크라인 테스트</p>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              <CCol md={3}>
                <label className="form-label">Asset Type</label>
                <CFormSelect
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                >
                  {assetTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <label className="form-label">Search</label>
                <CFormInput
                  type="text"
                  placeholder="Search ticker or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </CCol>
              <CCol md={2}>
                <label className="form-label">Sort By</label>
                <CFormSelect
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <label className="form-label">Order</label>
                <CFormSelect
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                >
                  {orderOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={2} className="d-flex align-items-end">
                <CButton 
                  color="primary" 
                  onClick={() => window.location.reload()}
                  className="w-100"
                >
                  Refresh
                </CButton>
              </CCol>
            </CRow>

            {/* 디버깅 정보 표시 */}
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '4px', 
              marginBottom: '20px',
              fontSize: '12px'
            }}>
              <strong>Debug Info:</strong><br/>
              Asset Type: {typeName}<br/>
              Search: {search || 'None'}<br/>
              Sort By: {sortBy}<br/>
              Order: {order}<br/>
              API Endpoint: /api/v1/assets-table/
            </div>
          </CCardBody>
        </CCard>

        <CCard>
          <CCardBody>
            <AssetsListTables
              typeName={typeName}
              search={search}
              sortBy={sortBy}
              order={order}
              height={700}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Test1 