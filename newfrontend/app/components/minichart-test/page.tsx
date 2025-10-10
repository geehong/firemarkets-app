export const metadata = {
  title: "Mini Chart Test | FireMarkets",
}

import MiniPriceChart from "@/components/charts/minicharts/MiniPriceChart"
import MiniPriceCryptoChart from "@/components/charts/minicharts/MiniPriceCryptoChart"
import MiniPriceCommoditiesChart from "@/components/charts/minicharts/MiniPriceCommoditiesChart"
import MiniPriceStocksEtfChart from "@/components/charts/minicharts/MiniPriceStocksEtfChart"

export default function MiniChartTestPage() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <h1 className="text-3xl font-bold text-center mb-8">MiniPriceChart Test</h1>
      
      {/* 암호화폐 차트 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-green-600">🪙 암호화폐 (Crypto)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Bitcoin 
              <span className="text-xs">🟢</span>
            </h3>
            <MiniPriceCryptoChart 
              containerId="btc-chart"
              assetIdentifier="BTCUSDT" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Ethereum 
              <span className="text-xs">🟢</span>
            </h3>
            <MiniPriceCryptoChart 
              containerId="eth-chart"
              assetIdentifier="ETHUSDT" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              XRP 
              <span className="text-xs">🟢</span>
            </h3>
            <MiniPriceCryptoChart 
              containerId="xrp-chart"
              assetIdentifier="XRPUSDT" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              BNB 
              <span className="text-xs">🟢</span>
            </h3>
            <MiniPriceCryptoChart 
              containerId="bnb-chart"
              assetIdentifier="BNB" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Solana 
              <span className="text-xs">🟢</span>
            </h3>
            <MiniPriceCryptoChart 
              containerId="sol-chart"
              assetIdentifier="SOL" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Dogecoin 
              <span className="text-xs">🟢</span>
            </h3>
            <MiniPriceCryptoChart 
              containerId="doge-chart"
              assetIdentifier="DOGE" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              TRON 
              <span className="text-xs">🟢</span>
            </h3>
            <MiniPriceCryptoChart 
              containerId="trx-chart"
              assetIdentifier="TRX" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Cardano 
              <span className="text-xs">🟢</span>
            </h3>
            <MiniPriceCryptoChart 
              containerId="ada-chart"
              assetIdentifier="ADA" 
            />
          </div>
        </div>
      </div>

      {/* 주식/ETF 차트 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-blue-600">📈 주식/ETF (Stocks & ETF)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Apple Inc. 
              <span className="text-xs">
                {(() => {
                  // 미국시장 개장시간 체크 (한국시간 기준)
                  const now = new Date();
                  const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
                  const hour = koreanTime.getHours();
                  const minute = koreanTime.getMinutes();
                  const currentTime = hour * 60 + minute;
                  const marketOpenStart = 23 * 60 + 30; // 23:30
                  const marketOpenEnd = 6 * 60; // 06:00
                  const isMarketOpen = currentTime >= marketOpenStart || currentTime <= marketOpenEnd;
                  
                  return isMarketOpen ? '🟢' : '🔴';
                })()}
              </span>
            </h3>
            <MiniPriceStocksEtfChart 
              containerId="aapl-chart"
              assetIdentifier="AAPL" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Microsoft 
              <span className="text-xs">
                {(() => {
                  const now = new Date();
                  const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
                  const hour = koreanTime.getHours();
                  const minute = koreanTime.getMinutes();
                  const currentTime = hour * 60 + minute;
                  const marketOpenStart = 23 * 60 + 30;
                  const marketOpenEnd = 6 * 60;
                  const isMarketOpen = currentTime >= marketOpenStart || currentTime <= marketOpenEnd;
                  
                  return isMarketOpen ? '🟢' : '🔴';
                })()}
              </span>
            </h3>
            <MiniPriceStocksEtfChart 
              containerId="msft-chart"
              assetIdentifier="MSFT" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              NVIDIA 
              <span className="text-xs">
                {(() => {
                  const now = new Date();
                  const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
                  const hour = koreanTime.getHours();
                  const minute = koreanTime.getMinutes();
                  const currentTime = hour * 60 + minute;
                  const marketOpenStart = 23 * 60 + 30;
                  const marketOpenEnd = 6 * 60;
                  const isMarketOpen = currentTime >= marketOpenStart || currentTime <= marketOpenEnd;
                  
                  return isMarketOpen ? '🟢' : '🔴';
                })()}
              </span>
            </h3>
            <MiniPriceStocksEtfChart 
              containerId="nvda-chart"
              assetIdentifier="NVDA" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Google 
              <span className="text-xs">
                {(() => {
                  const now = new Date();
                  const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
                  const hour = koreanTime.getHours();
                  const minute = koreanTime.getMinutes();
                  const currentTime = hour * 60 + minute;
                  const marketOpenStart = 23 * 60 + 30;
                  const marketOpenEnd = 6 * 60;
                  const isMarketOpen = currentTime >= marketOpenStart || currentTime <= marketOpenEnd;
                  
                  return isMarketOpen ? '🟢' : '🔴';
                })()}
              </span>
            </h3>
            <MiniPriceStocksEtfChart 
              containerId="goog-chart"
              assetIdentifier="GOOG" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Amazon 
              <span className="text-xs">
                {(() => {
                  const now = new Date();
                  const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
                  const hour = koreanTime.getHours();
                  const minute = koreanTime.getMinutes();
                  const currentTime = hour * 60 + minute;
                  const marketOpenStart = 23 * 60 + 30;
                  const marketOpenEnd = 6 * 60;
                  const isMarketOpen = currentTime >= marketOpenStart || currentTime <= marketOpenEnd;
                  
                  return isMarketOpen ? '🟢' : '🔴';
                })()}
              </span>
            </h3>
            <MiniPriceStocksEtfChart 
              containerId="amzn-chart"
              assetIdentifier="AMZN" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Meta 
              <span className="text-xs">
                {(() => {
                  const now = new Date();
                  const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
                  const hour = koreanTime.getHours();
                  const minute = koreanTime.getMinutes();
                  const currentTime = hour * 60 + minute;
                  const marketOpenStart = 23 * 60 + 30;
                  const marketOpenEnd = 6 * 60;
                  const isMarketOpen = currentTime >= marketOpenStart || currentTime <= marketOpenEnd;
                  
                  return isMarketOpen ? '🟢' : '🔴';
                })()}
              </span>
            </h3>
            <MiniPriceStocksEtfChart 
              containerId="meta-chart"
              assetIdentifier="META" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Netflix 
              <span className="text-xs">
                {(() => {
                  const now = new Date();
                  const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
                  const hour = koreanTime.getHours();
                  const minute = koreanTime.getMinutes();
                  const currentTime = hour * 60 + minute;
                  const marketOpenStart = 23 * 60 + 30;
                  const marketOpenEnd = 6 * 60;
                  const isMarketOpen = currentTime >= marketOpenStart || currentTime <= marketOpenEnd;
                  
                  return isMarketOpen ? '🟢' : '🔴';
                })()}
              </span>
            </h3>
            <MiniPriceStocksEtfChart 
              containerId="nflx-chart"
              assetIdentifier="NFLX" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Broadcom 
              <span className="text-xs">
                {(() => {
                  const now = new Date();
                  const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
                  const hour = koreanTime.getHours();
                  const minute = koreanTime.getMinutes();
                  const currentTime = hour * 60 + minute;
                  const marketOpenStart = 23 * 60 + 30;
                  const marketOpenEnd = 6 * 60;
                  const isMarketOpen = currentTime >= marketOpenStart || currentTime <= marketOpenEnd;
                  
                  return isMarketOpen ? '🟢' : '🔴';
                })()}
              </span>
            </h3>
            <MiniPriceStocksEtfChart 
              containerId="avgo-chart"
              assetIdentifier="AVGO" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              SPDR S&P 500 
              <span className="text-xs">
                {(() => {
                  const now = new Date();
                  const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
                  const hour = koreanTime.getHours();
                  const minute = koreanTime.getMinutes();
                  const currentTime = hour * 60 + minute;
                  const marketOpenStart = 23 * 60 + 30;
                  const marketOpenEnd = 6 * 60;
                  const isMarketOpen = currentTime >= marketOpenStart || currentTime <= marketOpenEnd;
                  
                  return isMarketOpen ? '🟢' : '🔴';
                })()}
              </span>
            </h3>
            <MiniPriceStocksEtfChart 
              containerId="spy-chart"
              assetIdentifier="SPY" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Invesco QQQ 
              <span className="text-xs">
                {(() => {
                  const now = new Date();
                  const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
                  const hour = koreanTime.getHours();
                  const minute = koreanTime.getMinutes();
                  const currentTime = hour * 60 + minute;
                  const marketOpenStart = 23 * 60 + 30;
                  const marketOpenEnd = 6 * 60;
                  const isMarketOpen = currentTime >= marketOpenStart || currentTime <= marketOpenEnd;
                  
                  return isMarketOpen ? '🟢' : '🔴';
                })()}
              </span>
            </h3>
            <MiniPriceStocksEtfChart 
              containerId="qqq-chart"
              assetIdentifier="QQQ" 
            />
          </div>
        </div>
      </div>

      {/* 상품 차트 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-yellow-600">🥇 상품 (Commodities)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Gold 
              <span className="text-xs">🟢</span>
            </h3>
            <MiniPriceCommoditiesChart 
              containerId="gold-chart"
              assetIdentifier="GCUSD" 
            />
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              Silver 
              <span className="text-xs">🟢</span>
            </h3>
            <MiniPriceCommoditiesChart 
              containerId="silver-chart"
              assetIdentifier="SIUSD" 
            />
          </div>
        </div>
      </div>

      {/* 기본 차트 (비교용) */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-400">🔧 기본 차트 (Base Chart)</h2>
        <div className="bg-gray-900 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            Bitcoin (기본 설정) 
            <span className="text-xs">🟢</span>
          </h3>
          <MiniPriceChart 
            containerId="base-btc-chart"
            assetIdentifier="BTCUSDT" 
            useWebSocket={true}
          />
        </div>
      </div>
    </div>
  )
}