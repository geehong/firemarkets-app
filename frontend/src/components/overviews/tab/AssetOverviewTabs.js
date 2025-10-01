import React, { useState } from 'react'
import { CButton, CButtonGroup } from '@coreui/react'
import { useAPI } from '../../../hooks/useAPI'
import ProfileTab from './ProfileTab'
import MarketDataTab from './MarketDataTab'
import FinancialsTab from './FinancialsTab'
import EstimatesTab from './EstimatesTab'
import HistoryTableAgGrid from '../../tables/HistoryTable'

/**
 * 자산 개요 탭 컴포넌트 (데스크톱/모바일 통합)
 * 자산 타입에 따라 동적으로 탭을 구성하고 렌더링
 */
const AssetOverviewTabs = ({ assetId, asset, ohlcvData, cryptoData }) => {
  const [activeKey, setActiveKey] = useState(1)

  // 자산 타입별 탭 구성
  const getTabsConfig = () => {
    switch (asset?.type_name) {
      case 'Stocks':
        return [
          { key: 1, label: 'Profile', component: 'ProfileTab' },
          { key: 2, label: 'Financials', component: 'FinancialsTab' },
          { key: 3, label: 'Estimates', component: 'EstimatesTab' },
          { key: 4, label: 'Market Data', component: 'MarketDataTab' },
          { key: 5, label: 'History Data', component: 'HistoryTableAgGrid' },
        ]
      
      case 'ETFs':
        return [
          { key: 1, label: 'Profile', component: 'ProfileTab' },
          { key: 2, label: 'Market Data', component: 'MarketDataTab' },
          { key: 3, label: 'History Data', component: 'HistoryTableAgGrid' },
        ]
      
      case 'Crypto':
        return [
          { key: 1, label: 'Profile', component: 'ProfileTab' },
          { key: 2, label: 'Market Data', component: 'MarketDataTab' },
          { key: 3, label: 'History Data', component: 'HistoryTableAgGrid' },
        ]
      
      case 'Commodities':
        return [
          { key: 1, label: 'Profile', component: 'ProfileTab' },
          { key: 2, label: 'Market Data', component: 'MarketDataTab' },
          { key: 3, label: 'History Data', component: 'HistoryTableAgGrid' },
        ]
      
      default:
        return [
          { key: 1, label: 'Profile', component: 'ProfileTab' },
          { key: 2, label: 'Market Data', component: 'MarketDataTab' },
          { key: 3, label: 'History Data', component: 'HistoryTableAgGrid' },
        ]
    }
  }

  // 탭 컴포넌트 렌더링
  const renderTabContent = (componentName) => {
    const commonProps = {
      asset,
      ohlcvData,
      cryptoData,
      assetId
    }

    switch (componentName) {
      case 'ProfileTab':
        return <ProfileTab {...commonProps} />
      
      case 'FinancialsTab':
        return <FinancialsTab {...commonProps} />
      
      case 'EstimatesTab':
        return <EstimatesTab {...commonProps} />
      
      case 'MarketDataTab':
        return (
          <MarketDataTab
            assetId={assetId}
            assetType={asset?.type_name?.toLowerCase()}
            stockFinancials={cryptoData} // 임시로 cryptoData 사용
            cryptoData={cryptoData}
            etfData={cryptoData} // 임시로 cryptoData 사용
            commodityData={null}
            ohlcvData={ohlcvData}
          />
        )
      
      case 'HistoryTableAgGrid':
        return <HistoryTableAgGrid 
          data={ohlcvData || []} 
          dataType="ohlcv"
          height={500}
          loading={!ohlcvData}
          loadingMessage="Loading historical data..."
        />
      
      default:
        return <div>Tab content not found</div>
    }
  }

  const tabsConfig = getTabsConfig()

  // 반응형 탭 스타일
  const getTabButtonStyle = () => ({
    transition: 'all 0.3s ease',
    fontSize: '0.875rem',
    padding: '0.5rem 1rem',
    minWidth: 'auto'
  })

  return (
    <div className="card mb-4">
      <div className="card-header">
        {/* 데스크톱 탭 */}
        <div className="d-none d-md-block">
          <CButtonGroup role="group" aria-label="Tab Navigation">
            {tabsConfig.map((tab) => (
              <CButton
                key={tab.key}
                color={activeKey === tab.key ? 'primary' : 'outline'}
                variant={activeKey === tab.key ? 'outline' : 'ghost'}
                onClick={() => setActiveKey(tab.key)}
                style={getTabButtonStyle()}
                className="hover-effect"
              >
                {tab.label}
              </CButton>
            ))}
          </CButtonGroup>
        </div>

        {/* 모바일 탭 (스크롤 가능) */}
        <div className="d-md-none">
          <div className="d-flex overflow-auto" style={{ gap: '0.5rem' }}>
            {tabsConfig.map((tab) => (
              <CButton
                key={tab.key}
                color={activeKey === tab.key ? 'primary' : 'outline'}
                variant={activeKey === tab.key ? 'outline' : 'ghost'}
                onClick={() => setActiveKey(tab.key)}
                style={{
                  ...getTabButtonStyle(),
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
                className="hover-effect"
              >
                {tab.label}
              </CButton>
            ))}
          </div>
        </div>

        <style>{`
          .hover-effect:hover {
            color: #0d6efd !important;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          
          /* 모바일 탭 스크롤 스타일 */
          .d-flex.overflow-auto::-webkit-scrollbar {
            height: 4px;
          }
          
          .d-flex.overflow-auto::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 2px;
          }
          
          .d-flex.overflow-auto::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 2px;
          }
          
          .d-flex.overflow-auto::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
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

export default AssetOverviewTabs