
"use client";

import React from "react";
import { useOhlcvData } from "@/hooks/assets/useAssets";
import TechnicalIndicators from "@/components/analysis/technical/TechnicalIndicators";
import TechnicalChart from "@/components/analysis/technical/TechnicalChart";

export default function TechnicalPage() {
  // We'll hardcode BTC ID '1' for now as per original implementation
  const { data: ohlcvData, isLoading } = useOhlcvData("1", { limit: 200, dataInterval: "1d" });

  const description = (
    <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-100 dark:border-green-800 mb-6">
      <h2 className="text-lg font-bold text-green-800 dark:text-green-300 mb-2">기술적 분석 (Technical Analysis)</h2>
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
        과거의 가격 흐름과 거래량을 차트로 분석하여 매매 타이밍을 포착합니다.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-md font-semibold text-green-700 dark:text-green-400 mb-1">고급 차트 (Advanced Charting)</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            TradingView 스타일의 캔들 차트를 통해 시가, 고가, 저가, 종가(OHLCV)를 정밀하게 분석할 수 있습니다.
          </p>
        </div>
        <div>
          <h3 className="text-md font-semibold text-green-700 dark:text-green-400 mb-1">보조 지표 (Indicators)</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <strong>RSI</strong>(상대강도지수)와 <strong>MACD</strong>(이동평균수렴확산)를 통해 추세의 강도와 반전 신호를 식별합니다.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {description}
      
      {/* Indicator Summary Cards */}
      <TechnicalIndicators ohlcvData={ohlcvData} isLoading={isLoading} />

      {/* Main Chart */}
      <TechnicalChart />
    </div>
  );
}
