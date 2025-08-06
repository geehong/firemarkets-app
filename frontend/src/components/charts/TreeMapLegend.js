import React from 'react'
import { CCard, CCardBody, CCardHeader, CListGroup, CListGroupItem, CBadge } from '@coreui/react'

const TreeMapLegend = ({ data, viewType }) => {
  // 데이터에서 고유한 값들을 추출
  const getUniqueValues = () => {
    if (!data || !Array.isArray(data)) return { categories: [], countries: [], sectors: [] }

    const categories = [...new Set(data.map((item) => item.category).filter(Boolean))]
    const countries = [...new Set(data.map((item) => item.country).filter(Boolean))]
    const sectors = [...new Set(data.map((item) => item.sector).filter(Boolean))]

    return { categories, countries, sectors }
  }

  const { categories, countries, sectors } = getUniqueValues()

  const getTotalMarketCap = () => {
    if (!data || !Array.isArray(data)) return 0
    return data.reduce((sum, item) => sum + (item.market_cap_usd || 0), 0)
  }

  const getCategoryMarketCap = (category) => {
    if (!data || !Array.isArray(data)) return 0
    return data
      .filter((item) => item.category === category)
      .reduce((sum, item) => sum + (item.market_cap_usd || 0), 0)
  }

  const formatMarketCap = (value) => {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`
    }
    return `$${value.toFixed(2)}`
  }

  return (
    <CCard className="border-0 shadow-sm">
      <CCardBody className="p-3">
        <div className="d-flex align-items-center flex-wrap">
          <div className="me-3 mb-2">
            <span className="text-muted small">Total Market Cap:</span>
            <span className="text-primary fw-bold fs-5 ms-2">
              {formatMarketCap(getTotalMarketCap())}
            </span>
          </div>
          <div className="mb-2">
            <span className="text-muted small">Breakdown:</span>
            <span className="text-secondary ms-2">
              {categories.map((category, index) => (
                <span key={category} className="badge bg-light text-dark me-1">
                  {category} {formatMarketCap(getCategoryMarketCap(category))}
                </span>
              ))}
            </span>
          </div>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default TreeMapLegend
