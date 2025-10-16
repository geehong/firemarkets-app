"use client";

import React from 'react';

interface TradingViewDemoProps {
  symbol?: string;
  interval?: string;
  theme?: 'light' | 'dark';
  height?: number;
  width?: number;
}

const TradingViewDemo: React.FC<TradingViewDemoProps> = ({
  symbol = 'AAPL',
  interval = '1D',
  theme = 'light',
  height = 400,
  width = '100%',
}) => {
  // Generate mock OHLCV data
  const generateMockData = () => {
    const data = [];
    const basePrice = 150;
    let currentPrice = basePrice;
    
    for (let i = 0; i < 30; i++) {
      const open = currentPrice;
      const high = open + Math.random() * 10 - 5;
      const low = open - Math.random() * 10 - 5;
      const close = low + Math.random() * (high - low);
      const volume = Math.floor(Math.random() * 1000000) + 500000;
      
      data.push({
        time: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: volume
      });
      
      currentPrice = close;
    }
    
    return data;
  };

  const mockData = generateMockData();
  const latestPrice = mockData[mockData.length - 1];
  const priceChange = latestPrice.close - latestPrice.open;
  const priceChangePercent = ((priceChange / latestPrice.open) * 100).toFixed(2);

  return (
    <div 
      className={`rounded-lg border-2 border-dashed ${
        theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
      }`}
      style={{ 
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
      }}
    >
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              {symbol} - {interval}
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              TradingView Chart Demo
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${latestPrice.close.toFixed(2)}
            </div>
            <div className={`text-sm ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent}%)
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 bg-white rounded border p-4 mb-4">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📈</div>
              <h4 className="text-lg font-semibold text-gray-700 mb-2">TradingView Chart Placeholder</h4>
              <p className="text-gray-500 text-sm">
                This is a demo version. Install TradingView library to see the real chart.
              </p>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded border p-4">
          <h4 className="font-semibold text-gray-700 mb-2">Recent Data (Demo)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Date</th>
                  <th className="text-right py-1">Open</th>
                  <th className="text-right py-1">High</th>
                  <th className="text-right py-1">Low</th>
                  <th className="text-right py-1">Close</th>
                  <th className="text-right py-1">Volume</th>
                </tr>
              </thead>
              <tbody>
                {mockData.slice(-5).map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-1">{item.time}</td>
                    <td className="text-right py-1">${item.open}</td>
                    <td className="text-right py-1 text-green-600">${item.high}</td>
                    <td className="text-right py-1 text-red-600">${item.low}</td>
                    <td className="text-right py-1 font-semibold">${item.close}</td>
                    <td className="text-right py-1">{item.volume.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Demo data - Install TradingView Advanced Charts library for real-time data
          </p>
        </div>
      </div>
    </div>
  );
};

export default TradingViewDemo;
