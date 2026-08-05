'use client';

import React, { useState, useEffect, useRef } from 'react';
import FractalChart, { FractalChartHandle } from '@/components/analysis/FractalChart';
import MetricsDashboard from '@/components/analysis/MetricsDashboard';
import { calculateCorrelation, calculateAgreementRate, linearRegression } from '@/utils/mathUtils';
import PredictionTable from '@/components/analysis/PredictionTable';
import TrendBetWinRate from '@/components/analysis/TrendBetWinRate';
import { useOhlcvV2 } from '@/hooks/assets/useAssetV2';

interface AlignCandidate {
  scale: number;
  offset: number;
  corr: number;
  priceScale: number;
  priceOffset: number;
}

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
  // timeOffset/priceOffset: global translation from the blue "move" handle.
  // timeScale/priceScale: global scale from the green "scale" handles — two
  // of them are rendered (start & end of the base cycle) but they both drive
  // these same two numbers, so they always stay exactly pinned to the
  // start/end of the curve and never drift apart from each other.
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [timeScale, setTimeScale] = useState<number>(1.0);
  const [priceOffset, setPriceOffset] = useState<number>(0);
  const [priceScale, setPriceScale] = useState<number>(1.0);

  // Chart y-axis log/linear toggle, rendered next to the chart title (not
  // overlapping the price axis labels the way an in-chart button would).
  const fractalChartRef = useRef<FractalChartHandle>(null);
  const [isLogScale, setIsLogScale] = useState(false);

  // Auto-align presents a shortlist instead of silently jumping to the single
  // best match, since near-identical correlation scores can come from very
  // different-looking overlay positions.
  const [alignCandidates, setAlignCandidates] = useState<AlignCandidate[]>([]);

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
  //
  // A second repeat (2 copies chained) was tried, but the resulting data
  // range stretched years past any reasonable view (into the 2030s), which
  // made fitContent() zoom out so far the real candlestick series became
  // invisible and the overlay looked "detached" from it. One copy is enough
  // for a useful projection without breaking the default view.
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
        rawIndex: i, // pass down so FractalChart can place the scale handles at start/end
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

  const handleMove = React.useCallback((dt: number, dp: number) => {
    setTimeOffset(prev => prev + dt);
    setPriceOffset(prev => prev + dp);
  }, []);

  // Horizontal drag -> time-axis (period) ratio, vertical drag -> price-axis
  // ratio, decoupled per axis. Both scale handles (start & end) call this
  // same handler, so they always share one global ratio and stay visually
  // pinned to the curve's actual start/end instead of drifting apart.
  const handleScale = React.useCallback((dScaleT: number, dScaleP: number) => {
    setTimeScale(prev => Math.max(0.1, prev + dScaleT));
    setPriceScale(prev => Math.max(0.1, prev + dScaleP));
  }, []);

  // Searches (timeOffset, timeScale) combinations against the single historical
  // fractal cycle (the future-projected repeat has no ground truth to correlate
  // against) and picks whichever alignment maximizes Pearson correlation with
  // the real price series. Price scale/offset don't affect correlation (it's
  // affine-invariant), so those are fit separately via OLS on the winning window.
  //
  // Both searches are bounded to a modest range around the CURRENT
  // time/price scale (not searched from scratch) so "auto" fine-tunes the
  // existing overlay instead of jumping to a wildly different ratio: width
  // (time) stays within +-15%, height (price) within +-10%.
  const TIME_SCALE_SEARCH_RANGE = 0.15;
  const PRICE_SCALE_SEARCH_RANGE = 0.10;

  const MIN_CANDIDATE_OFFSET_GAP = 20; // days apart, so the 5 shown aren't near-duplicates
  const CANDIDATE_COUNT = 5;

  const handleAutoAlign = React.useCallback(() => {
    if (!currentData.length || !fractalRawData.length) {
      setAlignCandidates([]);
      return;
    }

    const pivotIdx = fractalRawData.length;
    const minScale = timeScale * (1 - TIME_SCALE_SEARCH_RANGE);
    const maxScale = timeScale * (1 + TIME_SCALE_SEARCH_RANGE);
    const SCALE_STEPS = 30;
    const scaleCandidates = Array.from(
      { length: SCALE_STEPS + 1 },
      (_, i) => minScale + (i * (maxScale - minScale)) / SCALE_STEPS
    );

    // A short overlap window (the old floor was just 30 days) can score a
    // spuriously high correlation on a coincidental sliver, while most of
    // the fractal pattern lands outside the real data entirely — that's
    // what "detaches" the overlay from the candlesticks once applied.
    // Requiring most of the historical cycle to actually overlap keeps
    // candidates to alignments that are substantively, not just locally,
    // similar.
    const MIN_OVERLAP_RATIO = 0.5;
    const minOverlapDays = Math.floor(fractalRawData.length * MIN_OVERLAP_RATIO);

    const scored: { scale: number; offset: number; corr: number }[] = [];
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
        if (n < minOverlapDays) continue;
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        if (denominator === 0) continue;
        scored.push({ scale, offset, corr: numerator / denominator });
      }
    }

    if (!scored.length) {
      setAlignCandidates([]);
      return;
    }
    scored.sort((a, b) => b.corr - a.corr);

    // Greedily take the best-scoring candidates, skipping any whose offset is
    // too close to one already picked — otherwise the top 5 are all the same
    // alignment shifted by a day or two.
    const picked: typeof scored = [];
    for (const cand of scored) {
      if (picked.length >= CANDIDATE_COUNT) break;
      if (picked.every(p => Math.abs(p.offset - cand.offset) >= MIN_CANDIDATE_OFFSET_GAP)) {
        picked.push(cand);
      }
    }

    // Fit (and clamp, same +-10% rule as before) a price scale/offset for
    // each picked candidate so every option is ready to apply immediately.
    const withPriceFit: AlignCandidate[] = picked.map(({ scale, offset, corr }) => {
      const fractalWindow: number[] = [];
      const currentWindow: number[] = [];
      for (let i = 0; i < fractalRawData.length; i++) {
        const targetIndex = Math.round(pivotIdx + (i - pivotIdx) * scale + offset);
        if (targetIndex < 0 || targetIndex >= currentData.length) continue;
        fractalWindow.push(fractalRawData[i].close);
        currentWindow.push(currentData[targetIndex].close);
      }
      const { slope, intercept } = linearRegression(fractalWindow, currentWindow);

      const minPriceScale = priceScale * (1 - PRICE_SCALE_SEARCH_RANGE);
      const maxPriceScale = priceScale * (1 + PRICE_SCALE_SEARCH_RANGE);
      const clampedSlope = Math.min(Math.max(slope, minPriceScale), maxPriceScale);
      let clampedIntercept = intercept;
      if (clampedSlope !== slope && fractalWindow.length > 0) {
        const meanX = fractalWindow.reduce((a, b) => a + b, 0) / fractalWindow.length;
        const meanY = currentWindow.reduce((a, b) => a + b, 0) / currentWindow.length;
        clampedIntercept = meanY - clampedSlope * meanX;
      }

      return { scale, offset, corr, priceScale: clampedSlope, priceOffset: clampedIntercept };
    });

    setAlignCandidates(withPriceFit);
  }, [currentData, fractalRawData, timeScale, priceScale]);

  const applyAlignCandidate = React.useCallback((candidate: AlignCandidate) => {
    setTimeScale(candidate.scale);
    setTimeOffset(candidate.offset);
    setPriceScale(candidate.priceScale);
    setPriceOffset(candidate.priceOffset);
    setAlignCandidates([]);
  }, []);

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

  // The two green "scale" handles sit at the start and end of the base cycle
  // (rawIndex space); both drive the same global timeScale/priceScale.
  const scaleHandleRawIndices = fractalRawData.length > 0 ? [0, fractalRawData.length - 1] : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          MSTR 사이클 프랙탈 분석
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          현재 주가 흐름과 과거 비트코인/MSTR 불장 사이클의 패턴을 오버레이하여 비교합니다.
          파란 포인트로 전체 위치를 이동하고, 초록 포인트(시작/끝)를 좌우로 드래그하면 기간 비율, 위아래로 드래그하면 가격 비율이 조정됩니다. 두 초록 포인트는 항상 같은 비율을 공유합니다.
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
            onClick={handleAutoAlign}
            className="text-xs font-medium px-2 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
            title="원본과 가장 유사한 정렬 후보 5개를 찾습니다"
          >
            자동 정렬
          </button>
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

        {alignCandidates.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">후보를 선택하세요 (유사도 높은 순):</span>
            {alignCandidates.map((candidate, idx) => (
              <button
                key={`${candidate.scale}-${candidate.offset}`}
                type="button"
                onClick={() => applyAlignCandidate(candidate)}
                className="text-xs font-medium px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                #{idx + 1} 유사도 {(candidate.corr * 100).toFixed(1)}%
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAlignCandidates([])}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1"
            >
              닫기
            </button>
          </div>
        )}

        <FractalChart
          ref={fractalChartRef}
          currentData={currentData}
          fractalData={fractalData}
          scaleHandleRawIndices={scaleHandleRawIndices}
          onMove={handleMove}
          onScale={handleScale}
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
