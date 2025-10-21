"use client";

import React, { useState, useEffect } from 'react';
import { useRealtimePrices, useBroadcastData } from '../../hooks/useSocket';
import SocketDebugger from '../../components/debug/SocketDebugger';
import NetworkTester from '../../components/debug/NetworkTester';

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

// 그룹 정의
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

// 개별 티커 컴포넌트
const TickerCard: React.FC<{
  ticker: string;
  ChartComponent: ChartComponent;
}> = ({ ticker, ChartComponent }) => {
  const { latestPrice, isConnected, isUsingDummyData } = useRealtimePrices(ticker);

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
        ) : isUsingDummyData ? (
          <span className="text-yellow-600">● Demo Data</span>
        ) : (
          <span className="text-red-600">● Disconnected</span>
        )}
      </div>
    </div>
  );
};

// 메인 페이지 컴포넌트
const TestPage: React.FC = () => {
  const { broadcastData, isConnected, isUsingDummyData } = useBroadcastData();
  const [selectedGroup, setSelectedGroup] = useState(0);

  // 디버그 컴포넌트 비활성화

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Real-time Market Data</h1>
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 
            isUsingDummyData ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'
          }`}>
            WebSocket: {isConnected ? 'Connected' : isUsingDummyData ? 'Demo Mode' : 'Disconnected'}
          </div>
          <div className="text-sm text-gray-600">
            Broadcast Data: {broadcastData.length} items
          </div>
          {isUsingDummyData && (
            <div className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
              Using demo data - WebSocket server not available
            </div>
          )}
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
      
      {/* 디버그 컴포넌트들 비활성화 */}
    </div>
  );
};

export default TestPage;
