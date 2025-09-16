import React from 'react'
import { useMediaQuery } from 'react-responsive'
import OverViewHeader from './OverViewHeader'
import OverViewHeaderMobile from './OverViewHeaderMobile'
import OverViewTabs from './OverViewTabs'
import OverViewTabsMobile from './OverViewTabsMobile'
import OHLCVChart from '../charts/OHLCVChart'
import OHLCVmChart from '../charts/OHLCVmChart'

const ResponsiveOverView = ({
  assetId,
  asset,
  ohlcvData,
  stockProfile,
  stockFinancials,
  stockEstimates,
  etfInfo,
  etfHoldings,
  etfSectorExposure,
  cryptoMetrics,
  cryptoData,
}) => {
  const isMobile = useMediaQuery({ maxWidth: 768 })

  const commonProps = {
    assetId,
    asset,
    ohlcvData,
    stockProfile,
    stockFinancials,
    stockEstimates,
    etfInfo,
    etfHoldings,
    etfSectorExposure,
    cryptoMetrics,
    cryptoData,
  }

  return (
    <>
      {/* 헤더 영역 */}
      {isMobile ? (
        <OverViewHeaderMobile {...commonProps} />
      ) : (
        <OverViewHeader {...commonProps} />
      )}

      {/* 차트 영역 */}
      {isMobile ? (
        <OHLCVmChart
          assetIdentifier={asset?.ticker}
          dataInterval="1d"
          height={350}
          showVolume={true}
          showRangeSelector={true}
          showStockTools={false}
          showExporting={false}
          title={`${asset?.name} (${asset?.ticker}) Price Chart`}
          subtitle="OHLCV Data"
          externalOhlcvData={ohlcvData}
        />
      ) : (
        <OHLCVChart
          assetIdentifier={asset?.ticker}
          dataInterval="1d"
          height={600}
          showVolume={true}
          showRangeSelector={true}
          showStockTools={true}
          showExporting={true}
          title={`${asset?.name} (${asset?.ticker}) Price Chart`}
          subtitle="OHLCV Data"
          externalOhlcvData={ohlcvData}
        />
      )}

      {/* 탭 영역 */}
      {isMobile ? (
        <OverViewTabsMobile {...commonProps} />
      ) : (
        <OverViewTabs {...commonProps} />
      )}
    </>
  )
}

export default ResponsiveOverView
