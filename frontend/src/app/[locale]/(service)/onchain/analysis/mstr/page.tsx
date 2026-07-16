'use client';

import React, { useState, useEffect, useRef } from 'react';
import FractalChart, { FractalChartHandle } from '@/components/analysis/FractalChart';
import MetricsDashboard from '@/components/analysis/MetricsDashboard';
import { calculateCorrelation, calculateAgreementRate, linearRegression } from '@/utils/mathUtils';
import PredictionTable from '@/components/analysis/PredictionTable';
import TrendBetWinRate from '@/components/analysis/TrendBetWinRate';
import { useOhlcvV2 } from '@/hooks/assets/useAssetV2';

export default function MSTRAnalysisPage() {
  const [currentData, setCurrentData] = useState<any[]>([]);
  const [fractalRawData, setFractalRawData] = useState<any[]>([]);

  // Fetch real data using hooks
  const { data: mstrRes, loading: mstrLoading } = useOhlcvV2('MSTR', { start_date: '2023-01-01' });
  const { data: btcRes, loading: btcLoading } = useOhlcvV2('BTC', { start_date: '2020-01-01', end_date: '2022-12-31' });

  const loading = mstrLoading || btcLoading;

  // Process data when it arrives
  useEffect(() => {
    if (mstrRes?.data) {
      setCurrentData(mstrRes.data.map((d: any) => ({
        time: d.timestamp_utc.split('T')[0],
        open: d.open_price,
        high: d.high_price,
        low: d.low_price,
        close: d.close_price,
      })));
    }
  }, [mstrRes]);

  useEffect(() => {
    if (btcRes?.data) {
      setFractalRawData(btcRes.data.map((d: any) => ({
        time: d.timestamp_utc.split('T')[0],
        open: d.open_price,
        high: d.high_price,
        low: d.low_price,
        close: d.close_price,
      })));
    }
  }, [btcRes]);



  // Interaction State (Transformations)
  // Default values to center the fractal on the screen
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [timeScale, setTimeScale] = useState<number>(1.0);
  const [priceOffset, setPriceOffset] = useState<number>(0);
  const [priceScale, setPriceScale] = useState<number>(1.0);

  // Chart y-axis log/linear toggle, rendered next to the chart title (not
  // overlapping the price axis labels the way an in-chart button would).
  const fractalChartRef = useRef<FractalChartHandle>(null);
  const [isLogScale, setIsLogScale] = useState(false);

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

  // The raw fractal (e.g. one BTC cycle) ends at "today" by default, so on its
  // own it never shows a future projection. Repeat the cycle once, offset so
  // it continues seamlessly from where the first cycle left off, giving a
  // second leg that naturally lands in the future once mapped.
  const extendedFractalRawData = React.useMemo(() => {
    if (!fractalRawData.length) return [];
    const continuityOffset = fractalRawData[fractalRawData.length - 1].close - fractalRawData[0].close;
    const secondCycle = fractalRawData.map((d) => ({
      ...d,
      open: d.open + continuityOffset,
      high: d.high + continuityOffset,
      low: d.low + continuityOffset,
      close: d.close + continuityOffset,
    }));
    return [...fractalRawData, ...secondCycle];
  }, [fractalRawData]);

  // Dynamically map fractal data onto current data's time axis, extending into the future
  const fractalData = React.useMemo(() => {
    if (!currentData.length || !extendedFractalRawData.length) return [];

    const mapped = [];
    const lastCurrentDate = new Date(currentData[currentData.length - 1].time);
    // Pivot scaling around "today" (the boundary between the first cycle and
    // its repeated continuation) so growing/shrinking the pattern extends
    // equally into the past and into the future from the present.
    const pivotIdx = fractalRawData.length;

    for (let i = 0; i < extendedFractalRawData.length; i++) {
      const pastPoint = extendedFractalRawData[i];

      // Target index in current time axis
      const targetIndex = Math.round(pivotIdx + (i - pivotIdx) * timeScale + timeOffset);
      
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

      const mappedPoint = {
        ...pastPoint,
        open: pastPoint.open * priceScale + priceOffset,
        high: pastPoint.high * priceScale + priceOffset,
        low: pastPoint.low * priceScale + priceOffset,
        close: pastPoint.close * priceScale + priceOffset,
        time: targetTimeStr,
        originalTime: pastPoint.time,
        logicalIndex: targetIndex, // pass down for easy anchor positioning
      };

      // Ensure strictly increasing unique times for Lightweight Charts
      if (mapped.length > 0 && mapped[mapped.length - 1].time === targetTimeStr) {
        // Duplicate time (timeScale < 1), overwrite with the latest point
        mapped[mapped.length - 1] = mappedPoint;
      } else {
        mapped.push(mappedPoint);
      }
    }
    return mapped;
  }, [currentData, extendedFractalRawData, fractalRawData.length, timeOffset, timeScale, priceOffset, priceScale]);

  const handleTransformUpdate = React.useCallback((dt: number, dp: number, dScaleT: number, dScaleP: number) => {
    setTimeOffset(prev => prev + dt);
    setPriceOffset(prev => prev + dp);
    setTimeScale(prev => Math.max(0.1, prev + dScaleT));
    setPriceScale(prev => Math.max(0.1, prev + dScaleP));
  }, []);

  // Searches (timeOffset, timeScale) combinations against the single historical
  // fractal cycle (the future-projected repeat has no ground truth to correlate
  // against) and picks whichever alignment maximizes Pearson correlation with
  // the real price series. Price scale/offset don't affect correlation (it's
  // affine-invariant), so those are fit separately via OLS on the winning window.
  const handleAutoAlign = React.useCallback(() => {
    if (!currentData.length || !fractalRawData.length) return;

    const pivotIdx = fractalRawData.length;
    const scaleCandidates = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4];
    let best = { corr: -Infinity, scale: 1, offset: 0 };

    for (const scale of scaleCandidates) {
      for (let offset = -currentData.length; offset <= currentData.length; offset += 2) {
        let n = 0, sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
        for (let i = 0; i < fractalRawData.length; i++) {
          const targetIndex = Math.round(pivotIdx + (i - pivotIdx) * scale + offset);
          if (targetIndex < 0 || targetIndex >= currentData.length) continue;
          const x = currentData[targetIndex].close;
          const y = fractalRawData[i].close;
          n++;
          sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; sumY2 += y * y;
        }
        if (n < 30) continue;
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        if (denominator === 0) continue;
        const corr = numerator / denominator;
        if (corr > best.corr) {
          best = { corr, scale, offset };
        }
      }
    }

    if (best.corr === -Infinity) return;

    const fractalWindow: number[] = [];
    const currentWindow: number[] = [];
    for (let i = 0; i < fractalRawData.length; i++) {
      const targetIndex = Math.round(pivotIdx + (i - pivotIdx) * best.scale + best.offset);
      if (targetIndex < 0 || targetIndex >= currentData.length) continue;
      fractalWindow.push(fractalRawData[i].close);
      currentWindow.push(currentData[targetIndex].close);
    }
    const { slope, intercept } = linearRegression(fractalWindow, currentWindow);

    setTimeScale(best.scale);
    setTimeOffset(best.offset);
    setPriceScale(slope);
    setPriceOffset(intercept);
  }, [currentData, fractalRawData]);

  // Pair series by the date they're actually drawn on (fractalData's
  // logicalIndex), not by raw array position — fractalData isn't guaranteed
  // to start at currentData[0], so a positional slice compares the wrong days.
  const overlapPoints = React.useMemo(
    () => fractalData.filter(p => p.logicalIndex >= 0 && p.logicalIndex < currentData.length),
    [fractalData, currentData]
  );
  const currentPrices = overlapPoints.map(p => currentData[p.logicalIndex].close);
  const fractalPrices = overlapPoints.map(p => p.close);

  const correlation = overlapPoints.length > 0 ? calculateCorrelation(currentPrices, fractalPrices) : 0;
  const agreementRate = overlapPoints.length > 0 ? calculateAgreementRate(currentPrices, fractalPrices) : 0;

  const currentMax = currentData.length > 0 ? Math.max(...currentData.map(d => d.high)) : 0;
  const currentCurrent = currentData.length > 0 ? currentData[currentData.length - 1].close : 0;
  const currentDrawdown = currentMax > 0 ? ((currentCurrent - currentMax) / currentMax) * 100 : 0;

  const fractalDrawdown = -85.10; // Hardcoded or calculate dynamically if needed

  // Get date ranges for display
  const minLength = overlapPoints.length;
  const currentStartDate = minLength > 0 ? currentData[overlapPoints[0].logicalIndex].time : '';
  const currentEndDate = minLength > 0 ? currentData[overlapPoints[minLength - 1].logicalIndex].time : '';
  const pastStartDate = minLength > 0 ? overlapPoints[0].originalTime : '';
  const pastEndDate = minLength > 0 ? overlapPoints[minLength - 1].originalTime : '';

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
        onAutoAlign={handleAutoAlign}
      />

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            인터랙티브 프랙탈 오버레이 차트
          </h2>
          <button
            type="button"
            onClick={() => fractalChartRef.current?.toggleLogScale()}
            className={`text-xs font-medium px-2 py-1 rounded-md border transition-colors
              ${isLogScale
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}
            title="가격축을 로그/일반 스케일로 전환합니다"
          >
            {isLogScale ? '로그' : '일반'}
          </button>
        </div>
        <FractalChart
          ref={fractalChartRef}
          currentData={currentData}
          fractalData={fractalData}
          onTransformUpdate={handleTransformUpdate}
          onLogScaleChange={setIsLogScale}
        />
        <p className="text-xs text-gray-400 mt-4 text-right">
          * 캔들 차트: 현재 사이클 / 회색 선: 과거 프랙탈 사이클
        </p>
      </div>

      <TrendBetWinRate currentData={currentData} fractalData={fractalData} />

      <PredictionTable currentData={currentData} fractalData={fractalData} />
    </div>
  );
}
