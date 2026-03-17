"use client"

import React, { useEffect, useRef, useState, useMemo } from "react"
import {
  createChart,
  LineSeries,
  CandlestickSeries,
  ColorType,
  LineStyle,
  Time,
} from "lightweight-charts"
import { useIntradayOhlcv, useDelayedQuoteLast } from "@/hooks/data/useRealtime"
import { useRealtimePrices } from "@/hooks/data/useSocket"
import { useAssetDetail } from "@/hooks/assets/useAssets"
import { Link } from '@/i18n/navigation';

// ==========================================
// [차트 설정] 기본 봉 크기 설정 (코드 상단에서 직접 변경 가능)
// ==========================================
export const DEFAULT_CANDLE_INTERVAL = "15m" // 예: 1m, 5m, 15m, 1h, 1d 등

// 뉴욕 시간(ET) 파츠 추출을 위한 헬퍼
const getNYParts = (date: Date) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false, weekday: 'short'
    }).formatToParts(date);
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    return {
      y: parseInt(p.year),
      m: parseInt(p.month),
      d: parseInt(p.day),
      h: parseInt(p.hour),
      min: parseInt(p.minute),
      dow: p.weekday // Sun, Mon...
    };
  } catch (e) {
    // Fallback if Intl fails
    return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate(), h: date.getUTCHours(), min: date.getUTCMinutes(), dow: 'Mon' };
  }
};

// 세션 시작 시각을UTC 초 단위로 변환해주는 유틸리티 (미국 주식 서머타임 자동 대응)
const getDynamicSessionStartUTC = (sessionStartTime: string, isUSMarket: boolean, baseDate: Date = new Date(), is24h: boolean = false) => {
  if (is24h) {
    // 24시간 시장(코인, 원자재 등)은 당일 00:00 UTC(KST 09:00) 또는 세션 시작 시각을 기준으로 합니다.
    const [sHour, sMin] = sessionStartTime.split(":").map(Number);
    // 기본적으로 KST 09:00 시작이라면 UTC 00:00입니다. (KST=UTC+9)
    const target = new Date(baseDate);
    target.setUTCHours(sHour - 9, sMin, 0, 0); 
    if (target.getTime() > baseDate.getTime()) {
      target.setUTCDate(target.getUTCDate() - 1);
    }
    return target.getTime() / 1000;
  }

  const ny = getNYParts(baseDate);
  let targetDate = new Date(baseDate);

  if (isUSMarket) {
    // 미국 주식 개장: 09:30 AM ET
    const sessionStartNum = 930;
    const currentNum = ny.h * 100 + ny.min;

    // 주말(토, 일)이면 금요일로 이동
    if (ny.dow === 'Sun') {
      targetDate.setDate(targetDate.getDate() - 2);
    } else if (ny.dow === 'Sat') {
      targetDate.setDate(targetDate.getDate() - 1);
    } else if (currentNum < sessionStartNum) {
      // 주중인데 아직 개장 전이면 전장으로 이동 (월요일이면 금요일로)
      if (ny.dow === 'Mon') {
        targetDate.setDate(targetDate.getDate() - 3);
      } else {
        targetDate.setDate(targetDate.getDate() - 1);
      }
    }

    // 대상 날짜를 다시 NY 파츠로 추출 (월/일/년도가 바뀌었을 수 있음)
    const tny = getNYParts(targetDate);
    
    // 해당 날짜의 09:30 ET가 UTC로 몇 시인지 판별 (DST 확인)
    const isDST = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      timeZoneName: 'short'
    }).format(targetDate).includes('DT');
    
    const utcHours = isDST ? 13 : 14;
    return Date.UTC(tny.y, tny.m - 1, tny.d, utcHours, 30, 0, 0) / 1000;
  } else {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(targetDate);
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    
    const [sHour, sMin] = sessionStartTime.split(":").map(Number);
    const sessionUTC = Date.UTC(parseInt(p.year), parseInt(p.month) - 1, parseInt(p.day), sHour - 9, sMin, 0, 0) / 1000;
    const baseUTC = baseDate.getTime() / 1000;
    
    if (baseUTC < sessionUTC) {
      return sessionUTC - 86400; // 하루 전 세션
    }
    return sessionUTC;
  }
}

// 미국 정규장 시간인지 확인하는 간단한 유틸리티
const isUSRegularMarketHours = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short'
  });
  const parts = formatter.formatToParts(now);
  const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
  
  const day = partMap.weekday;
  const hour = parseInt(partMap.hour);
  const minute = parseInt(partMap.minute);
  
  if (day === 'Sat' || day === 'Sun') return false;
  
  const timeNum = hour * 100 + minute;
  return timeNum >= 930 && timeNum <= 1600;
};

export type LiveChartMode = "session" | "rolling"

interface CandlePoint {
  time: Time
  open: number
  high: number
  low: number
  close: number
}

interface LiveCandleChartProps {
  assetIdentifier: string
  title?: string
  mode?: LiveChartMode
  sessionStartTime?: string // HH:mm format
  lookbackHours?: number
  dataInterval?: string 
  chartType?: "candle" | "line"
  height?: number | string
  href?: string
}

const LiveCandleChart: React.FC<LiveCandleChartProps> = ({
  assetIdentifier,
  title,
  mode = "rolling",
  sessionStartTime = "09:00",
  lookbackHours = 24,
  dataInterval = DEFAULT_CANDLE_INTERVAL,
  chartType = "candle",
  height = 400,
  href
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<any | null>(null)
  const seriesRef = useRef<any | null>(null)
  const lastCandleRef = useRef<any | null>(null)

  const [currentInterval, setCurrentInterval] = useState(dataInterval)
  const [chartStats, setChartStats] = useState({ first: 0, last: 0, prevClose: 0 })

  const localOffset = useMemo(() => -new Date().getTimezoneOffset() * 60, []);
  const { data: assetDetail } = useAssetDetail(assetIdentifier)
  
  const calcLimit = Math.floor(
    (currentInterval === "1m" ? 1440 : 
     currentInterval === "15m" ? 96 : 
     currentInterval === "1h" ? 24 : 288) * 7
  )
  
  useEffect(() => {
    lastCandleRef.current = null;
    setChartStats({ first: 0, last: 0, prevClose: 0 });
  }, [assetIdentifier, currentInterval]);

  const dynamicRefetchInterval = useMemo(() => {
    let seconds = 300 
    if (currentInterval === "1m") seconds = 60
    else if (currentInterval === "15m") seconds = 900
    else if (currentInterval === "30m") seconds = 1800
    else if (currentInterval === "1h") seconds = 3600
    return seconds * 1000
  }, [currentInterval])

  const ohlcvQuery = useIntradayOhlcv(assetIdentifier, { 
    dataInterval: currentInterval, 
    limit: calcLimit,
    refetchInterval: dynamicRefetchInterval 
  })
  const historyData = ohlcvQuery.data?.data || []
  const { latestPrice } = useRealtimePrices(assetIdentifier)

  const { data: lastQuoteResponse } = useDelayedQuoteLast(
    assetIdentifier,
    { dataInterval: "15m" },
    { enabled: !!assetIdentifier }
  )

  const prevClosePrice = useMemo(() => {
    if (!historyData.length) return null;
    const now = new Date();
    const todayStartUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
    let candidate = null;
    for (let i = historyData.length - 1; i >= 0; i--) {
      const d = historyData[i];
      const tsStr = d.timestamp_utc || d.timestamp || d.time;
      const ts = new Date(tsStr).getTime();
      const price = Number(d.close_price ?? d.close ?? 0);
      if (ts <= todayStartUtc) {
        candidate = price;
        break;
      }
    }
    return candidate;
  }, [historyData]);

  useEffect(() => {
    if (!containerRef.current || chartRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "var(--tw-prose-body, #9CA3AF)",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.08)" },
        horzLines: { color: "rgba(148, 163, 184, 0.08)" },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: dataInterval === "1m" || dataInterval === "1s",
        fixLeftEdge: mode === "session",
        fixRightEdge: false,
        rightOffset: mode === "session" ? 12 : 5,
      },
      rightPriceScale: {
        borderVisible: false,
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      handleScale: {
        axisDoubleClickReset: true,
        mouseWheel: true,
        pinch: true,
      },
    })

    const series = chartType === "candle" 
      ? chart.addSeries(CandlestickSeries, {
          upColor: "#22c55e",
          downColor: "#ef4444",
          borderVisible: false,
          wickUpColor: "#22c55e",
          wickDownColor: "#ef4444",
        })
      : chart.addSeries(LineSeries, {
          color: "#3b82f6",
          lineWidth: 2,
        })

    chartRef.current = chart
    seriesRef.current = series

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: containerRef.current.clientWidth, 
          height: containerRef.current.clientHeight 
        })
      }
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [chartType, currentInterval])

  useEffect(() => {
    if (!seriesRef.current || !historyData.length) return

    let processed: CandlePoint[] = historyData.map((d: any) => {
      const ts = d.timestamp_utc || d.timestamp || d.time;
      return {
        time: ((new Date(ts).getTime() / 1000) + localOffset) as Time,
        open: Number(d.open_price ?? d.open ?? 0),
        high: Number(d.high_price ?? d.high ?? 0),
        low: Number(d.low_price ?? d.low ?? 0),
        close: Number(d.close_price ?? d.close ?? 0),
      };
    })

    const lastHistoryTime = processed.length > 0 ? (processed[processed.length - 1].time as number) : 0;
    if (lastCandleRef.current && (lastCandleRef.current.time as number) > lastHistoryTime) {
      processed.push(lastCandleRef.current);
    }
    processed.sort((a, b) => (a.time as number) - (b.time as number))
    processed = processed.filter((v, i, arr) => i === 0 || v.time !== arr[i - 1].time)

    let isUSMarket = false;
    let is24hMarket = true;
    if (assetDetail) {
      const typeName = (assetDetail.asset_type || assetDetail.asset_type_name || assetDetail.type_name || '').toLowerCase();
      const exchange = (assetDetail.exchange || '').toUpperCase();
      const currency = (assetDetail.currency || '').toUpperCase();
      const symbol = (assetDetail.ticker || assetDetail.symbol || '').toUpperCase();
      
      if (typeName.includes('stock') || typeName.includes('etf')) {
        is24hMarket = false;
        if (currency === 'USD' || exchange === 'NASDAQ' || exchange === 'NYSE' || exchange === 'AMEX') {
          isUSMarket = true;
        }
      } else if (typeName.includes('commodity') || symbol.includes('GC') || symbol.includes('SI')) {
        is24hMarket = true;
        isUSMarket = false;
      }
    }

    const nowTimestamp = (Date.now() / 1000) + localOffset;
    let startTimeSeconds = 0;
    
    if (mode === "session") {
      const referenceDate = historyData.length > 0 
        ? new Date(new Date(historyData[historyData.length - 1].timestamp_utc || historyData[historyData.length - 1].timestamp).getTime())
        : new Date();
        
      startTimeSeconds = getDynamicSessionStartUTC(sessionStartTime, isUSMarket, referenceDate, is24hMarket) + localOffset;
      const sessionDurationSeconds = 23 * 3600;
      let endTimeSeconds = startTimeSeconds + sessionDurationSeconds;

      processed = processed.filter(d => {
        const t = (d.time as number);
        return t >= startTimeSeconds && t <= endTimeSeconds;
      });
    } else {
      let effectiveLookback = lookbackHours
      if (!is24hMarket && lookbackHours < 96) {
        effectiveLookback = 96
      }
      startTimeSeconds = nowTimestamp - (effectiveLookback * 3600)
      processed = processed.filter(d => (d.time as number) >= startTimeSeconds)
    }

    if (processed.length > 0) {
      if (mode === "session") {
        let min = Infinity;
        let max = -Infinity;
        processed.forEach(p => {
          if (p.low < min) min = p.low;
          if (p.high > max) max = p.high;
        });
        
        if (min !== Infinity && max !== -Infinity) {
          const range = max - min;
          const padding = Math.max(range * 0.1, min * 0.01);
          seriesRef.current.applyOptions({
            autoscaleInfoProvider: () => ({
              priceRange: {
                minValue: min - padding,
                maxValue: max + padding,
              },
            }),
          });
        }
      } else {
        let viewMin = Infinity;
        let viewMax = -Infinity;
        processed.forEach(p => {
          if (p.low < viewMin) viewMin = p.low;
          if (p.high > viewMax) viewMax = p.high;
        });
        
        if (viewMin !== Infinity && viewMax !== -Infinity) {
          const range = viewMax - viewMin;
          const padding = range * 0.05;
          seriesRef.current.applyOptions({
            autoscaleInfoProvider: () => ({
              priceRange: {
                minValue: viewMin - padding,
                maxValue: viewMax + padding,
              },
            }),
          });
        }
      }
    }

    if (processed.length > 0) {
      seriesRef.current.setData(processed)
      lastCandleRef.current = processed[processed.length - 1]
      const prevClose = processed.length > 0 ? processed[0].open : processed[0].close 
      setChartStats({ first: processed[0].close, last: processed[processed.length - 1].close, prevClose })

      if (mode === "session") {
        const lastTime = processed[processed.length - 1].time as number;
        const sessionDurationSeconds = isUSMarket ? (6.5 * 3600) : (24 * 3600);
        const sessionEndSeconds = startTimeSeconds + sessionDurationSeconds;
        const nowWithOffset = (Date.now() / 1000) + localOffset;
        if (nowWithOffset < sessionEndSeconds) {
            let intervalSeconds = 300; 
            if (currentInterval === "1m") intervalSeconds = 60;
            else if (currentInterval === "15m") intervalSeconds = 900;
            else if (currentInterval === "30m") intervalSeconds = 1800;
            else if (currentInterval === "1h") intervalSeconds = 3600;

            const missingCandlesCount = Math.max(0, Math.floor((sessionEndSeconds - lastTime) / intervalSeconds));
            chartRef.current.timeScale().applyOptions({
               rightOffset: missingCandlesCount,
               fixLeftEdge: true,
            });
        } else {
            chartRef.current.timeScale().applyOptions({
                rightOffset: 0,
                fixLeftEdge: true,
            });
        }
      }
      chartRef.current.timeScale().fitContent();
    }
  }, [historyData, mode, sessionStartTime, lookbackHours, assetDetail])

  useEffect(() => {
    if (!seriesRef.current || !latestPrice || !lastCandleRef.current) return

    const lpAny = latestPrice as any;
    if (lpAny.asset_id && assetDetail?.asset_id) {
      if (String(lpAny.asset_id) !== String(assetDetail.asset_id)) return;
    } else {
      const receivedSymbol = (lpAny.symbol || lpAny.ticker || "").toUpperCase();
      const targetId = String(assetIdentifier).toUpperCase();
      const targetTicker = (assetDetail?.ticker || "").toUpperCase();
      
      const checkMatch = (received: string, target: string) => {
        if (!received || !target) return false;
        return received === target || 
               received === `${target}USDT` || 
               received === `${target}-USDT` || 
               received === `${target}-USD`;
      };

      if (receivedSymbol && targetTicker) {
        if (!checkMatch(receivedSymbol, targetTicker)) return;
      } else if (receivedSymbol && targetId && isNaN(Number(targetId))) {
        if (!checkMatch(receivedSymbol, targetId)) return;
      }
    }

    const tickTime = (new Date(latestPrice.timestamp).getTime() / 1000) + localOffset;
    const tickPrice = Number(latestPrice.price)
    
    let intervalSeconds = 900
    if (currentInterval === "1m") intervalSeconds = 60
    else if (currentInterval === "5m") intervalSeconds = 300
    else if (currentInterval === "15m") intervalSeconds = 900
    else if (currentInterval === "30m") intervalSeconds = 1800
    else if (currentInterval === "1h") intervalSeconds = 3600

    const candleStartTime = Math.floor(tickTime / intervalSeconds) * intervalSeconds
    const lastCandle = lastCandleRef.current

    if (candleStartTime > (lastCandle.time as number)) {
      const newCandle = {
        time: candleStartTime as Time,
        open: lastCandle.close,
        high: Math.max(lastCandle.close, tickPrice),
        low: Math.min(lastCandle.close, tickPrice),
        close: tickPrice,
      }
      seriesRef.current.update(newCandle)
      lastCandleRef.current = newCandle
    } else {
      const updatedCandle = {
        ...lastCandle,
        high: Math.max(lastCandle.high, tickPrice),
        low: Math.min(lastCandle.low, tickPrice),
        close: tickPrice,
      }
      seriesRef.current.update(updatedCandle)
      lastCandleRef.current = updatedCandle
    }
    setChartStats(prev => ({ ...prev, last: tickPrice }))
  }, [latestPrice, currentInterval])

  useEffect(() => {
    const timer = setInterval(() => {
      if (!seriesRef.current || !lastCandleRef.current) return;
      const nowSeconds = Math.floor(Date.now() / 1000) + localOffset;
      let intervalSeconds = 300;
      if (currentInterval === "1m") intervalSeconds = 60;
      else if (currentInterval === "5m") intervalSeconds = 300;
      else if (currentInterval === "15m") intervalSeconds = 900;
      else if (currentInterval === "30m") intervalSeconds = 1800;
      else if (currentInterval === "1h") intervalSeconds = 3600;

      const candleStartTime = Math.floor(nowSeconds / intervalSeconds) * intervalSeconds;
      const lastCandle = lastCandleRef.current;
      let isUSMarket = false;
      let is24hMarket = true;
      if (assetDetail) {
        const typeName = (assetDetail.asset_type || assetDetail.type_name || '').toLowerCase();
        if (typeName.includes('stock') || typeName.includes('etf')) {
          is24hMarket = false;
          const currency = (assetDetail.currency || '').toUpperCase();
          if (currency === 'USD') isUSMarket = true;
        }
      }
      const marketOpen = is24hMarket || (isUSMarket ? isUSRegularMarketHours() : true);
      if (marketOpen && candleStartTime > (lastCandle.time as number)) {
        const ghostCandle = {
          time: candleStartTime as Time,
          open: lastCandle.close,
          high: lastCandle.close,
          low: lastCandle.close,
          close: lastCandle.close,
        };
        seriesRef.current.update(ghostCandle);
        lastCandleRef.current = ghostCandle;
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [currentInterval, assetDetail]);

  const currentPrice = chartStats.last > 0 ? chartStats.last : (latestPrice?.price ? Number(latestPrice.price) : 0);
  let computedChangePercent = 0;
  let computedChangeAmount = 0;

  if (typeof latestPrice?.changePercent === 'number') {
      computedChangePercent = latestPrice.changePercent;
      if (prevClosePrice && prevClosePrice > 0) {
          computedChangeAmount = currentPrice - prevClosePrice;
      } else {
          computedChangeAmount = currentPrice * (computedChangePercent / 100);
      }
  } else if (lastQuoteResponse?.quote) {
      const qp = Number(lastQuoteResponse.quote.change_percent);
      const qa = Number(lastQuoteResponse.quote.change_amount);
      if (isFinite(qp)) computedChangePercent = qp;
      if (isFinite(qa)) computedChangeAmount = qa;
      else if (prevClosePrice && prevClosePrice > 0) computedChangeAmount = currentPrice - prevClosePrice;
      else computedChangeAmount = currentPrice * (computedChangePercent / 100);
  } else if (prevClosePrice && prevClosePrice > 0 && currentPrice > 0) {
      computedChangeAmount = currentPrice - prevClosePrice;
      computedChangePercent = (computedChangeAmount / prevClosePrice) * 100;
  } else if (chartStats.prevClose > 0) {
      computedChangeAmount = currentPrice - chartStats.prevClose;
      computedChangePercent = (computedChangeAmount / chartStats.prevClose) * 100;
  }

  const isPositive = computedChangePercent >= 0;
  const changeSign = computedChangePercent > 0 ? '+' : (computedChangePercent < 0 ? '-' : '');
  const getChangeColor = (percent: number) => {
    if (percent <= -3) return 'text-[#f73539]';
    if (percent >= 3) return 'text-[#2ecc59]';
    if (percent < 0) return 'text-[#f73539]'; 
    if (percent > 0) return 'text-[#2ecc59]'; 
    return 'text-gray-500';
  }
  const colorClass = getChangeColor(computedChangePercent)

  return (
    <div 
      className="group relative flex flex-col gap-2 w-full p-4 rounded-xl bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 shadow-xl transition-all hover:bg-white/60 dark:hover:bg-gray-900/60"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            {href ? (
              <Link href={href} className="hover:opacity-75 transition-opacity">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {title || assetIdentifier}
                </h3>
              </Link>
            ) : (
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {title || assetIdentifier}
              </h3>
            )}
            <div className={`flex items-baseline gap-2 ${colorClass}`}>
              <span className={`text-base font-black mr-1 bg-clip-text text-transparent bg-gradient-to-br ${
                computedChangePercent > 0 
                  ? 'from-green-400 to-green-600' 
                  : computedChangePercent < 0 
                    ? 'from-red-400 to-red-600' 
                    : 'from-slate-400 to-slate-600'
              }`}>
                {currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: (currentPrice < 10 ? 4 : 2) })}
              </span>
              <span className="font-semibold text-sm">{changeSign}{Math.abs(computedChangePercent).toFixed(2)}%</span>
              <span className="text-xs font-medium">{changeSign}{Math.abs(computedChangeAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-medium">
            {mode === "session" ? `Session Open~` : `Rolling: Last ${lookbackHours}h`} | {currentInterval}
          </p>
        </div>
        <div className="flex items-center gap-2">
           <select 
             className="bg-transparent border border-gray-200 dark:border-gray-800 rounded px-1 min-w-[50px] text-[10px] text-gray-500 dark:text-gray-400 outline-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
             value={currentInterval}
             onChange={(e) => setCurrentInterval(e.target.value)}
           >
             <option value="1m">1m</option>
             <option value="5m">5m</option>
             <option value="15m">15m</option>
             <option value="30m">30m</option>
           </select>
           <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
             {assetIdentifier}
           </span>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />
        {ohlcvQuery.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/10 dark:bg-black/10 backdrop-blur-[2px] rounded-md z-10">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}

export default LiveCandleChart
