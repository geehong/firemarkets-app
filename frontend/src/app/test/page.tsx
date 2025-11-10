"use client";

import React, { useState, useEffect } from 'react';
import { useRealtimePrices, useBroadcastData } from '../../hooks/useSocket';
import SocketDebugger from '../../components/debug/SocketDebugger';
import NetworkTester from '../../components/debug/NetworkTester';
import { RealtimePriceWidget, PriceWidgetGrid, MiniPriceWidget } from '../../components/widget';

// 컴포넌트 타입 정의
interface ChartComponent {
  (props: { ticker: string; price?: number; volume?: number; timestamp?: string }): React.JSX.Element;
}

// 임시 차트 컴포넌트들 (실제 구현 시 교체 필요)
const MiniPriceCryptoChart: ChartComponent = ({ ticker, price, volume, timestamp }) => (
  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
    <h3 className="text-lg font-semibold text-blue-800">{ticker}</h3>
    <div className="text-2xl font-bold text-blue-600">${price?.toFixed(2) || 'N/A'}</div>
    <div className="text-sm text-gray-600">Volume: {volume?.toLocaleString('en-US') || 'N/A'}</div>
    <div className="text-xs text-gray-500">{timestamp || 'No data'}</div>
  </div>
);

const MiniPriceStocksEtfChart: ChartComponent = ({ ticker, price, volume, timestamp }) => (
  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
    <h3 className="text-lg font-semibold text-green-800">{ticker}</h3>
    <div className="text-2xl font-bold text-green-600">${price?.toFixed(2) || 'N/A'}</div>
    <div className="text-sm text-gray-600">Volume: {volume?.toLocaleString('en-US') || 'N/A'}</div>
    <div className="text-xs text-gray-500">{timestamp || 'No data'}</div>
  </div>
);

const MiniPriceCommoditiesChart: ChartComponent = ({ ticker, price, volume, timestamp }) => (
  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
    <h3 className="text-lg font-semibold text-yellow-800">{ticker}</h3>
    <div className="text-2xl font-bold text-yellow-600">${price?.toFixed(2) || 'N/A'}</div>
    <div className="text-sm text-gray-600">Volume: {volume?.toLocaleString('en-US') || 'N/A'}</div>
    <div className="text-xs text-gray-500">{timestamp || 'No data'}</div>
  </div>
);

// 그룹 정의 (기존 차트용)
const groupDefs = [
  {
    title: 'Crypto (Live Broadcasting)',
    items: ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'DOTUSDT', 'LTCUSDT', 'BCHUSDT'],
    comp: MiniPriceCryptoChart
  },
  {
    title: 'Stocks (Limited Data)',
    items: ['BABA', 'TM', 'BRK-A', 'AMX', 'TLK', 'NMRX', 'EACQ', 'LTM'],
    comp: MiniPriceStocksEtfChart
  },
  {
    title: 'Commodities (No Live Data)',
    items: ['GCUSD', 'SIUSD'],
    comp: MiniPriceCommoditiesChart
  }
];

// 위젯용 그룹 정의
const widgetGroups = [
  {
    title: 'Crypto Widgets',
    tickers: ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'DOTUSDT'],
    variant: 'crypto' as const
  },
  {
    title: 'Stocks Widgets',
    tickers: ['BABA', 'TM', 'BRK-A', 'AMX', 'TLK', 'NMRX'],
    variant: 'stocks' as const
  },
  {
    title: 'Commodities Widgets',
    tickers: ['GCUSD', 'SIUSD'],
    variant: 'commodities' as const
  }
];

// 개별 티커 컴포넌트
const TickerCard: React.FC<{
  ticker: string;
  ChartComponent: ChartComponent;
}> = ({ ticker, ChartComponent }) => {
  const { latestPrice, isConnected } = useRealtimePrices(ticker);

  return (
    <div className="w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 p-2">
      <ChartComponent
        ticker={ticker}
        price={latestPrice?.price}
        volume={latestPrice?.volume}
        timestamp={latestPrice?.timestamp}
      />
      <div className="text-xs text-center mt-1">
        {isConnected ? (
          <span className="text-green-600">● Connected</span>
        ) : (
          <span className="text-red-600">● Disconnected</span>
        )}
      </div>
    </div>
  );
};

// 메인 페이지 컴포넌트
const TestPage: React.FC = () => {
  const { broadcastData, isConnected } = useBroadcastData();
  const [selectedGroup, setSelectedGroup] = useState(0);
  const [selectedWidgetGroup, setSelectedWidgetGroup] = useState(0);

  // 디버그 컴포넌트 비활성화

  return (
    <div className="p-6 space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Real-time Market Data & Widgets</h1>
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <div className="text-sm text-gray-600">
            Broadcast Data: {broadcastData.length} items
          </div>
        </div>
      </div>

      {/* 그룹 선택 탭 */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {groupDefs.map((group, index) => (
            <button
              key={index}
              onClick={() => setSelectedGroup(index)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedGroup === index
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {group.title}
            </button>
          ))}
        </div>
      </div>

      {/* 선택된 그룹의 티커들 표시 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {groupDefs[selectedGroup].title}
        </h2>
        <div className="flex flex-wrap -mx-2">
          {groupDefs[selectedGroup].items.map((ticker) => (
            <TickerCard
              key={ticker}
              ticker={ticker}
              ChartComponent={groupDefs[selectedGroup].comp}
            />
          ))}
        </div>
      </div>

      {/* 브로드캐스트 데이터 표시 */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Broadcast Data</h2>
        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          {broadcastData.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No broadcast data received yet</p>
          ) : (
            <div className="space-y-2">
              {broadcastData.slice(-20).reverse().map((data, index) => (
                <div key={index} className="bg-white p-3 rounded border">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-800">{data.ticker}</span>
                    <span className="text-lg font-bold text-green-600">${data.price.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Volume: {data.volume?.toLocaleString('en-US') || 'N/A'} | 
                    Source: {data.dataSource} | 
                    Time: {new Date(data.timestamp).toLocaleTimeString('en-US')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 위젯 섹션들 */}
      <div className="space-y-8">
        {/* 개별 위젯 예제 */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Individual Price Widgets</h2>
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
              size="small"
              showVolume={false}
              showTimestamp={false}
            />
            <RealtimePriceWidget
              ticker="BABA"
              variant="stocks"
              size="large"
              showVolume={true}
              showTimestamp={true}
            />
            <RealtimePriceWidget
              ticker="GCUSD"
              variant="commodities"
              size="medium"
              showVolume={true}
              showTimestamp={false}
            />
          </div>
        </section>

        {/* 그리드 위젯 예제 */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Grid Price Widgets</h2>
          <div className="space-y-6">
            {/* 그룹별 탭 그리드 */}
            <div>
              <h3 className="text-lg font-medium text-gray-600 mb-3">Grouped Tabs Grid</h3>
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {widgetGroups.map((group, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedWidgetGroup(index)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedWidgetGroup === index
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {group.title}
                    </button>
                  ))}
                </div>
              </div>
              <PriceWidgetGrid
                tickers={widgetGroups[selectedWidgetGroup].tickers}
                variant={widgetGroups[selectedWidgetGroup].variant}
                size="medium"
                columns={4}
              />
            </div>

            {/* 단일 그룹 그리드들 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-600 mb-3">Crypto Grid (Small)</h3>
                <PriceWidgetGrid
                  tickers={['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'DOGEUSDT']}
                  variant="crypto"
                  size="small"
                  columns={2}
                />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-600 mb-3">Stocks Grid (Large)</h3>
                <PriceWidgetGrid
                  tickers={['BABA', 'TM', 'BRK-A', 'AMX']}
                  variant="stocks"
                  size="large"
                  columns={2}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 미니 위젯 예제 */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Mini Price Widgets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'BABA', 'TM', 'GCUSD', 'SIUSD', 'DOGEUSDT', 'ADAUSDT'].map((ticker) => (
              <MiniPriceWidget
                key={ticker}
                ticker={ticker}
                showChange={true}
                showStatus={true}
              />
            ))}
          </div>
        </section>
      </div>
      
      {/* 디버그 컴포넌트들 비활성화 */}
    </div>
  );
};

export default TestPage;
