'use client';

import React, { useState, useEffect } from 'react';
import FractalChart from '@/components/analysis/FractalChart';
import MetricsDashboard from '@/components/analysis/MetricsDashboard';
import { currentMockData, fractalMockData } from './mockData';
import { calculateCorrelation, calculateAgreementRate } from '@/utils/mathUtils';

export default function MSTRAnalysisPage() {
  const [currentData, setCurrentData] = useState<any[]>([]);
  const [fractalRawData, setFractalRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Interaction State (Transformations)
  // Default values to center the fractal on the screen
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [timeScale, setTimeScale] = useState<number>(1.0);
  const [priceOffset, setPriceOffset] = useState<number>(0);
  const [priceScale, setPriceScale] = useState<number>(1.0);

  // Initial centering logic once data is loaded
  useEffect(() => {
    if (currentData.length > 0 && fractalRawData.length > 0 && timeOffset === 0) {
      // Place it at the end of the current cycle by default
      const defaultTimeOffset = Math.max(0, currentData.length - fractalRawData.length);
      
      // Auto-scale price roughly based on the first few items
      const currStartPrice = currentData[defaultTimeOffset]?.close || 100;
      const pastStartPrice = fractalRawData[0]?.close || 10;
      const initialPriceScale = currStartPrice / pastStartPrice;
      
      setTimeOffset(defaultTimeOffset);
      setPriceScale(initialPriceScale);
    }
  }, [currentData, fractalRawData]);

  // Dynamically map fractal data onto current data's time axis, extending into the future
  const fractalData = React.useMemo(() => {
    if (!currentData.length || !fractalRawData.length) return [];

    const mapped = [];
    const lastCurrentDate = new Date(currentData[currentData.length - 1].time);

    for (let i = 0; i < fractalRawData.length; i++) {
      const pastPoint = fractalRawData[i];
      
      // Target index in current time axis
      const targetIndex = Math.round(i * timeScale + timeOffset);
      
      let targetTimeStr = '';
      if (targetIndex >= 0 && targetIndex < currentData.length) {
        // Map to existing date
        targetTimeStr = currentData[targetIndex].time;
      } else if (targetIndex >= currentData.length) {
        // Generate future date
        const daysIntoFuture = targetIndex - currentData.length + 1;
        const futureDate = new Date(lastCurrentDate);
        futureDate.setDate(futureDate.getDate() + daysIntoFuture);
        targetTimeStr = futureDate.toISOString().split('T')[0];
      } else {
        // Before current data starts (skip or keep?)
        continue;
      }

      mapped.push({
        ...pastPoint,
        open: pastPoint.open * priceScale + priceOffset,
        high: pastPoint.high * priceScale + priceOffset,
        low: pastPoint.low * priceScale + priceOffset,
        close: pastPoint.close * priceScale + priceOffset,
        time: targetTimeStr,
        originalTime: pastPoint.time,
        logicalIndex: targetIndex, // pass down for easy anchor positioning
      });
    }
    return mapped;
  }, [currentData, fractalRawData, timeOffset, timeScale, priceOffset, priceScale]);

  const handleTransformUpdate = React.useCallback((dt: number, dp: number, dScaleT: number, dScaleP: number) => {
    setTimeOffset(prev => prev + dt);
    setPriceOffset(prev => prev + dp);
    setTimeScale(prev => Math.max(0.1, prev + dScaleT));
    setPriceScale(prev => Math.max(0.1, prev + dScaleP));
  }, []);

  const minLength = Math.min(currentData.length, fractalData.length);
  const currentPrices = currentData.slice(0, minLength).map(d => d.close);
  const fractalPrices = fractalData.slice(0, minLength).map(d => d.close);

  const correlation = minLength > 0 ? calculateCorrelation(currentPrices, fractalPrices) : 0;
  const agreementRate = minLength > 0 ? calculateAgreementRate(currentPrices, fractalPrices) : 0;

  const currentMax = currentData.length > 0 ? Math.max(...currentData.map(d => d.high)) : 0;
  const currentCurrent = currentData.length > 0 ? currentData[currentData.length - 1].close : 0;
  const currentDrawdown = currentMax > 0 ? ((currentCurrent - currentMax) / currentMax) * 100 : 0;

  const fractalMax = fractalData.length > 0 ? Math.max(...fractalData.map(d => d.high)) : 0;
  const fractalDrawdown = -85.10; // Hardcoded or calculate dynamically if needed

  // Get date ranges for display
  const currentStartDate = minLength > 0 ? currentData[0].time : '';
  const currentEndDate = minLength > 0 ? currentData[minLength - 1].time : '';
  const pastStartDate = minLength > 0 ? fractalData[0].originalTime : '';
  const pastEndDate = minLength > 0 ? fractalData[minLength - 1].originalTime : '';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          MSTR 사이클 프랙탈 분석
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          현재 주가 흐름과 과거 비트코인/MSTR 불장 사이클의 패턴을 오버레이하여 비교합니다. 
          차트의 빨간 포인트를 좌우로 드래그하여 과거 사이클의 시작점과 배율(늘리기/줄이기)을 동기화해 볼 수 있습니다.
        </p>
        
        {minLength > 0 && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg border border-blue-100 dark:border-blue-800 text-sm">
            <strong>현재 비교 중인 구간 (상관계수 기준):</strong><br/>
            • <b>현재 사이클:</b> {currentStartDate} ~ {currentEndDate} (총 {minLength}일)<br/>
            • <b>과거 프랙탈:</b> {pastStartDate} ~ {pastEndDate} (화면 매핑 기준)
          </div>
        )}
      </div>

      <MetricsDashboard 
        correlation={correlation}
        agreementRate={agreementRate}
        currentDrawdown={currentDrawdown}
        fractalDrawdown={fractalDrawdown}
      />

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          인터랙티브 프랙탈 오버레이 차트
        </h2>
        <FractalChart 
          currentData={currentData}
          fractalData={fractalData}
          onTransformUpdate={handleTransformUpdate}
        />
        <p className="text-xs text-gray-400 mt-4 text-right">
          * 캔들 차트: 현재 사이클 / 회색 선: 과거 프랙탈 사이클
        </p>
      </div>
    </div>
  );
}
