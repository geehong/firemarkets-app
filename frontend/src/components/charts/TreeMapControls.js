import React, { useState } from 'react'
import {
  CCard,
  CCardBody,
  CCol,
  CRow,
  CFormSelect,
  CFormInput,
  CButton,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'

const TreeMapControls = ({
  viewType,
  filters,
  onViewChange,
  onFilterChange,
  onSearch,
  onRefresh,
}) => {
  const [searchValue, setSearchValue] = useState('')

  const handleSearch = () => {
    onSearch(searchValue)
  }

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleRefresh = () => {
    onRefresh()
  }

  return (
    <CCard>
      <CCardBody>
        <CRow>
          <CCol md={3}>
            <CFormSelect
              value={viewType}
              onChange={(e) => onViewChange(e.target.value)}
              label="View Type"
            >
              <option value="category">By Category</option>
              <option value="country">By Country</option>
              <option value="sector">By Sector</option>
            </CFormSelect>
          </CCol>

          <CCol md={2}>
            <CFormSelect
              value={filters.category}
              onChange={(e) => onFilterChange('category', e.target.value)}
              label="Category Filter"
            >
              <option value="all">All Categories</option>
              <option value="Stocks">Stocks</option>
              <option value="Crypto">Crypto</option>
              <option value="ETF">ETF</option>
              <option value="Bonds">Bonds</option>
              <option value="Commodities">Commodities</option>
            </CFormSelect>
          </CCol>

          <CCol md={2}>
            <CFormSelect
              value={filters.country}
              onChange={(e) => onFilterChange('country', e.target.value)}
              label="Country Filter"
            >
              <option value="all">All Countries</option>
              <option value="United States">United States</option>
              <option value="China">China</option>
              <option value="Japan">Japan</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Germany">Germany</option>
              <option value="France">France</option>
              <option value="Canada">Canada</option>
              <option value="Switzerland">Switzerland</option>
              <option value="Netherlands">Netherlands</option>
              <option value="Australia">Australia</option>
            </CFormSelect>
          </CCol>

          <CCol md={2}>
            <CFormSelect
              value={filters.sector}
              onChange={(e) => onFilterChange('sector', e.target.value)}
              label="Sector Filter"
            >
              <option value="all">All Sectors</option>
              <option value="Technology">Technology</option>
              <option value="Financial">Financial</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Consumer Cyclical">Consumer Cyclical</option>
              <option value="Communication Services">Communication Services</option>
              <option value="Industrials">Industrials</option>
              <option value="Consumer Defensive">Consumer Defensive</option>
              <option value="Energy">Energy</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Utilities">Utilities</option>
              <option value="Basic Materials">Basic Materials</option>
            </CFormSelect>
          </CCol>

          <CCol md={3}>
            <CInputGroup>
              <CInputGroupText>
                <i className="cil-search"></i>
              </CInputGroupText>
              <CFormInput
                placeholder="Search assets..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={handleSearchKeyPress}
              />
              <CButton color="primary" onClick={handleSearch} disabled={!searchValue.trim()}>
                Search
              </CButton>
            </CInputGroup>
          </CCol>
        </CRow>

        <CRow className="mt-3">
          <CCol xs={12}>
            <CButton color="info" onClick={handleRefresh}>
              <i className="cil-reload me-2"></i>
              Refresh Data
            </CButton>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default TreeMapControls
