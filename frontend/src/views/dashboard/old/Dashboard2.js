import React, { useState, useEffect, useCallback } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CNav,
  CNavItem,
  CNavLink,
  CButtonGroup,
  CButton,
  CTable,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CTableBody,
  CTableDataCell,
  CPagination,
  CPaginationItem,
  CRow,
  CCol,
} from '@coreui/react'
import MainChart from './MainChart'

// Helper function to format date as YY/MM/DD
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}/${month}/${day}`
  } catch (e) {
    return 'Invalid Date'
  }
}

const tickerTabs = [
  { asset_id: 1, symbol: 'BTCUSDT', name: 'Bitcoin' },
  { asset_id: 3, symbol: 'GCUSD', name: 'Gold' },
  { asset_id: 4, symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
  { asset_id: 5, symbol: 'MSFT', name: 'Microsoft Corp.' },
]

const Dashboard2 = () => {
  const [activeTickerId, setActiveTickerId] = useState(tickerTabs[0].asset_id)
  const [tickerOhlcvData, setTickerOhlcvData] = useState([])
  const [loadingTableData, setLoadingTableData] = useState(false)
  const [tableError, setTableError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const fetchTickerData = useCallback(async () => {
    if (!activeTickerId) return
    setLoadingTableData(true)
    setTableError(null)
    try {
      const today = new Date()
      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
      const startDate = oneYearAgo.toISOString().split('T')[0]
      const endDate = today.toISOString().split('T')[0]
      const response = await fetch(
        `/api/ohlcv/${activeTickerId}?data_interval=1d&start_date=${startDate}&end_date=${endDate}`,
      )
      if (!response.ok) {
        throw new Error(`Failed to fetch data for asset ID ${activeTickerId}`)
      }
      const rawData = await response.json()
      // Calculate change_percent
      const processedData = rawData
        .sort((a, b) => new Date(a.timestamp_utc) - new Date(b.timestamp_utc))
        .map((item, index, arr) => {
          let changePercent = null
          if (index > 0) {
            const prevClose = parseFloat(arr[index - 1].close_price)
            const currentClose = parseFloat(item.close_price)
            if (prevClose !== 0) {
              changePercent = ((currentClose - prevClose) / prevClose) * 100
            }
          }
          return {
            ...item,
            change_percent: changePercent,
          }
        })
        .sort((a, b) => new Date(b.timestamp_utc) - new Date(a.timestamp_utc))
      setTickerOhlcvData(processedData)
    } catch (error) {
      setTableError(error.message)
      setTickerOhlcvData([])
    } finally {
      setLoadingTableData(false)
      setCurrentPage(1)
    }
  }, [activeTickerId])

  useEffect(() => {
    fetchTickerData()
  }, [fetchTickerData])

  const handleTabClick = (asset_id) => {
    setActiveTickerId(asset_id)
  }

  const handleItemsPerPageChange = (number) => {
    setItemsPerPage(number)
    setCurrentPage(1)
  }

  const paginatedData = tickerOhlcvData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )
  const totalPages = Math.ceil(tickerOhlcvData.length / itemsPerPage)

  // 페이지네이션 숫자 목록을 동적으로 생성하는 함수
  const getPaginationItems = () => {
    const delta = 2 // 현재 페이지 양쪽에 표시할 페이지 수
    const left = currentPage - delta
    const right = currentPage + delta + 1
    const range = []
    const rangeWithDots = []
    let l

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i < right)) {
        range.push(i)
      }
    }

    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1)
        } else if (i - l !== 1) {
          rangeWithDots.push('...')
        }
      }
      rangeWithDots.push(i)
      l = i
    }
    return rangeWithDots
  }

  const handlePageClick = (pageNumber) => {
    if (pageNumber === '...') return
    setCurrentPage(pageNumber)
  }

  return (
    <>
      <MainChart />
      <CRow>
        <CCol xs>
          <CCard className="mb-4">
            <CCardHeader>Traffic & Sales</CCardHeader>
            <CCardHeader>
              <CNav variant="tabs" role="tablist">
                {tickerTabs.map((tab) => (
                  <CNavItem key={tab.asset_id}>
                    <CNavLink
                      href="#"
                      active={activeTickerId === tab.asset_id}
                      onClick={(e) => {
                        e.preventDefault()
                        handleTabClick(tab.asset_id)
                      }}
                    >
                      {tab.symbol}
                    </CNavLink>
                  </CNavItem>
                ))}
              </CNav>
            </CCardHeader>
            <CCardBody>
              <CRow className="mb-3 align-items-center">
                <CCol xs={12} sm={6} md={4} className="mb-2 mb-md-0">
                  <span className="me-2">Show:</span>
                  <CButtonGroup>
                    {[5, 10, 25, 50].map((number) => (
                      <CButton
                        color="outline-secondary"
                        key={number}
                        className="mx-0"
                        active={itemsPerPage === number}
                        onClick={() => handleItemsPerPageChange(number)}
                      >
                        {number}
                      </CButton>
                    ))}
                  </CButtonGroup>
                </CCol>
              </CRow>
              {loadingTableData && <p>Loading data...</p>}
              {tableError && <p className="text-danger">Error loading data: {tableError}</p>}
              {!loadingTableData && !tableError && (
                <CTable align="middle" className="mb-0 border" hover responsive>
                  <CTableHead className="text-nowrap">
                    <CTableRow>
                      <CTableHeaderCell>Date</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Price (Close)</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Change (%)</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Open</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">High</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Low</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">Volume</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {paginatedData.map((item, index) => (
                      <CTableRow key={item.ohlcv_id || index}>
                        <CTableDataCell>{formatDate(item.timestamp_utc)}</CTableDataCell>
                        <CTableDataCell className="text-end">
                          {parseFloat(item.close_price).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </CTableDataCell>
                        <CTableDataCell
                          className={`text-end ${item.change_percent > 0 ? 'text-success' : item.change_percent < 0 ? 'text-danger' : ''}`}
                        >
                          {item.change_percent !== null
                            ? `${item.change_percent.toFixed(2)}%`
                            : 'N/A'}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {parseFloat(item.open_price).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {parseFloat(item.high_price).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {parseFloat(item.low_price).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {parseFloat(item.volume).toLocaleString('en-US', {
                            maximumFractionDigits: 0,
                          })}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
              {!loadingTableData && !tableError && totalPages > 1 && (
                <CPagination align="center" className="mt-3">
                  <CPaginationItem
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </CPaginationItem>
                  {getPaginationItems().map((page, index) => (
                    <CPaginationItem
                      key={index}
                      active={page === currentPage}
                      disabled={page === '...'}
                      onClick={() => handlePageClick(page)}
                    >
                      {page}
                    </CPaginationItem>
                  ))}
                  <CPaginationItem
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </CPaginationItem>
                </CPagination>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Dashboard2
