
"use client";

import React from "react";
import OHLCVCustomGUIChart from "@/components/charts/ohlcvcharts/OHLCVCustomGUIChart";

export default function TechnicalChart() {
  return (
      <div className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <OHLCVCustomGUIChart 
            assetIdentifier="1" 
            seriesName="Bitcoin (BTC)" 
            height={600} 
            dataInterval="1d"
        />
      </div>
  );
}
