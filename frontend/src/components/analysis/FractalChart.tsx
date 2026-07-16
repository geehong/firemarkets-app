import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, Time, CandlestickSeries, LineSeries } from 'lightweight-charts';

interface FractalChartProps {
  currentData: any[];
  fractalData: any[];
  onTransformUpdate?: (dt: number, dp: number, dScaleT: number, dScaleP: number) => void;
}

export default function FractalChart({ currentData, fractalData, onTransformUpdate }: FractalChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const currentSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const fractalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [anchors, setAnchors] = useState<{ x: number, y: number, type: 'move' | 'scale', index: number }[]>([]);

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
      // Shared right price scale so it overlays directly on price
    });
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
    const pts: { x: number, y: number, type: 'move' | 'scale', index: number }[] = [];

    // Find center and end points of the fractal data
    const centerIdx = Math.floor(fractalData.length / 2);
    const endIdx = fractalData.length - 1;

    const centerPoint = fractalData[centerIdx];
    const endPoint = fractalData[endIdx];

    if (centerPoint) {
      const logical = centerPoint.logicalIndex;
      const x = chart.timeScale().logicalToCoordinate(logical as any);
      const y = fSeries.priceToCoordinate(centerPoint.close);
      
      const safeX = x !== null ? x : (chartContainerRef.current?.clientWidth || 800) / 2;
      const safeY = y !== null ? y : 200;
      pts.push({ x: safeX, y: safeY, type: 'move', index: 0 });
    }

    if (endPoint) {
      const logical = endPoint.logicalIndex;
      const x = chart.timeScale().logicalToCoordinate(logical as any);
      const y = fSeries.priceToCoordinate(endPoint.close);
      
      const safeX = x !== null ? x : (chartContainerRef.current?.clientWidth || 800) - 100;
      const safeY = y !== null ? y : 200;
      pts.push({ x: safeX, y: safeY, type: 'scale', index: 1 });
    }

    setAnchors(pts);
  }, [fractalData]);

  // Update data when props change
  useEffect(() => {
    if (currentSeriesRef.current && currentData.length > 0) {
      const sortedCurrent = [...currentData].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      currentSeriesRef.current.setData(sortedCurrent as any);
    }
    if (fractalSeriesRef.current && fractalData.length > 0) {
      const sortedFractal = [...fractalData].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      const lineData = sortedFractal.map(d => ({ time: d.time as Time, value: d.close }));
      fractalSeriesRef.current.setData(lineData as any);
    }
    
    // Ensure all data is visible so anchors aren't rendered off-screen
    if (chartRef.current && currentData.length > 0 && fractalData.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
    
    const timer = setTimeout(updateAnchorsPosition, 200);
    return () => clearTimeout(timer);
  }, [currentData, fractalData, updateAnchorsPosition]);

  const handleDrag = (e: React.MouseEvent, type: 'move' | 'scale') => {
    e.preventDefault();
    if (!chartContainerRef.current || !chartRef.current || !fractalSeriesRef.current || !onTransformUpdate) return;
    
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
      
      const logical = chart.timeScale().coordinateToLogical(x);
      const price = fSeries.coordinateToPrice(y);

      if (type === 'move') {
        if (logical !== null && price !== null && lastLogical !== null && lastPrice !== null) {
          const dt = logical - lastLogical;
          const dp = price - lastPrice;
          onTransformUpdate(dt, dp, 0, 0);
          lastLogical = logical;
          lastPrice = price;
        }
      } else if (type === 'scale') {
        const dx = x - lastX;
        const dy = y - lastY;
        // Adjust sensitivity for scaling
        const dScaleT = dx * 0.005;
        const dScaleP = -dy * 0.005;
        onTransformUpdate(0, 0, dScaleT, dScaleP);
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

  return (
    <div className="relative w-full h-[800px] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      <div ref={chartContainerRef} className="absolute inset-0" />
      
      {/* Anchor Point Handles */}
      {anchors.map((anchor, i) => (
        <div
          key={`anchor-${anchor.index}`}
          onMouseDown={(e) => handleDrag(e, anchor.type)}
          className={`absolute w-8 h-8 rounded-full cursor-grab active:cursor-grabbing shadow-[0_0_15px_rgba(0,0,0,0.5)] border-2 border-white hover:scale-110 transition-transform z-50 flex items-center justify-center -ml-4 -mt-4
            ${anchor.type === 'move' ? 'bg-blue-600' : 'bg-green-600'}`}
          style={{
            left: `${anchor.x}px`,
            top: `${anchor.y}px`,
          }}
          title={anchor.type === 'move' ? "이동 (상하좌우)" : "크기 조절 (상하좌우 확대/축소)"}
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
