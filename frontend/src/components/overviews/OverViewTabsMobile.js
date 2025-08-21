import React, { useState } from 'react'
import { CButton, CDropdown, CDropdownToggle, CDropdownMenu, CDropdownItem } from '@coreui/react'
import ProfileTab from './ProfileTab'
import FinancialsTab from './FinancialsTab'
import EstimatesTab from './EstimatesTab'
import OHLCVTable from '../tables/OHLCVTable'
import ETFInfoTab from './ETFInfoTab'
import MarketDataTab from './MarketDataTab'
import CryptoInfoTab from './CryptoInfoTab'

const OverViewTabsMobile = ({
  assetId,
  asset,
  stockProfile,
  stockFinancials,
  stockEstimates,
  etfInfo,
  etfHoldings,
  etfSectorExposure,
  cryptoMetrics,
  cryptoData,
  ohlcvData,
}) => {
  const [activeKey, setActiveKey] = useState(1)

  // 자산 타입별 탭 구성 (모바일 최적화)
  const getTabsConfig = () => {
    switch (asset?.type_name) {
      case 'Stocks':
        return [
          { key: 1, label: 'Profile', component: 'ProfileTab' },
          { key: 2, label: 'Financials', component: 'FinancialsTab' },
          { key: 3, label: 'Estimates', component: 'EstimatesTab' },
          { key: 4, label: 'History', component: 'OHLCVTable' },
        ]
      case 'ETFs':
        return [
          { key: 1, label: 'ETF Info', component: 'ETFInfoTab' },
          { key: 2, label: 'Market Data', component: 'MarketDataTab' },
          { key: 3, label: 'History', component: 'OHLCVTable' },
        ]
      case 'Commodities':
        return [
          { key: 1, label: 'Market Data', component: 'MarketDataTab' },
          { key: 2, label: 'History', component: 'OHLCVTable' },
        ]
      case 'Crypto':
        return [
          { key: 1, label: 'Crypto Info', component: 'CryptoInfoTab' },
          { key: 2, label: 'Market Data', component: 'MarketDataTab' },
          { key: 3, label: 'History', component: 'OHLCVTable' },
        ]
      default:
        return [
          { key: 1, label: 'Profile', component: 'ProfileTab' },
          { key: 2, label: 'Market Data', component: 'MarketDataTab' },
          { key: 3, label: 'History', component: 'OHLCVTable' },
        ]
    }
  }

  // 탭 컴포넌트 렌더링
  const renderTabContent = (componentName) => {
    switch (componentName) {
      case 'ProfileTab':
        return (
          <ProfileTab
            asset={asset}
            stockProfile={stockProfile}
            stockFinancials={stockFinancials}
            etfInfo={etfInfo}
            cryptoMetrics={cryptoMetrics}
          />
        )
      case 'FinancialsTab':
        return <FinancialsTab asset={asset} stockFinancials={stockFinancials} />
      case 'EstimatesTab':
        return <EstimatesTab asset={asset} stockEstimates={stockEstimates} />
      case 'ETFInfoTab':
        return <ETFInfoTab etfData={etfInfo} />
      case 'CryptoInfoTab':
        return <CryptoInfoTab cryptoData={cryptoData?.data} asset={asset} />
      case 'MarketDataTab':
        return (
          <MarketDataTab
            assetId={assetId}
            assetType={asset?.type_name?.toLowerCase()}
            stockFinancials={stockFinancials}
            cryptoData={cryptoMetrics}
            etfData={etfInfo}
            commodityData={null}
            ohlcvData={ohlcvData}
          />
        )
      case 'OHLCVTable':
        return <OHLCVTable assetId={assetId} height={400} />
      default:
        return <div>Tab content not found</div>
    }
  }

  const tabsConfig = getTabsConfig()
  const activeTab = tabsConfig.find(tab => tab.key === activeKey)

  return (
    <div className="card mb-4">
      <div className="card-header p-3">
        {/* 모바일용 드롭다운 탭 선택기 */}
        <CDropdown className="w-100">
          <CDropdownToggle 
            color="primary" 
            className="w-100 d-flex justify-content-between align-items-center"
            style={{ fontSize: '16px', padding: '12px 16px' }}
          >
            <span>{activeTab?.label || 'Select Tab'}</span>
            <i className="fas fa-chevron-down ms-2"></i>
          </CDropdownToggle>
          <CDropdownMenu className="w-100">
            {tabsConfig.map((tab) => (
              <CDropdownItem
                key={tab.key}
                onClick={() => setActiveKey(tab.key)}
                className={activeKey === tab.key ? 'active' : ''}
                style={{ padding: '12px 16px', fontSize: '16px' }}
              >
                {tab.label}
              </CDropdownItem>
            ))}
          </CDropdownMenu>
        </CDropdown>
      </div>
      <div className="card-body p-3">
        <div className="tab-content">
          {tabsConfig.map((tab) => (
            <div
              key={tab.key}
              className={`tab-pane fade ${activeKey === tab.key ? 'show active' : ''}`}
              role="tabpanel"
            >
              {renderTabContent(tab.component)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default OverViewTabsMobile

