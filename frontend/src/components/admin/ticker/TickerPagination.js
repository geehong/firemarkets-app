import React from 'react'
import {
  CCard,
  CCardBody,
  CCol,
  CRow,
  CFormSelect,
  CPagination,
  CPaginationItem,
} from '@coreui/react'
import { PAGINATION_OPTIONS } from '../../../constants/tickerSettings'

const TickerPagination = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}) => {
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const renderPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    // First page
    if (startPage > 1) {
      pages.push(
        <CPaginationItem key={1} onClick={() => onPageChange(1)}>
          1
        </CPaginationItem>,
      )
      if (startPage > 2) {
        pages.push(
          <CPaginationItem key="ellipsis1" disabled>
            ...
          </CPaginationItem>,
        )
      }
    }

    // Visible pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <CPaginationItem key={i} active={i === currentPage} onClick={() => onPageChange(i)}>
          {i}
        </CPaginationItem>,
      )
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <CPaginationItem key="ellipsis2" disabled>
            ...
          </CPaginationItem>,
        )
      }
      pages.push(
        <CPaginationItem key={totalPages} onClick={() => onPageChange(totalPages)}>
          {totalPages}
        </CPaginationItem>,
      )
    }

    return pages
  }

  return (
    <CCard className="mt-3">
      <CCardBody>
        <CRow className="align-items-center">
          <CCol md={6}>
            <div className="d-flex align-items-center">
              <span className="me-2">Show:</span>
              <CFormSelect
                value={pageSize}
                onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
                style={{ width: '80px' }}
                size="sm"
              >
                {PAGINATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </CFormSelect>
              <span className="ms-2">
                of {totalItems} items (Page {currentPage} of {totalPages})
              </span>
            </div>
          </CCol>
          <CCol md={6}>
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Showing {startItem} to {endItem} of {totalItems} entries
              </small>
              {totalPages > 1 && (
                <CPagination size="sm" className="mb-0">
                  <CPaginationItem
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                  >
                    Previous
                  </CPaginationItem>
                  {renderPageNumbers()}
                  <CPaginationItem
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                  >
                    Next
                  </CPaginationItem>
                </CPagination>
              )}
            </div>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default TickerPagination
