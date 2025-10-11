import ClientOnlyOHLCVChart from "@/components/charts/ohlcvcharts/ClientOnlyOHLCVChart"

export default function OHLCVChartPage() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">OHLCV Chart Test</h1>
        <p className="text-gray-600">BTCUSDT 캔들스틱 차트 테스트</p>
      </div>
      
      <div className="space-y-6">
        {/* 기본 OHLCV 차트 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📊 BTCUSDT OHLCV Chart</h2>
          <ClientOnlyOHLCVChart 
            assetIdentifier="BTCUSDT"
            dataInterval="1d"
            height={600}
            showVolume={true}
            showRangeSelector={true}
            showStockTools={true}
            showExporting={true}
            title="Bitcoin USD Tether (BTCUSDT)"
            subtitle="Daily OHLCV Data"
          />
        </div>

        {/* 다양한 옵션 테스트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">볼륨 없는 차트</h3>
            <ClientOnlyOHLCVChart 
              assetIdentifier="BTCUSDT"
              dataInterval="1d"
              height={400}
              showVolume={false}
              showRangeSelector={false}
              showStockTools={false}
              showExporting={false}
              title="BTCUSDT (Volume Hidden)"
            />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">스톡 툴 없는 차트</h3>
            <ClientOnlyOHLCVChart 
              assetIdentifier="BTCUSDT"
              dataInterval="1d"
              height={400}
              showVolume={true}
              showRangeSelector={false}
              showStockTools={false}
              showExporting={false}
              title="BTCUSDT (No Tools)"
            />
          </div>
        </div>

        {/* Intraday OHLCV 차트 (ohlcv_intraday_data 테이블 사용) */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-3">Intraday OHLCV Charts (ohlcv_intraday_data)</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-gray-600 mb-2">BTCUSDT - 1H Interval</h4>
              <ClientOnlyOHLCVChart 
                assetIdentifier="BTCUSDT"
                dataInterval="1h"
                height={300}
                showVolume={true}
                showRangeSelector={false}
                showStockTools={false}
                showExporting={false}
                title="BTCUSDT 1H (Intraday)"
                useIntradayApi={true}
              />
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-600 mb-2">BTCUSDT - 4H Interval</h4>
              <ClientOnlyOHLCVChart 
                assetIdentifier="BTCUSDT"
                dataInterval="4h"
                height={300}
                showVolume={true}
                showRangeSelector={false}
                showStockTools={false}
                showExporting={false}
                title="BTCUSDT 4H (Intraday)"
                useIntradayApi={true}
              />
            </div>
          </div>
        </div>

        {/* 다양한 자산 테스트 */}
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-3">다른 자산 테스트</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-gray-600 mb-2">ETHUSDT</h4>
              <ClientOnlyOHLCVChart 
                assetIdentifier="ETHUSDT"
                dataInterval="1d"
                height={300}
                showVolume={true}
                showRangeSelector={false}
                showStockTools={false}
                showExporting={false}
                title="ETHUSDT Daily"
              />
            </div>
            <div>
              <h4 className="text-md font-medium text-gray-600 mb-2">AAPL</h4>
              <ClientOnlyOHLCVChart 
                assetIdentifier="AAPL"
                dataInterval="1d"
                height={300}
                showVolume={true}
                showRangeSelector={false}
                showStockTools={false}
                showExporting={false}
                title="AAPL Daily"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
