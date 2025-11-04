"use client";

import React from 'react';

export interface CryptoMetricCardProps {
  // 데이터
  symbol: string;
  name: string;
  metricValue: string | number;
  metricLabel: string;
  icon?: string;
  
  // 스타일 커스터마이징
  gradientFrom?: string;
  gradientTo?: string;
  textColor?: string;
  labelColor?: string;
  
  // 레이아웃
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const CryptoMetricCard: React.FC<CryptoMetricCardProps> = ({
  symbol,
  name,
  metricValue,
  metricLabel,
  icon = 'Ξ',
  gradientFrom = 'from-blue-500',
  gradientTo = 'to-purple-500',
  textColor = 'text-white',
  labelColor = 'text-blue-100',
  showIcon = true,
  size = 'medium',
  className = '',
}) => {
  // 크기별 스타일
  const sizeStyles: Record<'small' | 'medium' | 'large', {
    container: string;
    title: string;
    icon: string;
    value: string;
    label: string;
  }> = {
    small: {
      container: 'p-4',
      title: 'text-base font-semibold',
      icon: 'text-2xl',
      value: 'text-2xl font-bold mb-1',
      label: 'text-base font-medium',
    },
    medium: {
      container: 'p-6',
      title: 'text-lg font-semibold',
      icon: 'text-3xl',
      value: 'text-3xl font-bold mb-2',
      label: 'text-lg font-medium',
    },
    large: {
      container: 'p-8',
      title: 'text-xl font-semibold',
      icon: 'text-4xl',
      value: 'text-4xl font-bold mb-3',
      label: 'text-xl font-medium',
    },
  };

  const currentSize = sizeStyles[size];

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

      {/* 메트릭 값 */}
      <div className={currentSize.value}>
        {typeof metricValue === 'number' 
          ? metricValue.toLocaleString('en-US', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })
          : metricValue
        }
      </div>

      {/* 메트릭 레이블 */}
      <div className={`${currentSize.label} ${labelColor}`}>
        {metricLabel}
      </div>
    </div>
  );
};

export default CryptoMetricCard;

