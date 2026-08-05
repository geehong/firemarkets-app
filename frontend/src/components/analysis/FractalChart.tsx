import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createChart, IChartApi, ISeriesApi, Time, CandlestickSeries, LineSeries, PriceScaleMode } from 'lightweight-charts';

interface FractalChartProps {
  currentData: any[];
  fractalData: any[];
  // rawIndex of each shape-control point (start/middle/end of the base
  // cycle) the fractal's shape gets pinned to. One drag handle is rendered
  // per entry.
  anchorRawIndices?: number[];
  onMove?: (dt: number, dp: number) => void;
  onAnchorDrag?: (rawIndex: number, dt: number, dp: number) => void;
  onLogScaleChange?: (isLogScale: boolean) => void;
}

export interface FractalChartHandle {
  toggleLogScale: () => void;
}

function FractalChart({ currentData, fractalData, anchorRawIndices, onMove, onAnchorDrag, onLogScaleChange }: FractalChartProps, ref: React.Ref<FractalChartHandle>) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const currentSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const fractalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [anchors, setAnchors] = useState<{ x: number, y: number, type: 'move' | 'anchor', rawIndex: number }[]>([]);
  // Purely a rendering toggle for the y-axis (log vs linear price scale).
  // Doesn't touch the underlying data or any of the drag/scale/offset state,
  // so every existing setting/interaction keeps working the same way.
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

    const fractalSeries = chart.addSeries(LineSeries, {
      color: 'rgba(128, 128, 128, 0.8)', // Gray overlay
      lineWidth: 2,
      crosshairMarkerVisible: false,
      // Independent overlay price scale so scaling/moving the fractal line
      // never rescales the candlestick series' price axis.
      priceScaleId: 'fractal-overlay',
    });
    fractalSeriesRef.current = fractalSeries;
    chart.priceScale('fractal-overlay').applyOptions({
      visible: false,
      scaleMargins: { top: 0.05, bottom: 0.05 },
    });

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
    const pts: { x: number, y: number, type: 'move' | 'anchor', rawIndex: number }[] = [];

    // The container clips overflow, so a handle dragged past its edge would
    // otherwise become invisible instead of staying reachable. Clamp to the
    // container bounds (minus the handle's own half-size, ~16px, plus a
    // little breathing room) so it's always visible and grabbable.
    const containerWidth = chartContainerRef.current?.clientWidth || 800;
    const containerHeight = chartContainerRef.current?.clientHeight || 520;
    const ANCHOR_MARGIN = 20;
    const clampX = (val: number) => Math.min(Math.max(val, ANCHOR_MARGIN), containerWidth - ANCHOR_MARGIN);
    const clampY = (val: number) => Math.min(Math.max(val, ANCHOR_MARGIN), containerHeight - ANCHOR_MARGIN);

    const toScreenPoint = (point: any) => {
      const logical = point.logicalIndex;
      const x = chart.timeScale().logicalToCoordinate(logical as any);
      const y = fSeries.priceToCoordinate(point.close);
      return { x: x !== null ? x : containerWidth / 2, y: y !== null ? y : 200 };
    };

    // Blue "move" handle: plain translation, pinned to the fractal's center point.
    const centerPoint = fractalData[Math.floor(fractalData.length / 2)];
    if (centerPoint) {
      const { x, y } = toScreenPoint(centerPoint);
      pts.push({ x: clampX(x), y: clampY(y), type: 'move', rawIndex: -1 });
    }

    // Green "anchor" handles: one per auto-detected pivot (peak/trough).
    for (const rawIndex of anchorRawIndices || []) {
      const point = fractalData.find((p) => p.rawIndex === rawIndex);
      if (!point) continue;
      const { x, y } = toScreenPoint(point);
      pts.push({ x: clampX(x), y: clampY(y), type: 'anchor', rawIndex });
    }

    setAnchors(pts);
  }, [fractalData, anchorRawIndices]);

  // Helper to remove duplicate dates which crash Lightweight Charts
  const filterUniqueTimes = (arr: any[]) => {
    const unique = [];
    let lastTime = '';
    for (const item of arr) {
      if (item.time !== lastTime) {
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
    
    // Frame the real (current) data plus a bounded future window, rather
    // than fitContent()-ing to the full fractal range. The fractal overlay
    // can span years further into the future than the real series (e.g.
    // once it's dragged/scaled out), and fitContent() zooms out to fit ALL
    // of it — which shrinks the real candlesticks down to near-invisible
    // and makes the overlay look "detached". Scroll/zoom still reaches the
    // rest of the projection; this only sets the default view.
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

  const handleDrag = (e: React.MouseEvent, type: 'move' | 'anchor', rawIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!chartContainerRef.current || !chartRef.current || !fractalSeriesRef.current) return;
    if (type === 'move' && !onMove) return;
    if (type === 'anchor' && !onAnchorDrag) return;

    const chart = chartRef.current;
    const fSeries = fractalSeriesRef.current;
    const fPriceScale = chart.priceScale('fractal-overlay');
    const rect = chartContainerRef.current.getBoundingClientRect();

    // Freeze the fractal's own price scale only while translating (move).
    // A pure move doesn't change the data's value range, so freezing avoids
    // the autoScale-refit feedback loop that made vertical drags feel
    // erratic. An anchor drag DOES change the range on purpose, so autoScale
    // must stay live there or the newly grown/shrunk data clips out of the
    // frozen (stale) bounds and looks like it "disappears".
    if (type === 'move') {
      fPriceScale.applyOptions({ autoScale: false });
    }

    // Dampen sensitivity: a raw 1px-mouse-move = 1 price-unit mapping feels
    // far too fast once the fractal's price range is wide (e.g. after
    // extending it into a projected future leg), since each pixel then
    // covers a large price span.
    const DRAG_SENSITIVITY = 0.35;

    let lastLogical = chart.timeScale().coordinateToLogical(e.clientX - rect.left);
    let lastPrice = fSeries.coordinateToPrice(e.clientY - rect.top);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const x = moveEvent.clientX - rect.left;
      const y = moveEvent.clientY - rect.top;

      const logical = chart.timeScale().coordinateToLogical(x);
      const price = fSeries.coordinateToPrice(y);

      if (logical !== null && price !== null && lastLogical !== null && lastPrice !== null) {
        const dt = (logical - lastLogical) * DRAG_SENSITIVITY;
        const dp = (price - lastPrice) * DRAG_SENSITIVITY;
        if (type === 'move') {
          onMove!(dt, dp);
        } else if (rawIndex !== undefined) {
          onAnchorDrag!(rawIndex, dt, dp);
        }
        lastLogical = logical;
        lastPrice = price;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (type === 'move') {
        fPriceScale.applyOptions({ autoScale: true });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Right-click-and-drag anywhere on the chart pans the fractal overlay only
  // (same 'move' transform as the blue handle) without disturbing the
  // candlestick series or its price scale.
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 2) return; // right mouse button only
    handleDrag(e, 'move');
  };

  // Switch both price scales (candlestick 'right' and the fractal overlay)
  // between log and linear together, so the two series stay visually
  // consistent. This only changes how the existing values are plotted on the
  // y-axis; the anchor transform state and all drag interactions are untouched.
  const toggleLogScale = useCallback(() => {
    if (!chartRef.current) return;
    const next = !isLogScale;
    const nextMode = next ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal;
    chartRef.current.priceScale('right').applyOptions({ mode: nextMode });
    chartRef.current.priceScale('fractal-overlay').applyOptions({ mode: nextMode });
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
          key={anchor.type === 'move' ? 'anchor-move' : `anchor-${anchor.rawIndex}`}
          onMouseDown={(e) => handleDrag(e, anchor.type, anchor.type === 'anchor' ? anchor.rawIndex : undefined)}
          className={`absolute w-8 h-8 rounded-full cursor-grab active:cursor-grabbing shadow-[0_0_15px_rgba(0,0,0,0.5)] border-2 border-white hover:scale-110 transition-transform z-50 flex items-center justify-center -ml-4 -mt-4
            ${anchor.type === 'move' ? 'bg-blue-600' : 'bg-green-600'}`}
          style={{
            left: `${anchor.x}px`,
            top: `${anchor.y}px`,
          }}
          title={anchor.type === 'move' ? "이동 (상하좌우)" : "변곡점 조정 (드래그하면 인접 포인트도 비율적으로 함께 움직임)"}
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
