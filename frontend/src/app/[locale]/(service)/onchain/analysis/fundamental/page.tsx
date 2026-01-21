
"use client";

import React, { useEffect, useState } from "react";
import TreasuryYields from "@/components/analysis/fundamental/TreasuryYields";
import YieldCurveSpread from "@/components/analysis/fundamental/YieldCurveSpread";
import MacroIndicators from "@/components/analysis/fundamental/MacroIndicators";

import { useMacroData } from "@/hooks/analysis/useMacroData";

export default function FundamentalPage() {
  const { data, loading } = useMacroData();

  if (loading) return <div className="p-10 text-center">Loading Macro Data...</div>;
  if (!data) return <div className="p-10 text-center text-red-500">No Data Available</div>;

  // Process Treasury Data
  const treasuryRaw = data.treasury?.data || []; 
  const treasuryData = treasuryRaw.map((item: any) => ({
    date: item.date,
    year10: item.year10,
    year2: item.year2,
    year1: item.year1,
    month3: item.month3
  })).reverse(); 

  // Process Yield Spread
  const spreadRaw = data.yield_spread?.data || [];

  const description = (
    <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl border border-purple-100 dark:border-purple-800 mb-6">
      <h2 className="text-lg font-bold text-purple-800 dark:text-purple-300 mb-2">기본적 분석 가이드 (Fundamental Guide)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
           <h3 className="text-md font-semibold text-purple-700 dark:text-purple-400 mb-2">📊 거시경제 지표 해석</h3>
           <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
             <li><strong>GDP 성장률:</strong> 경제 건전성 지표. 예상치 상회 시 주식/코인 시장에 긍정적입니다.</li>
             <li><strong>CPI (물가):</strong> 인플레이션 척도. 높으면 금리 인상 우려로 자산 가격에 부정적일 수 있습니다.</li>
             <li><strong>실업률:</strong> 경기 침체 여부를 판단합니다. 급격한 상승은 위험 신호입니다.</li>
           </ul>
        </div>
        <div>
           <h3 className="text-md font-semibold text-purple-700 dark:text-purple-400 mb-2">📉 장단기 금리차 (Yellow Signal)</h3>
           <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
             <li><strong>10년물 - 2년물 스프레드:</strong> 미래 경기 전망을 보여줍니다.</li>
             <li><strong>역전 (마이너스 값):</strong> <span className="text-red-500 font-bold">경기 침체(Recession)</span>의 강력한 선행 지표입니다. (통상 6~18개월 후 발생)</li>
             <li><strong>스티프닝 (가파른 상승):</strong> 경기 회복 기대 또는 인플레이션 우려를 반영합니다.</li>
           </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {description}
      
      {/* 2-Column Grid for Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Treasury Yields Chart */}
         <TreasuryYields data={treasuryData} />

         {/* Yield Spread Chart */}
         <YieldCurveSpread data={spreadRaw} />
      </div>

      {/* Economic Indicators Grid */}
      <MacroIndicators indicators={data.indicators} />
    </div>
  );
}
