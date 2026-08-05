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
  // Doesn't touch the underlying data or any of the drag/scale/offset state,
  // so every existing setting/interaction keeps working the same way.
  const [isLogScale, setIsLogScale] = useState(false);
  // Toggling the fractal-overlay price scale's autoScale on/off was tried
  // (both "freeze on load" and "freeze on first drag") and both left the
  // axis in a broken state — the library doesn't appear to reliably keep
  // "whatever range was last computed" when autoScale flips to false;
  // depending on exact timing it can pin the range to a stale or degenerate
  // value, dragging every handle to one edge and hiding the line entirely.
  //
  // The robust fix is to stop fighting autoScale and instead take over what
  // range it computes via autoscaleInfoProvider (a supported hook: it can
  // return a fixed price range instead of the library's own live
  // min/max-of-visible-data calculation). Once frozenPriceRangeRef holds a
  // value, the axis uses exactly that range — computed by us, in plain JS,
  // directly from fractalData — forever, so priceScale/priceOffset edits
  // reliably shift the line instead of being auto-normalized away.
  const frozenPriceRangeRef = useRef<{ minValue: number; maxValue: number } | null>(null);

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
      // Once frozenPriceRangeRef is set (see handleDrag), always report that
      // fixed range instead of the library's own live computation — see the
      // comment on frozenPriceRangeRef above for why.
      autoscaleInfoProvider: (original: () => any) => {
        if (frozenPriceRangeRef.current) {
          return { priceRange: frozenPriceRangeRef.current };
        }
        return original();
      },
    } as any);
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
    const pts: { x: number, y: number, type: 'move' | 'scale', rawIndex: number }[] = [];

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

    // Blue "move" handle: plain translation. Pinned halfway between the two
    // scale handles (not the full mapped array's midpoint, which — since the
    // array covers the base cycle plus its repeated future half — sits right
    // on top of the "end" scale handle and hides it).
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

  const handleDrag = (e: React.MouseEvent, type: 'move' | 'scale') => {
    e.preventDefault();
    e.stopPropagation();
    if (!chartContainerRef.current || !chartRef.current || !fractalSeriesRef.current) return;
    if (type === 'move' && !onMove) return;
    if (type === 'scale' && !onScale) return;

    const chart = chartRef.current;
    const fSeries = fractalSeriesRef.current;
    const rect = chartContainerRef.current.getBoundingClientRect();

    // Freeze the overlay's price range (see frozenPriceRangeRef above) the
    // first time any drag starts, computed directly from the currently
    // displayed fractalData — i.e. whatever's on screen right now, which by
    // this point already reflects the settled, correctly-centered view.
    if (!frozenPriceRangeRef.current) {
      const closes = fractalData.map((p: any) => p.close).filter((v: number) => Number.isFinite(v));
      if (closes.length > 0) {
        const minValue = Math.min(...closes);
        const maxValue = Math.max(...closes);
        frozenPriceRangeRef.current = { minValue, maxValue: maxValue > minValue ? maxValue : minValue + 1 };
      }
    }

    // Dampen move sensitivity: a raw 1px-mouse-move = 1 price-unit mapping
    // feels far too fast once the fractal's price range is wide (e.g. after
    // extending it into a projected future leg), since each pixel then
    // covers a large price span. Scale drags use their own fixed 0.005
    // sensitivity below for the same reason, decoupled per axis: horizontal
    // -> time-axis (period) ratio, vertical -> price-axis ratio.
    const MOVE_SENSITIVITY = 0.35;

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
          const dt = (logical - lastLogical) * MOVE_SENSITIVITY;
          const dp = (price - lastPrice) * MOVE_SENSITIVITY;
          onMove!(dt, dp);
          lastLogical = logical;
          lastPrice = price;
        }
      } else {
        const dx = x - lastX;
        const dy = y - lastY;
        const dScaleT = dx * 0.005;
        const dScaleP = -dy * 0.005;
        onScale!(dScaleT, dScaleP);
        lastX = x;
        lastY = y;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
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
