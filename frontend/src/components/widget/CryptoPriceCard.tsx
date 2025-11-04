"use client";

import React from 'react';

export interface CryptoPriceCardProps {
  // 데이터
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  icon?: string;
  
  // 스타일 커스터마이징
  gradientFrom?: string;
  gradientTo?: string;
  textColor?: string;
  changePositiveColor?: string;
  changeNegativeColor?: string;
  
  // 레이아웃
  showIcon?: boolean;
  showChangePercent?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const CryptoPriceCard: React.FC<CryptoPriceCardProps> = ({
  symbol,
  name,
  price,
  change24h,
  icon = '₿',
  gradientFrom = 'from-orange-500',
  gradientTo = 'to-yellow-500',
  textColor = 'text-white',
  changePositiveColor = 'text-green-100',
  changeNegativeColor = 'text-red-100',
  showIcon = true,
  showChangePercent = true,
  size = 'medium',
  className = '',
}) => {
  // 크기별 스타일
  const sizeStyles: Record<'small' | 'medium' | 'large', {
    container: string;
    title: string;
    icon: string;
    price: string;
    change: string;
  }> = {
    small: {
      container: 'p-4',
      title: 'text-base font-semibold',
      icon: 'text-2xl',
      price: 'text-2xl font-bold mb-1',
      change: 'text-base font-medium',
    },
    medium: {
      container: 'p-6',
      title: 'text-lg font-semibold',
      icon: 'text-3xl',
      price: 'text-3xl font-bold mb-2',
      change: 'text-lg font-medium',
    },
    large: {
      container: 'p-8',
      title: 'text-xl font-semibold',
      icon: 'text-4xl',
      price: 'text-4xl font-bold mb-3',
      change: 'text-xl font-medium',
    },
  };

  const currentSize = sizeStyles[size];
  const changeColor = change24h >= 0 ? changePositiveColor : changeNegativeColor;

  return (
    <div 
      className={`
        bg-gradient-to-br ${gradientFrom} ${gradientTo} 
        rounded-lg shadow-lg ${textColor}
        ${currentSize.container}
        hover:shadow-xl transition-shadow duration-300
        ${className}
      `}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <h3 className={currentSize.title}>
          {name} ({symbol})
        </h3>
        {showIcon && (
          <span className={currentSize.icon} aria-label={`${name} icon`}>
            {icon}
          </span>
        )}
      </div>

      {/* 가격 */}
      <div className={currentSize.price}>
        ${price.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}
      </div>

      {/* 24시간 변화율 */}
      {showChangePercent && (
        <div className={`${currentSize.change} ${changeColor}`}>
          {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}% (24h)
        </div>
      )}
    </div>
  );
};

export default CryptoPriceCard;

