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

// A drag anchor pins one raw fractal point (rawIndex, into
// extendedFractalRawData) to a target position (targetLogical on the real
// time axis, targetPrice on the real price axis). The segments between
// consecutive anchors are mapped with their own affine (scale+offset)
// transform, so the actual historical price shape is preserved between
// anchors instead of being flattened into straight lines.
interface WarpAnchor {
  rawIndex: number;
  targetLogical: number;
  targetPrice: number;
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
  // anchors: per-pivot-point targets from the green "anchor" handles (see
  // WarpAnchor above) driving the piecewise-affine shape of the overlay.
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [priceOffset, setPriceOffset] = useState<number>(0);
  const [anchors, setAnchors] = useState<WarpAnchor[]>([]);

  // Chart y-axis log/linear toggle, rendered next to the chart title (not
  // overlapping the price axis labels the way an in-chart button would).
  const fractalChartRef = useRef<FractalChartHandle>(null);
  const [isLogScale, setIsLogScale] = useState(false);

  // Auto-align presents a shortlist instead of silently jumping to the single
  // best match, since near-identical correlation scores can come from very
  // different-looking overlay positions.
  const [alignCandidates, setAlignCandidates] = useState<AlignCandidate[]>([]);

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

  // Initial anchor placement once data is loaded: exactly 2 fixed anchors —
  // start / end — placed only on the base cycle (fractalRawData), never on
  // its repeated continuation (the second half of extendedFractalRawData).
  // That repeated half is purely a future extrapolation of the base cycle's
  // shape, not something meant to be independently reshaped, so it has no
  // anchors of its own: it just inherits the single start-to-end segment's
  // affine scale (see fractalData below).
  // Each anchor's initial target reproduces the old single-scale default
  // view (identity time mapping, i.e. timeScale=1, plus a price scale that
  // roughly lines up "today" with the real series).
  useEffect(() => {
    if (anchors.length === 0 && currentData.length > 0 && extendedFractalRawData.length > 0 && fractalRawData.length > 0) {
      const baseIndices = [0, fractalRawData.length - 1];

      const defaultTimeOffset = Math.max(0, currentData.length - fractalRawData.length);
      const currStartPrice = currentData[defaultTimeOffset]?.close || 100;
      const pastStartPrice = fractalRawData[0]?.close || 10;
      const initialPriceScale = currStartPrice / pastStartPrice;

      setTimeOffset(defaultTimeOffset);
      setAnchors(
        baseIndices.map((rawIndex) => ({
          rawIndex,
          targetLogical: rawIndex, // identity time mapping; timeOffset above provides the shift
          targetPrice: extendedFractalRawData[rawIndex].close * initialPriceScale,
        }))
      );
    }
  }, [currentData, extendedFractalRawData, fractalRawData, anchors.length]);

  // Dynamically map fractal data onto current data's time axis, extending into the future.
  // Between consecutive anchors, each segment gets its own affine (scale+offset)
  // transform solved so both anchor endpoints land exactly on their targets,
  // while everything in between keeps the real historical wiggle (it's an
  // affine map of the actual data, not a straight line connecting the pivots).
  const fractalData = React.useMemo(() => {
    if (!currentData.length || !extendedFractalRawData.length || anchors.length < 2) return [];

    const sortedAnchors = [...anchors].sort((a, b) => a.rawIndex - b.rawIndex);

    const segments = [];
    for (let k = 0; k < sortedAnchors.length - 1; k++) {
      const a = sortedAnchors[k];
      const b = sortedAnchors[k + 1];
      const rawSpan = b.rawIndex - a.rawIndex;
      const segTimeScale = rawSpan !== 0 ? (b.targetLogical - a.targetLogical) / rawSpan : 1;

      const rawCloseA = extendedFractalRawData[a.rawIndex].close;
      const rawCloseB = extendedFractalRawData[b.rawIndex].close;
      const rawCloseSpan = rawCloseB - rawCloseA;
      const segPriceScale = rawCloseSpan !== 0 ? (b.targetPrice - a.targetPrice) / rawCloseSpan : 1;
      const segPriceOffset = a.targetPrice - rawCloseA * segPriceScale;

      segments.push({ startRaw: a.rawIndex, timeBase: a.targetLogical, segTimeScale, segPriceScale, segPriceOffset });
    }

    const mapped = [];
    const lastCurrentDate = new Date(currentData[currentData.length - 1].time);

    for (let i = 0; i < extendedFractalRawData.length; i++) {
      const pastPoint = extendedFractalRawData[i];

      // Pick the segment i falls in; for i before the first anchor or past
      // the last one, this naturally keeps the nearest edge segment, whose
      // affine formula extrapolates linearly beyond its own anchors.
      let seg = segments[0];
      for (const s of segments) {
        if (i >= s.startRaw) seg = s;
        else break;
      }

      const targetLogical = seg.timeBase + (i - seg.startRaw) * seg.segTimeScale;
      const targetIndex = Math.round(targetLogical + timeOffset);

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

      const toMapped = (v: number) => v * seg.segPriceScale + seg.segPriceOffset + priceOffset;
      const mappedPoint = {
        ...pastPoint,
        open: toMapped(pastPoint.open),
        high: toMapped(pastPoint.high),
        low: toMapped(pastPoint.low),
        close: toMapped(pastPoint.close),
        time: targetTimeStr,
        originalTime: pastPoint.time,
        logicalIndex: targetIndex, // pass down for easy anchor positioning
        rawIndex: i, // pass down so FractalChart can place anchor handles
      };

      // Ensure strictly increasing unique times for Lightweight Charts
      if (mapped.length > 0 && mapped[mapped.length - 1].time === targetTimeStr) {
        // Duplicate time (a segment compressed below 1 day/point), overwrite with the latest point
        mapped[mapped.length - 1] = mappedPoint;
      } else {
        mapped.push(mappedPoint);
      }
    }
    return mapped;
  }, [currentData, extendedFractalRawData, anchors, timeOffset, priceOffset]);

  const handleMove = React.useCallback((dt: number, dp: number) => {
    setTimeOffset(prev => prev + dt);
    setPriceOffset(prev => prev + dp);
  }, []);

  // Cascading, log-decayed proportional falloff: the dragged anchor gets the
  // full delta, and every other anchor gets a fraction that shrinks slowly
  // (logarithmically) with how many anchors away it is — near neighbors move
  // almost as much, far ones barely move — so the whole curve deforms
  // smoothly instead of only bending the two segments touching the dragged
  // point. targetLogical is then clamped to stay strictly increasing so
  // segments never invert into a negative/zero span.
  const handleAnchorDrag = React.useCallback((rawIndex: number, dt: number, dp: number) => {
    setAnchors(prev => {
      const sorted = [...prev].sort((a, b) => a.rawIndex - b.rawIndex);
      const k = sorted.findIndex(a => a.rawIndex === rawIndex);
      if (k === -1) return prev;

      const next = sorted.map((a, j) => {
        const distance = Math.abs(j - k);
        const weight = 1 / (1 + Math.log(1 + distance));
        return {
          ...a,
          targetLogical: a.targetLogical + dt * weight,
          targetPrice: a.targetPrice + dp * weight,
        };
      });

      for (let i = 1; i < next.length; i++) {
        if (next[i].targetLogical <= next[i - 1].targetLogical) {
          next[i].targetLogical = next[i - 1].targetLogical + 1;
        }
      }
      return next;
    });
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
    if (!currentData.length || !fractalRawData.length || anchors.length < 2) {
      setAlignCandidates([]);
      return;
    }

    const pivotIdx = fractalRawData.length;

    // The search center used to be the single global timeScale/priceScale
    // state. Anchors replaced that with a piecewise warp, so derive an
    // equivalent "effective" global scale from the outermost anchors to use
    // as the search center instead — same idea, just read off the current
    // shape rather than a dedicated state variable.
    const sortedAnchors = [...anchors].sort((a, b) => a.rawIndex - b.rawIndex);
    const firstAnchor = sortedAnchors[0];
    const lastAnchor = sortedAnchors[sortedAnchors.length - 1];
    const rawSpan = lastAnchor.rawIndex - firstAnchor.rawIndex;
    const effectiveTimeScale = rawSpan !== 0
      ? (lastAnchor.targetLogical - firstAnchor.targetLogical) / rawSpan
      : 1;
    const rawCloseFirst = extendedFractalRawData[firstAnchor.rawIndex].close;
    const rawCloseLast = extendedFractalRawData[lastAnchor.rawIndex].close;
    const rawCloseSpan = rawCloseLast - rawCloseFirst;
    const effectivePriceScale = rawCloseSpan !== 0
      ? (lastAnchor.targetPrice - firstAnchor.targetPrice) / rawCloseSpan
      : 1;

    const minScale = effectiveTimeScale * (1 - TIME_SCALE_SEARCH_RANGE);
    const maxScale = effectiveTimeScale * (1 + TIME_SCALE_SEARCH_RANGE);
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

      const minPriceScale = effectivePriceScale * (1 - PRICE_SCALE_SEARCH_RANGE);
      const maxPriceScale = effectivePriceScale * (1 + PRICE_SCALE_SEARCH_RANGE);
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
  }, [currentData, fractalRawData, extendedFractalRawData, anchors]);

  // Applying a candidate resets every anchor back onto a single global
  // (scale, offset) affine — i.e. it discards any manual per-anchor cascade
  // edits and starts fresh from the auto-aligned shape, same as picking a
  // candidate did under the old single-scale model. timeOffset carries the
  // candidate's time offset (added on top of each anchor's targetLogical,
  // same as the drag flow); priceOffset resets to 0 since it's already baked
  // into each anchor's targetPrice.
  const applyAlignCandidate = React.useCallback((candidate: AlignCandidate) => {
    const pivotIdx = fractalRawData.length;
    setAnchors(prev => prev.map(a => ({
      rawIndex: a.rawIndex,
      targetLogical: pivotIdx + (a.rawIndex - pivotIdx) * candidate.scale,
      targetPrice: extendedFractalRawData[a.rawIndex].close * candidate.priceScale + candidate.priceOffset,
    })));
    setTimeOffset(candidate.offset);
    setPriceOffset(0);
    setAlignCandidates([]);
  }, [fractalRawData, extendedFractalRawData]);

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
          파란 포인트로 전체 위치를 이동하고, 초록 포인트(주요 변곡점)를 드래그하면 인접한 변곡점들도 비율적으로 함께 움직이며 곡선 모양을 조정할 수 있습니다.
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
          anchorRawIndices={anchors.map(a => a.rawIndex)}
          onMove={handleMove}
          onAnchorDrag={handleAnchorDrag}
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
