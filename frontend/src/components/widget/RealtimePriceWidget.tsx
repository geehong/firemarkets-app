"use client";

import React from 'react';
import { useRealtimePrices } from '../../hooks/useSocket';

interface RealtimePriceWidgetProps {
  ticker: string;
  showVolume?: boolean;
  showTimestamp?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'crypto' | 'stocks' | 'commodities' | 'default';
  className?: string;
}

const RealtimePriceWidget: React.FC<RealtimePriceWidgetProps> = ({
  ticker,
  showVolume = true,
  showTimestamp = false,
  size = 'medium',
  variant = 'default',
  className = ''
}) => {
  const { latestPrice, isConnected, isUsingDummyData } = useRealtimePrices(ticker);

  // 크기별 스타일
  const sizeStyles = {
    small: {
      container: 'p-3',
      title: 'text-sm font-medium',
      price: 'text-lg font-bold',
      volume: 'text-xs',
      timestamp: 'text-xs',
      status: 'text-xs'
    },
    medium: {
      container: 'p-4',
      title: 'text-base font-semibold',
      price: 'text-xl font-bold',
      volume: 'text-sm',
      timestamp: 'text-xs',
      status: 'text-xs'
    },
    large: {
      container: 'p-6',
      title: 'text-lg font-semibold',
      price: 'text-2xl font-bold',
      volume: 'text-sm',
      timestamp: 'text-sm',
      status: 'text-sm'
    }
  };

  // 변형별 색상
  const variantStyles = {
    crypto: {
      container: 'bg-blue-50 border-blue-200',
      title: 'text-blue-800',
      price: 'text-blue-600',
      volume: 'text-gray-600',
      timestamp: 'text-gray-500',
      status: 'text-green-600'
    },
    stocks: {
      container: 'bg-green-50 border-green-200',
      title: 'text-green-800',
      price: 'text-green-600',
      volume: 'text-gray-600',
      timestamp: 'text-gray-500',
      status: 'text-green-600'
    },
    commodities: {
      container: 'bg-yellow-50 border-yellow-200',
      title: 'text-yellow-800',
      price: 'text-yellow-600',
      volume: 'text-gray-600',
      timestamp: 'text-gray-500',
      status: 'text-green-600'
    },
    default: {
      container: 'bg-gray-50 border-gray-200',
      title: 'text-gray-800',
      price: 'text-gray-700',
      volume: 'text-gray-600',
      timestamp: 'text-gray-500',
      status: 'text-green-600'
    }
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  // 연결 상태 표시
  const getStatusText = () => {
    if (isConnected) return '● Live';
    if (isUsingDummyData) return '● Demo';
    return '● Offline';
  };

  const getStatusColor = () => {
    if (isConnected) return 'text-green-600';
    if (isUsingDummyData) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`
      ${currentSize.container}
      ${currentVariant.container}
      rounded-lg border
      ${className}
    `}>
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-2">
        <h3 className={`${currentSize.title} ${currentVariant.title}`}>
          {ticker}
        </h3>
        <span className={`${currentSize.status} ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* 가격 */}
      <div className={`${currentSize.price} ${currentVariant.price} mb-2`}>
        ${latestPrice?.price?.toFixed(2) || 'N/A'}
      </div>

      {/* 볼륨 */}
      {showVolume && (
        <div className={`${currentSize.volume} ${currentVariant.volume} mb-1`}>
          Volume: {latestPrice?.volume?.toLocaleString('en-US') || 'N/A'}
        </div>
      )}

      {/* 타임스탬프 */}
      {showTimestamp && latestPrice?.timestamp && (
        <div className={`${currentSize.timestamp} ${currentVariant.timestamp}`}>
          {new Date(latestPrice.timestamp).toLocaleTimeString('en-US')}
        </div>
      )}
    </div>
  );
};

export default RealtimePriceWidget;


