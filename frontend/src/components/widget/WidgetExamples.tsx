"use client";

import React from 'react';
import { 
  RealtimePriceWidget,
  RealtimeQuotesPriceWidget,
  PriceWidgetGrid, 
  MiniPriceWidget, 
  CryptoPriceCard, 
  CryptoMetricCard 
} from './index';

const WidgetExamples: React.FC = () => {
  // 예제 데이터 - 성능 최적화를 위해 샘플만 표시
  const cryptoTickers = ['BTCUSDT', 'ETHUSDT', 'USDTUSDT', 'XRPUSDT', 'BNBUSDT', 'SOLUSDT', 'TRXUSDT', 'DOGEUSDT', 'ADAUSDT', 'LINKUSDT'];

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Price Widget Examples</h1>

      {/* 크립토 카드 위젯 예제 */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Crypto Card Widgets</h2>
        <div className="space-y-6">
          {/* 가격 카드 예제 */}
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">Price Cards (전체)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <CryptoPriceCard
                symbol="BTC"
                name="Bitcoin"
                price={106487.54}
                change24h={-2.90}
                icon="₿"
                gradientFrom="from-orange-500"
                gradientTo="to-yellow-500"
                size="medium"
              />
              <CryptoPriceCard
                symbol="ETH"
                name="Ethereum"
                price={3616.91}
                change24h={5.23}
                icon="Ξ"
                gradientFrom="from-blue-500"
                gradientTo="to-indigo-500"
                size="medium"
              />
              <CryptoPriceCard
                symbol="USDT"
                name="Tether"
                price={1.00}
                change24h={-0.04}
                icon="💵"
                gradientFrom="from-green-400"
                gradientTo="to-green-600"
                size="medium"
              />
              <CryptoPriceCard
                symbol="XRP"
                name="XRP"
                price={2.21}
                change24h={2.05}
                icon="✕"
                gradientFrom="from-gray-700"
                gradientTo="to-gray-900"
                size="medium"
              />
              <CryptoPriceCard
                symbol="BNB"
                name="Binance Coin"
                price={941.98}
                change24h={2.39}
                icon="🔶"
                gradientFrom="from-yellow-400"
                gradientTo="to-yellow-600"
                size="medium"
              />
              <CryptoPriceCard
                symbol="SOL"
                name="Solana"
                price={154.11}
                change24h={0.39}
                icon="◎"
                gradientFrom="from-purple-500"
                gradientTo="to-pink-500"
                size="medium"
              />
              <CryptoPriceCard
                symbol="TRX"
                name="TRON"
                price={0.29}
                change24h={1.14}
                icon="⬢"
                gradientFrom="from-red-500"
                gradientTo="to-red-700"
                size="medium"
              />
              <CryptoPriceCard
                symbol="DOGE"
                name="Dogecoin"
                price={0.16}
                change24h={2.11}
                icon="Ð"
                gradientFrom="from-yellow-300"
                gradientTo="to-yellow-500"
                size="medium"
              />
              <CryptoPriceCard
                symbol="ADA"
                name="Cardano"
                price={0.53}
                change24h={2.54}
                icon="₳"
                gradientFrom="from-blue-400"
                gradientTo="to-blue-600"
                size="medium"
              />
              <CryptoPriceCard
                symbol="LINK"
                name="Chainlink"
                price={15.45}
                change24h={1.23}
                icon="⬡"
                gradientFrom="from-blue-600"
                gradientTo="to-blue-800"
                size="medium"
              />
            </div>
          </div>

          {/* 메트릭 카드 예제 */}
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">Metric Cards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CryptoMetricCard
                symbol="BTC"
                name="Bitcoin Dominance"
                metricValue="52.45%"
                metricLabel="시장 점유율"
                icon="👑"
                gradientFrom="from-orange-500"
                gradientTo="to-red-500"
                size="medium"
              />
              <CryptoMetricCard
                symbol="ETH"
                name="Ethereum Dominance"
                metricValue="18.32%"
                metricLabel="시장 점유율"
                icon="Ξ"
                gradientFrom="from-blue-500"
                gradientTo="to-purple-500"
                size="medium"
              />
              <CryptoMetricCard
                symbol="USDT"
                name="Tether Market Cap"
                metricValue="$120.5B"
                metricLabel="총 시가총액"
                icon="💵"
                gradientFrom="from-green-500"
                gradientTo="to-teal-500"
                size="medium"
              />
            </div>
          </div>

          {/* 다양한 크기 예제 */}
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">Different Sizes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CryptoPriceCard
                symbol="BTC"
                name="Bitcoin"
                price={106487.54}
                change24h={-2.90}
                icon="₿"
                gradientFrom="from-orange-500"
                gradientTo="to-yellow-500"
                size="small"
              />
              <CryptoPriceCard
                symbol="BTC"
                name="Bitcoin"
                price={106487.54}
                change24h={-2.90}
                icon="₿"
                gradientFrom="from-orange-500"
                gradientTo="to-yellow-500"
                size="medium"
              />
              <CryptoPriceCard
                symbol="BTC"
                name="Bitcoin"
                price={106487.54}
                change24h={-2.90}
                icon="₿"
                gradientFrom="from-orange-500"
                gradientTo="to-yellow-500"
                size="large"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 개별 위젯 예제 */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Individual Widgets (샘플)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <RealtimePriceWidget
            ticker="BTCUSDT"
            variant="crypto"
            size="medium"
            showVolume={true}
            showTimestamp={true}
          />
          <RealtimePriceWidget
            ticker="ETHUSDT"
            variant="crypto"
            size="medium"
            showVolume={true}
            showTimestamp={false}
          />
          <RealtimePriceWidget
            ticker="BNBUSDT"
            variant="crypto"
            size="medium"
            showVolume={true}
            showTimestamp={false}
          />
          <RealtimePriceWidget
            ticker="XRPUSDT"
            variant="crypto"
            size="medium"
            showVolume={true}
            showTimestamp={false}
          />
        </div>
      </section>

      {/* 그리드 위젯 예제 */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Grid Widgets (샘플)</h2>
        <div className="space-y-6">
          {/* 단일 그룹 그리드 */}
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">Single Group Grid</h3>
            <PriceWidgetGrid
              tickers={['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT']}
              variant="crypto"
              size="medium"
              columns={4}
            />
          </div>
        </div>
      </section>

      {/* 미니 위젯 예제 */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Mini Widgets (샘플)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT'].map((ticker) => (
            <MiniPriceWidget
              key={ticker}
              ticker={ticker}
              showChange={true}
              showStatus={true}
            />
          ))}
        </div>
      </section>

      {/* Realtime Quotes 위젯 예제 */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Realtime Quotes Widgets (샘플)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <RealtimeQuotesPriceWidget assetIdentifier="BTCUSDT" />
          <RealtimeQuotesPriceWidget assetIdentifier="ETHUSDT" />
          <RealtimeQuotesPriceWidget assetIdentifier="BNBUSDT" />
        </div>
      </section>

      {/* 사용법 안내 */}
      <section className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Usage Examples</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold text-gray-800">Crypto Price Card:</h3>
            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`<CryptoPriceCard
  symbol="BTC"
  name="Bitcoin"
  price={106487.54}
  change24h={-2.90}
  icon="₿"
  gradientFrom="from-orange-500"
  gradientTo="to-yellow-500"
  size="medium"
/>`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800">Crypto Metric Card:</h3>
            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`<CryptoMetricCard
  symbol="ETH"
  name="Ethereum Dominance"
  metricValue="18.32%"
  metricLabel="시장 점유율"
  icon="Ξ"
  gradientFrom="from-blue-500"
  gradientTo="to-purple-500"
  size="medium"
/>`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800">Individual Widget:</h3>
            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`<RealtimePriceWidget
  ticker="BTCUSDT"
  variant="crypto"
  size="medium"
  showVolume={true}
  showTimestamp={true}
/>`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-800">Grid Widget:</h3>
            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`<PriceWidgetGrid
  tickers={['BTCUSDT', 'ETHUSDT', 'XRPUSDT']}
  variant="crypto"
  size="medium"
  columns={3}
  showGroupTabs={true}
/>`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800">Mini Widget:</h3>
            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`<MiniPriceWidget
  ticker="BTCUSDT"
  showChange={true}
  showStatus={true}
/>`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800">Realtime Quotes Widget:</h3>
            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`<RealtimeQuotesPriceWidget
  assetIdentifier="BTCUSDT"
/>`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WidgetExamples;









