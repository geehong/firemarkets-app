import React, { useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMinus, cilPlus } from '@coreui/icons'

/**
 * 자산 프로필 탭 컴포넌트 (주식/ETF/Crypto 공통)
 * 모든 자산 유형에 대한 통합 프로필 정보 표시
 */
const ProfileTab = ({ asset, ohlcvData, cryptoData }) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  // 자산 타입별 설명 가져오기
  const getAssetDescription = () => {
    switch (asset?.type_name) {
      case 'Stocks':
        return cryptoData?.description || 'Detailed company information will be displayed here.'
      case 'ETFs':
        return cryptoData?.description || 'Detailed ETF product description will be displayed here.'
      case 'Crypto':
        return cryptoData?.description || 'Detailed cryptocurrency information will be displayed here.'
      case 'Commodities':
        return cryptoData?.description || 'Detailed commodity information will be displayed here.'
      default:
        return 'Detailed asset information will be displayed here.'
    }
  }

  // 자산 타입별 비즈니스 정보
  const getBusinessInfo = () => {
    switch (asset?.type_name) {
      case 'Stocks':
        return {
          ceo: cryptoData?.ceo || 'N/A',
          employees: cryptoData?.employees_count || 'N/A',
          ipoDate: cryptoData?.ipo_date || 'N/A',
          country: cryptoData?.country || 'N/A',
          city: cryptoData?.city || 'N/A',
          address: cryptoData?.address || 'N/A',
          phone: cryptoData?.phone || 'N/A',
          website: cryptoData?.website || 'N/A',
        }
      
      case 'ETFs':
        return {
          ceo: 'N/A',
          employees: 'N/A',
          ipoDate: cryptoData?.inception_date || 'N/A',
          country: cryptoData?.country || 'N/A',
          city: cryptoData?.city || 'N/A',
          address: cryptoData?.address || 'N/A',
          phone: cryptoData?.phone || 'N/A',
          website: cryptoData?.website || 'N/A',
        }
      
      case 'Crypto':
        return {
          ceo: 'N/A',
          employees: 'N/A',
          ipoDate: cryptoData?.launch_date || 'N/A',
          country: cryptoData?.country || 'N/A',
          city: 'N/A',
          address: 'N/A',
          phone: 'N/A',
          website: cryptoData?.website || 'N/A',
        }
      
      default:
        return {
          ceo: 'N/A',
          employees: 'N/A',
          ipoDate: 'N/A',
          country: 'N/A',
          city: 'N/A',
          address: 'N/A',
          phone: 'N/A',
          website: 'N/A',
        }
    }
  }

  const businessInfo = getBusinessInfo()
  const description = getAssetDescription()

  // 설명 텍스트를 1줄로 제한하는 함수
  const getTruncatedDescription = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

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
      {/* Company Name and Asset Info */}
      <div className="mb-4">
        <h4 className="mb-2">
          {businessInfo.website !== 'N/A' ? (
            <a
              href={businessInfo.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-decoration-none"
            >
              {asset?.name || 'Company Name'}
            </a>
          ) : (
            asset?.name || 'Company Name'
          )}
        </h4>

        {/* Scrolling Asset Info Component */}
        <div className="p-2 rounded">
          <div className="d-flex align-items-center text-muted small overflow-auto">
            <div className="d-flex align-items-center flex-nowrap" style={{ minWidth: 'max-content' }}>
              <span className="badge bg-info me-2">{asset?.type_name || 'Stocks'}</span>
              <span className="me-2">/</span>
              <span className="badge bg-info me-2">{asset?.exchange || 'NASDAQ'}</span>
              <span className="me-2">/</span>
              <span className="badge bg-info me-2">{asset?.ticker || 'MSFT'}</span>
              <span className="me-2">/</span>
              <span className="badge bg-info me-2">{cryptoData?.sector || 'Technology'}</span>
              <span className="me-2">/</span>
              <span className="badge bg-info me-2">{asset?.currency || 'USD'}</span>
            </div>
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

      {/* Company Information */}
      <div className="row g-2 g-sm-3 g-md-4">
        <div className="col-12 col-sm-6 col-md-4">
          <CCard className="h-100">
            <CCardHeader>
              <h6 className="fw-semibold mb-0">Company</h6>
            </CCardHeader>
            <CCardBody>
              <InfoRow label="CEO" value={businessInfo.ceo} />
              <InfoRow label="Count" value={businessInfo.employees} />
              <InfoRow label="IPO" value={businessInfo.ipoDate} />
              <InfoRow label="Country" value={businessInfo.country} />
              <InfoRow label="City" value={businessInfo.city} />
              <InfoRow label="Address" value={businessInfo.address} />
              <InfoRow label="Phone" value={businessInfo.phone} />
            </CCardBody>
          </CCard>
        </div>
      </div>
    </div>
  )
}

export default ProfileTab