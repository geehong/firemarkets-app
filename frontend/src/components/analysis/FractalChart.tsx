import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createChart, IChartApi, ISeriesApi, Time, CandlestickSeries, LineSeries, PriceScaleMode } from 'lightweight-charts';

interface FractalChartProps {
  currentData: any[];
  fractalData: any[];
  // rawIndex of each scale-control point (start & end of the base cycle).
  // Both handles drive the same global timeScale/priceScale, so they always
  // stay pinned exactly at the curve's start/end instead of drifting apart.
  scaleHandleRawIndices?: number[];
  onMove?: (dt: number, dp: number) => void;
  onScale?: (dScaleT: number, dScaleP: number) => void;
  onLogScaleChange?: (isLogScale: boolean) => void;
}

export interface FractalChartHandle {
  toggleLogScale: () => void;
}

function FractalChart({ currentData, fractalData, scaleHandleRawIndices, onMove, onScale, onLogScaleChange }: FractalChartProps, ref: React.Ref<FractalChartHandle>) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const currentSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const fractalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [anchors, setAnchors] = useState<{ x: number, y: number, type: 'move' | 'scale', rawIndex: number }[]>([]);
  // Purely a rendering toggle for the y-axis (log vs linear price scale).
  const [isLogScale, setIsLogScale] = useState(false);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: 'rgba(197, 203, 206, 0.5)' },
        horzLines: { color: 'rgba(197, 203, 206, 0.5)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    });
    chartRef.current = chart;

    const currentSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    currentSeriesRef.current = currentSeries;

    // Both candlesticks and fractal line share the primary 'right' price scale.
    // Setting autoscaleInfoProvider: () => null ensures the fractal line overlay
    // never rescales or distorts the main y-axis, allowing priceOffset (up/down)
    // and priceScale (vertical stretch) to move seamlessly on screen.
    const fractalSeries = chart.addSeries(LineSeries, {
      color: 'rgba(128, 128, 128, 0.8)', // Gray overlay
      lineWidth: 2,
      crosshairMarkerVisible: false,
      priceScaleId: 'right',
      autoscaleInfoProvider: () => null,
    } as any);
    fractalSeriesRef.current = fractalSeries;

    const handleTimeRangeChange = () => {
      updateAnchorsPosition();
    };
    chart.timeScale().subscribeVisibleTimeRangeChange(handleTimeRangeChange);

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(handleTimeRangeChange);
      chart.remove();
    };
  }, []);

  const updateAnchorsPosition = useCallback(() => {
    if (!chartRef.current || !fractalSeriesRef.current || fractalData.length === 0) return;

    const chart = chartRef.current;
    const fSeries = fractalSeriesRef.current;
    const pts: { x: number, y: number, type: 'move' | 'scale', rawIndex: number }[] = [];

    const containerWidth = chartContainerRef.current?.clientWidth || 800;
    const containerHeight = chartContainerRef.current?.clientHeight || 520;
    const ANCHOR_MARGIN = 20;
    const clampX = (val: number) => Math.min(Math.max(val, ANCHOR_MARGIN), containerWidth - ANCHOR_MARGIN);
    const clampY = (val: number) => Math.min(Math.max(val, ANCHOR_MARGIN), containerHeight - ANCHOR_MARGIN);

    const toScreenPoint = (point: any) => {
      if (!point || point.close === undefined || point.close === null || !Number.isFinite(point.close)) {
        return { x: containerWidth / 2, y: containerHeight / 2 };
      }
      const logical = point.logicalIndex;
      const rawX = (logical !== undefined && logical !== null) ? chart.timeScale().logicalToCoordinate(logical as any) : null;
      const rawY = fSeries.priceToCoordinate(point.close);

      const x = (rawX !== null && Number.isFinite(rawX)) ? rawX : containerWidth / 2;
      const y = (rawY !== null && Number.isFinite(rawY)) ? rawY : containerHeight / 2;
      return { x, y };
    };

    // Blue "move" handle: plain translation. Pinned halfway between scale handles
    let centerPoint = fractalData[Math.floor(fractalData.length / 2)];
    if (scaleHandleRawIndices && scaleHandleRawIndices.length === 2) {
      const midRaw = Math.floor((scaleHandleRawIndices[0] + scaleHandleRawIndices[1]) / 2);
      centerPoint = fractalData.reduce(
        (closest, p) => (Math.abs(p.rawIndex - midRaw) < Math.abs(closest.rawIndex - midRaw) ? p : closest),
        fractalData[0]
      );
    }
    if (centerPoint) {
      const { x, y } = toScreenPoint(centerPoint);
      pts.push({ x: clampX(x), y: clampY(y), type: 'move', rawIndex: -1 });
    }

    // Green "scale" handles: one at the base cycle's start, one at its end.
    for (const rawIndex of scaleHandleRawIndices || []) {
      const point = fractalData.find((p) => p.rawIndex === rawIndex);
      if (!point) continue;
      const { x, y } = toScreenPoint(point);
      pts.push({ x: clampX(x), y: clampY(y), type: 'scale', rawIndex });
    }

    setAnchors(pts);
  }, [fractalData, scaleHandleRawIndices]);

  // Helper to remove duplicate dates which crash Lightweight Charts
  const filterUniqueTimes = (arr: any[]) => {
    const unique = [];
    let lastTime = '';
    for (const item of arr) {
      if (item.time && item.time !== lastTime) {
        unique.push(item);
        lastTime = item.time;
      }
    }
    return unique;
  };

  // Update data when props change
  useEffect(() => {
    if (currentSeriesRef.current && currentData.length > 0) {
      const sortedCurrent = [...currentData].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      currentSeriesRef.current.setData(filterUniqueTimes(sortedCurrent) as any);
    }
    if (fractalSeriesRef.current && fractalData.length > 0) {
      const sortedFractal = [...fractalData].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      const lineData = sortedFractal.map(d => ({ time: d.time as Time, value: d.close }));
      fractalSeriesRef.current.setData(filterUniqueTimes(lineData) as any);
    }

    if (chartRef.current && currentData.length > 0) {
      const DEFAULT_FUTURE_VIEW_DAYS = 400;
      const firstTime = currentData[0].time as Time;
      const lastRealDate = new Date(currentData[currentData.length - 1].time);
      const futureDate = new Date(lastRealDate);
      futureDate.setDate(futureDate.getDate() + DEFAULT_FUTURE_VIEW_DAYS);
      chartRef.current.timeScale().setVisibleRange({
        from: firstTime,
        to: futureDate.toISOString().split('T')[0] as Time,
      });
    }

    const timer = setTimeout(updateAnchorsPosition, 200);
    return () => clearTimeout(timer);
  }, [currentData, fractalData, updateAnchorsPosition]);

  const handleDrag = (e: React.MouseEvent, type: 'move' | 'scale') => {
    e.preventDefault();
    e.stopPropagation();
    if (!chartContainerRef.current || !chartRef.current || !fractalSeriesRef.current) return;
    if (type === 'move' && !onMove) return;
    if (type === 'scale' && !onScale) return;

    const chart = chartRef.current;
    const fSeries = fractalSeriesRef.current;
    const rect = chartContainerRef.current.getBoundingClientRect();

    let lastX = e.clientX - rect.left;
    let lastY = e.clientY - rect.top;

    let lastLogical = chart.timeScale().coordinateToLogical(lastX);
    let lastPrice = fSeries.coordinateToPrice(lastY);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const x = moveEvent.clientX - rect.left;
      const y = moveEvent.clientY - rect.top;

      if (type === 'move') {
        const logical = chart.timeScale().coordinateToLogical(x);
        const price = fSeries.coordinateToPrice(y);
        if (logical !== null && price !== null && lastLogical !== null && lastPrice !== null) {
          const dt = logical - lastLogical;
          const dp = price - lastPrice;
          onMove!(dt, dp);
          lastLogical = logical;
          lastPrice = price;
        } else {
          lastLogical = logical !== null ? logical : lastLogical;
          lastPrice = price !== null ? price : lastPrice;
        }
      } else {
        const dx = x - lastX;
        const dy = y - lastY;

        // Multiplicative (relative) scaling factors for symmetric grow & shrink:
        // factorT: horizontal drag factor (dx > 0 expands duration, dx < 0 shrinks)
        // factorP: vertical drag factor (-dy > 0 expands price height, -dy < 0 shrinks)
        const factorT = Math.exp(dx * 0.002);
        const factorP = Math.exp(-dy * 0.002);

        onScale!(factorT, factorP);
        lastX = x;
        lastY = y;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      updateAnchorsPosition();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 2) return; // right mouse button only
    handleDrag(e, 'move');
  };

  const toggleLogScale = useCallback(() => {
    if (!chartRef.current) return;
    const next = !isLogScale;
    const nextMode = next ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal;
    chartRef.current.priceScale('right').applyOptions({ mode: nextMode });
    setIsLogScale(next);
    onLogScaleChange?.(next);
    setTimeout(updateAnchorsPosition, 50);
  }, [isLogScale, onLogScaleChange, updateAnchorsPosition]);

  useImperativeHandle(ref, () => ({ toggleLogScale }), [toggleLogScale]);

  return (
    <div
      className="relative w-full h-[520px] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-900"
      onMouseDown={handleContainerMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={chartContainerRef} className="absolute inset-0" />

      {/* Anchor Point Handles */}
      {anchors.map((anchor) => (
        <div
          key={anchor.type === 'move' ? 'anchor-move' : `scale-${anchor.rawIndex}`}
          onMouseDown={(e) => handleDrag(e, anchor.type)}
          className={`absolute w-8 h-8 rounded-full cursor-grab active:cursor-grabbing shadow-[0_0_15px_rgba(0,0,0,0.5)] border-2 border-white hover:scale-110 transition-transform z-50 flex items-center justify-center -ml-4 -mt-4
            ${anchor.type === 'move' ? 'bg-blue-600' : 'bg-green-600'}`}
          style={{
            left: `${anchor.x}px`,
            top: `${anchor.y}px`,
          }}
          title={anchor.type === 'move' ? "이동 (상하좌우)" : "크기 조절 (좌우: 기간 비율 / 상하: 가격 비율)"}
        >
          {anchor.type === 'move' ? (
            <span className="text-white text-lg leading-none font-bold">✥</span>
          ) : (
            <span className="text-white text-lg leading-none font-bold">⤡</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default forwardRef(FractalChart);
