"use client";

import React from 'react';
import PerformanceTreeMapToday from '@/components/charts/treemap/PerformanceTreeMapToday';

const MapPage: React.FC = () => {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Market Performance Map
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Interactive tree map showing today&apos;s asset performance across different categories
        </p>
      </div>
      
      <div className="w-full">
        <PerformanceTreeMapToday 
          height={650}
          autoRefresh={true}
          refreshInterval={900000} // 15분
        />
      </div>
    </div>
  );
};

export default MapPage;
