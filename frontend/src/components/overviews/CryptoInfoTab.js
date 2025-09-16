import React, { useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CProgress,
  CBadge,
  CButton,
} from '@coreui/react'
import { CIcon } from '@coreui/icons-react'
import {
  cilBarChart,
  cilArrowTop,
  cilArrowBottom,
  cilChart,
  cilMinus,
  cilPlus,
} from '@coreui/icons'

const CryptoInfoTab = ({ cryptoData, asset }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  const formatValue = (value, type = 'number') => {
    if (value === 'N/A' || value === null || value === undefined) return 'N/A'

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
      case 'percentage':
        return `${parseFloat(value).toFixed(2)}%`
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(value)
    }
  }

  // Use actual crypto data from database
  const actualCryptoData = cryptoData || {}

  console.log('🔍 CryptoInfoTab received cryptoData:', cryptoData)
  console.log('🔍 CryptoInfoTab received asset:', asset)

  // Get cryptocurrency description
  const getCryptoDescription = () => {
    return (
      actualCryptoData.description || 'Detailed cryptocurrency information will be displayed here.'
    )
  }

  // Get hierarchy info similar to ProfileTab
  const getHierarchyInfo = () => {
    const hierarchy = []

    // Asset type
    if (asset?.type_name) {
      hierarchy.push(asset.type_name)
    }

    // Exchange (for crypto, could be platform or network)
    if (actualCryptoData.platform) {
      const parsedPlatform = parsePlatformData(actualCryptoData.platform)
      if (parsedPlatform !== 'N/A') {
        // Extract just the platform name for hierarchy
        try {
          const platformObj =
            typeof actualCryptoData.platform === 'string'
              ? JSON.parse(actualCryptoData.platform)
              : actualCryptoData.platform
          if (platformObj && platformObj.name) {
            hierarchy.push(platformObj.name)
          } else {
            hierarchy.push(parsedPlatform)
          }
        } catch {
          hierarchy.push(parsedPlatform)
        }
      }
    } else if (asset?.exchange) {
      hierarchy.push(asset.exchange)
    }

    // Ticker
    if (asset?.ticker) {
      hierarchy.push(asset.ticker)
    }

    // Category
    if (actualCryptoData.category) {
      hierarchy.push(actualCryptoData.category)
    }

    // Currency
    if (asset?.currency) {
      hierarchy.push(asset.currency)
    }

    return hierarchy
  }

  // Parse platform data from JSON string
  const parsePlatformData = (platformData) => {
    if (!platformData || platformData === 'N/A') return 'N/A'

    try {
      // If it's already a string, try to parse it
      const parsed = typeof platformData === 'string' ? JSON.parse(platformData) : platformData

      if (parsed && typeof parsed === 'object') {
        // Format platform info nicely
        const parts = []
        if (parsed.name) parts.push(parsed.name)
        if (parsed.symbol) parts.push(`(${parsed.symbol})`)
        if (parsed.token_address) {
          const shortAddress =
            parsed.token_address.length > 20
              ? `${parsed.token_address.substring(0, 10)}...${parsed.token_address.substring(parsed.token_address.length - 8)}`
              : parsed.token_address
          parts.push(`Address: ${shortAddress}`)
        }

        return parts.length > 0 ? parts.join(' ') : 'N/A'
      }

      return platformData
    } catch (error) {
      console.warn('Failed to parse platform data:', error)
      return platformData
    }
  }

  // Get basic crypto info
  const getBasicInfo = () => {
    return {
      symbol: actualCryptoData.symbol || 'N/A',
      name: actualCryptoData.name || 'N/A',
      category: actualCryptoData.category || 'Cryptocurrency',
      platform: actualCryptoData.platform || 'N/A',
      dateAdded: actualCryptoData.date_added || 'N/A',
      cmcRank: actualCryptoData.rank || actualCryptoData.cmc_rank || 'N/A',
      website: actualCryptoData.website_url || 'N/A',
    }
  }

  // Get market info
  const getMarketInfo = () => {
    return {
      marketCap: actualCryptoData.market_cap
        ? `$${(actualCryptoData.market_cap / 1e9).toFixed(1)}B`
        : 'N/A',
      currentPrice: actualCryptoData.price
        ? `$${actualCryptoData.price.toFixed(2)}`
        : 'N/A',
      volume24h: actualCryptoData.volume_24h
        ? `$${(actualCryptoData.volume_24h / 1e9).toFixed(1)}B`
        : 'N/A',
      percentChange1h: actualCryptoData.percent_change_1h
        ? `${actualCryptoData.percent_change_1h.toFixed(2)}%`
        : 'N/A',
      percentChange24h: actualCryptoData.price_change_percent_24h || actualCryptoData.percent_change_24h
        ? `${(actualCryptoData.price_change_percent_24h || actualCryptoData.percent_change_24h).toFixed(2)}%`
        : 'N/A',
      percentChange7d: actualCryptoData.percent_change_7d
        ? `${actualCryptoData.percent_change_7d.toFixed(2)}%`
        : 'N/A',
      slug: actualCryptoData.slug || actualCryptoData.symbol || 'N/A',
    }
  }

  // Get supply info
  const getSupplyInfo = () => {
    const circulatingSupply = actualCryptoData.circulating_supply
    const totalSupply = actualCryptoData.total_supply
    const maxSupply = actualCryptoData.max_supply

    // Calculate supply utilization
    let supplyUtilization = 0
    if (circulatingSupply && maxSupply && maxSupply > 0) {
      supplyUtilization = (circulatingSupply / maxSupply) * 100
    }

    return {
      circulatingSupply: circulatingSupply ? formatValue(circulatingSupply, 'number') : 'N/A',
      totalSupply: totalSupply ? formatValue(totalSupply, 'number') : 'N/A',
      maxSupply: maxSupply ? formatValue(maxSupply, 'number') : 'N/A',
      supplyUtilization: `${supplyUtilization.toFixed(1)}%`,
      supplyUtilizationValue: supplyUtilization,
    }
  }

  const description = getCryptoDescription()
  const hierarchyInfo = getHierarchyInfo()
  const basicInfo = getBasicInfo()
  const marketInfo = getMarketInfo()
  const supplyInfo = getSupplyInfo()

  // Description truncation function
  const getTruncatedDescription = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // Info row component
  const InfoRow = ({ label, value, isLink = false }) => (
    <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
      <span className="text-body-secondary">{label}</span>
      <span className="fw-semibold">
        {isLink && value !== 'N/A' ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </span>
    </div>
  )

  return (
    <div className="tab-pane active">
      {/* Crypto Name and Asset Info */}
      <div className="mb-4">
        <h4 className="mb-2">
          {basicInfo.website !== 'N/A' ? (
            <a
              href={basicInfo.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-decoration-none"
            >
              {asset?.name || basicInfo.name}
            </a>
          ) : (
            asset?.name || basicInfo.name
          )}
        </h4>

        {/* Scrolling Asset Info Component */}
        <div className="p-2 rounded">
          <div className="d-flex align-items-center text-muted small">
            {hierarchyInfo.map((item, index) => (
              <React.Fragment key={index}>
                <span className="badge bg-info me-2">{item}</span>
                {index < hierarchyInfo.length - 1 && <span className="me-2">/</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Description with Toggle */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="fw-semibold mb-0">Description</h6>
          {description.length > 100 && (
            <CButton
              type="button"
              color="transparent"
              size="sm"
              className="btn-tool"
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              title={isDescriptionExpanded ? 'Collapse' : 'Expand'}
            >
              <CIcon icon={isDescriptionExpanded ? cilMinus : cilPlus} />
            </CButton>
          )}
        </div>
        <div className="card-text text-body-secondary">
          {isDescriptionExpanded ? description : getTruncatedDescription(description)}
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="row g-4">
        {/* Basic Info Column */}
        <div className="col-md-4">
          <CCard className="h-100">
            <CCardHeader>
              <h6 className="fw-semibold mb-0">Basic Information</h6>
            </CCardHeader>
            <CCardBody>
              <InfoRow label="Symbol" value={basicInfo.symbol} />
              <InfoRow label="Category" value={basicInfo.category} />
              <InfoRow label="Platform" value={basicInfo.platform} />
              <InfoRow label="Date Added" value={basicInfo.dateAdded} />
              <InfoRow label="CMC Rank" value={basicInfo.cmcRank} />
              <InfoRow label="Website" value={basicInfo.website} isLink={true} />
            </CCardBody>
          </CCard>
        </div>

        {/* Market Info Column */}
        <div className="col-md-4">
          <CCard className="h-100">
            <CCardHeader>
              <h6 className="fw-semibold mb-0">Market Data</h6>
            </CCardHeader>
            <CCardBody>
              <InfoRow label="Market Cap" value={marketInfo.marketCap} />
              <InfoRow label="Current Price" value={marketInfo.currentPrice} />
              <InfoRow label="24h Volume" value={marketInfo.volume24h} />
              <InfoRow label="24h Change" value={marketInfo.percentChange24h} />
              <InfoRow label="7d Change" value={marketInfo.percentChange7d} />
              <InfoRow label="Slug" value={marketInfo.slug} />
            </CCardBody>
          </CCard>
        </div>

        {/* Supply Info Column */}
        <div className="col-md-4">
          <CCard className="h-100">
            <CCardHeader>
              <h6 className="fw-semibold mb-0">Supply Information</h6>
            </CCardHeader>
            <CCardBody>
              <InfoRow label="Circulating" value={supplyInfo.circulatingSupply} />
              <InfoRow label="Total Supply" value={supplyInfo.totalSupply} />
              <InfoRow label="Max Supply" value={supplyInfo.maxSupply} />
              <InfoRow label="Utilization" value={supplyInfo.supplyUtilization} />
              <div className="mt-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <small className="text-muted">Supply Progress</small>
                  <small className="text-muted">{supplyInfo.supplyUtilization}</small>
                </div>
                <CProgress value={supplyInfo.supplyUtilizationValue} color="success" />
              </div>
            </CCardBody>
          </CCard>
        </div>
      </div>
    </div>
  )
}

export default CryptoInfoTab
