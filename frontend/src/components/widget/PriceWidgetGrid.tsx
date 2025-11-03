"use client";

import React, { useState } from 'react';
import RealtimePriceWidget from './RealtimePriceWidget';

interface PriceWidgetGridProps {
  tickers: string[];
  variant?: 'crypto' | 'stocks' | 'commodities' | 'default';
  size?: 'small' | 'medium' | 'large';
  columns?: 2 | 3 | 4 | 6;
  showGroupTabs?: boolean;
  groups?: Array<{
    title: string;
    tickers: string[];
    variant?: 'crypto' | 'stocks' | 'commodities' | 'default';
  }>;
  className?: string;
}

const PriceWidgetGrid: React.FC<PriceWidgetGridProps> = ({
  tickers,
  variant = 'default',
  size = 'medium',
  columns = 4,
  showGroupTabs = false,
  groups = [],
  className = ''
}) => {
  const [selectedGroup, setSelectedGroup] = useState(0);

  // 그룹이 있는 경우 그룹별로 표시, 없으면 단일 그룹으로 표시
  const displayGroups = groups.length > 0 ? groups : [{ title: 'Prices', tickers, variant }];
  const currentGroup = displayGroups[selectedGroup];

  // 그리드 컬럼 클래스
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
  };

  return (
    <div className={`w-full ${className}`}>
      {/* 그룹 탭 */}
      {showGroupTabs && displayGroups.length > 1 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {displayGroups.map((group, index) => (
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
      )}

      {/* 위젯 그리드 */}
      <div className={`grid ${gridCols[columns]} gap-4`}>
        {currentGroup.tickers.map((ticker) => (
          <RealtimePriceWidget
            key={ticker}
            ticker={ticker}
            variant={currentGroup.variant || variant}
            size={size}
            showVolume={true}
            showTimestamp={false}
          />
        ))}
      </div>
    </div>
  );
};

export default PriceWidgetGrid;







