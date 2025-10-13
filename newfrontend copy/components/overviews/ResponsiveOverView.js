import React from 'react'
import { useMediaQuery } from 'react-responsive'
import AssetOverviewHeader from './AssetOverviewHeader'
import AssetOverviewTabs from './tab/AssetOverviewTabs'
import OHLCVChart from '../charts/OHLCVChart'
import OHLCVmChart from '../charts/OHLCVmChart'

const ResponsiveOverView = ({
  assetId,
  asset,
  ohlcvData,
  cryptoData,
}) => {
  const isMobile = useMediaQuery({ maxWidth: 768 })

  const commonProps = {
    assetId,
    asset,
    ohlcvData,
    cryptoData,
  }

  return (
    <>
      {/* 헤더 영역 */}
      <AssetOverviewHeader {...commonProps} />

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
      <AssetOverviewTabs {...commonProps} />
    </>
  )
}

export default ResponsiveOverView
