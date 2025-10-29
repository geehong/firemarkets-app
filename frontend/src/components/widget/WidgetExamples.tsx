"use client";

import React from 'react';
import { RealtimePriceWidget, PriceWidgetGrid, MiniPriceWidget } from './index';

const WidgetExamples: React.FC = () => {
  // 예제 데이터
  const cryptoTickers = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'DOGEUSDT'];
  const stockTickers = ['BABA', 'TM', 'BRK-A', 'AMX'];
  const commodityTickers = ['GCUSD', 'SIUSD'];

  const groupedTickers = [
    {
      title: 'Crypto',
      tickers: cryptoTickers,
      variant: 'crypto' as const
    },
    {
      title: 'Stocks',
      tickers: stockTickers,
      variant: 'stocks' as const
    },
    {
      title: 'Commodities',
      tickers: commodityTickers,
      variant: 'commodities' as const
    }
  ];

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Price Widget Examples</h1>

      {/* 개별 위젯 예제 */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Individual Widgets</h2>
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
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Grid Widgets</h2>
        <div className="space-y-6">
          {/* 단일 그룹 그리드 */}
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">Single Group Grid</h3>
            <PriceWidgetGrid
              tickers={cryptoTickers}
              variant="crypto"
              size="medium"
              columns={4}
            />
          </div>

          {/* 그룹별 탭 그리드 */}
          <div>
            <h3 className="text-lg font-medium text-gray-600 mb-3">Grouped Tabs Grid</h3>
            <PriceWidgetGrid
              groups={groupedTickers}
              size="medium"
              columns={4}
              showGroupTabs={true}
            />
          </div>
        </div>
      </section>

      {/* 미니 위젯 예제 */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Mini Widgets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...cryptoTickers, ...stockTickers, ...commodityTickers].map((ticker) => (
            <MiniPriceWidget
              key={ticker}
              ticker={ticker}
              showChange={true}
              showStatus={true}
            />
          ))}
        </div>
      </section>

      {/* 사용법 안내 */}
      <section className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Usage Examples</h2>
        <div className="space-y-4 text-sm">
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
        </div>
      </section>
    </div>
  );
};

export default WidgetExamples;




