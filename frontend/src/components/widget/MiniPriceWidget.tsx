"use client";

import React from 'react';
import { useRealtimePrices } from '../../hooks/useSocket';

interface MiniPriceWidgetProps {
  ticker: string;
  showChange?: boolean;
  showStatus?: boolean;
  className?: string;
}

const MiniPriceWidget: React.FC<MiniPriceWidgetProps> = ({
  ticker,
  showChange = false,
  showStatus = true,
  className = ''
}) => {
  const { latestPrice, isConnected, isUsingDummyData } = useRealtimePrices(ticker);

  const getStatusIcon = () => {
    if (isConnected) return '🟢';
    if (isUsingDummyData) return '🟡';
    return '🔴';
  };

  const getStatusText = () => {
    if (isConnected) return 'Live';
    if (isUsingDummyData) return 'Demo';
    return 'Offline';
  };

  return (
    <div className={`
      flex items-center justify-between
      p-3 bg-white rounded-lg border border-gray-200
      hover:shadow-md transition-shadow
      ${className}
    `}>
      {/* 티커와 가격 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 truncate">
            {ticker}
          </span>
          {showStatus && (
            <span className="text-xs text-gray-500" title={getStatusText()}>
              {getStatusIcon()}
            </span>
          )}
        </div>
        <div className="text-lg font-bold text-gray-900">
          ${latestPrice?.price?.toFixed(2) || 'N/A'}
        </div>
        {showChange && latestPrice?.price && (
          <div className="text-xs text-gray-500">
            {/* 실제로는 이전 가격과 비교해서 변화율 계산 필요 */}
            +0.00%
          </div>
        )}
      </div>

      {/* 볼륨 (작은 화면에서는 숨김) */}
      <div className="hidden sm:block text-right">
        <div className="text-xs text-gray-500">
          Vol: {latestPrice?.volume ? (latestPrice.volume / 1000).toFixed(0) + 'K' : 'N/A'}
        </div>
      </div>
    </div>
  );
};

export default MiniPriceWidget;









