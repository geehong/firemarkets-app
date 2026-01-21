
"use client";

import React, { useEffect, useState } from "react";
import QuantitativeCorrelation from "@/components/analysis/quantitative/QuantitativeCorrelation";
import QuantitativePairTrading from "@/components/analysis/quantitative/QuantitativePairTrading";

import { useCorrelation } from "@/hooks/analysis/useCorrelation";

export default function QuantitativePage() {
  const defaultTickers = "BTCUSDT,ETHUSDT,SPY,QQQ,GLD"; 
  const { data, loading } = useCorrelation(defaultTickers);

  const description = (
    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800 mb-6">
      <h2 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">정량적 분석 가이드 (Quantitative Guide)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-md font-semibold text-blue-700 dark:text-blue-400 mb-2">🔍 상관관계 매트릭스 활용법</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
            <li><strong>포트폴리오 분산:</strong> 상관계수가 낮은(0에 가까운) 자산을 조합하여 리스크를 줄이세요.</li>
            <li><strong>헤징 전략:</strong> 역상관(-1.0) 자산(예: 주식 vs 국채)을 보유하여 하락장을 방어하세요.</li>
            <li><strong>페어 트레이딩 후보:</strong> 상관계수가 <strong>0.8 이상</strong>인 자산은 '통계적 차익거래'의 좋은 후보입니다.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-md font-semibold text-blue-700 dark:text-blue-400 mb-2">📉 통계적 차익거래 (Stat Arb) 실전</h3>
          <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
             <li>두 자산의 가격 비율(Spread)이 평균에서 얼마나 벗어났는지(Z-Score) 확인하세요.</li>
             <li><strong>Z-Score &gt; 2.0:</strong> 스프레드 과대 평가 → 자산 A 매도 / 자산 B 매수 (평균 회귀 기대)</li>
             <li><strong>Z-Score &lt; -2.0:</strong> 스프레드 과소 평가 → 자산 A 매수 / 자산 B 매도 (평균 회귀 기대)</li>
             <li>두 자산의 상관성이 깨지면(구조적 변화) 전략을 중단해야 합니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {description}
      
      {/* Correlation Heatmap */}
      <QuantitativeCorrelation data={data} loading={loading} />

      {/* Statistical Arbitrage Section - Passing tickers from matrix data if available */}
      <QuantitativePairTrading availableTickers={data?.tickers} />
    </div>
  );
}
