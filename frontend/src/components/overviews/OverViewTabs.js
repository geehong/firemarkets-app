import React, { useState } from 'react'
import { CButton, CButtonGroup } from '@coreui/react'
import ProfileTab from './ProfileTab'
import FinancialsTab from './FinancialsTab'
import EstimatesTab from './EstimatesTab'
import OHLCVTable from '../tables/OHLCVTable'
import ETFInfoTab from './ETFInfoTab'
import MarketDataTab from './MarketDataTab'
import CryptoInfoTab from './CryptoInfoTab'
// import OnchainMetricsTab from './OnchainMetricsTab'
// import TechnicalIndicatorsTab from './TechnicalIndicatorsTab'

const OverViewTabs = ({
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
  console.log('🔍 OverViewTabs received assetId:', assetId)
  console.log('🔍 OverViewTabs received asset:', asset)
  console.log('🔍 Asset ID:', asset?.id)
  console.log('🔍 Asset structure:', JSON.stringify(asset, null, 2))

  const [activeKey, setActiveKey] = useState(1)

  // 자산 타입별 탭 구성
  const getTabsConfig = () => {
    switch (asset?.type_name) {
      case 'Stocks':
        return [
          { key: 1, label: 'Profile', component: 'ProfileTab' },
          { key: 2, label: 'Financials', component: 'FinancialsTab' },
          { key: 3, label: 'Estimates', component: 'EstimatesTab' },
          { key: 4, label: 'History Data', component: 'OHLCVTable' },
        ]
      case 'ETFs':
        return [
          { key: 1, label: 'ETF Info', component: 'ETFInfoTab' },
          { key: 2, label: 'Market Data', component: 'MarketDataTab' },
          { key: 3, label: 'History Data', component: 'OHLCVTable' },
        ]
      case 'Commodities':
        return [
          { key: 1, label: 'Market Data', component: 'MarketDataTab' },
          { key: 2, label: 'History Data', component: 'OHLCVTable' },
        ]
      case 'Crypto':
        return [
          { key: 1, label: 'Crypto Info', component: 'CryptoInfoTab' },
          { key: 2, label: 'Market Data', component: 'MarketDataTab' },
          { key: 3, label: 'Onchain Metrics', component: 'OnchainMetricsTab' },
          { key: 4, label: 'Technical Indicators', component: 'TechnicalIndicatorsTab' },
          { key: 5, label: 'History Data', component: 'OHLCVTable' },
        ]
      default:
        return [
          { key: 1, label: 'Profile', component: 'ProfileTab' },
          { key: 2, label: 'Market Data', component: 'MarketDataTab' },
          { key: 3, label: 'History Data', component: 'OHLCVTable' },
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
        console.log('🔍 Rendering MarketDataTab with etfInfo:', etfInfo)
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
      case 'OnchainMetricsTab':
        return <div>OnchainMetricsTab (추후 구현)</div>
      case 'TechnicalIndicatorsTab':
        return <div>TechnicalIndicatorsTab (추후 구현)</div>
      case 'OHLCVTable':
        return <OHLCVTable assetId={assetId} height={500} />
      default:
        return <div>Tab content not found</div>
    }
  }

  const tabsConfig = getTabsConfig()

  // 버튼 호버 스타일
  const buttonStyle = { transition: 'all 0.3s ease' }

  return (
    <div className="card mb-4">
      <div className="card-header">
        <CButtonGroup role="group" aria-label="Tab Navigation">
          {tabsConfig.map((tab) => (
            <CButton
              key={tab.key}
              color={activeKey === tab.key ? 'primary' : 'outline'}
              variant={activeKey === tab.key ? 'outline' : 'ghost'}
              onClick={() => setActiveKey(tab.key)}
              style={buttonStyle}
              className="hover-effect"
            >
              {tab.label}
            </CButton>
          ))}
        </CButtonGroup>
        <style>{`
          .hover-effect:hover {
            color: #0d6efd !important;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
        `}</style>
      </div>
      <div className="card-body">
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

export default OverViewTabs
