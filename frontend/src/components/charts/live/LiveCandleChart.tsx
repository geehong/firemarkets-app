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
import { useIntradayOhlcv } from "@/hooks/data/useRealtime"
import { useRealtimePrices } from "@/hooks/data/useSocket"
import { useAssetDetail } from "@/hooks/assets/useAssets"

// ==========================================
// [차트 설정] 기본 봉 크기 설정 (코드 상단에서 직접 변경 가능)
// ==========================================
export const DEFAULT_CANDLE_INTERVAL = "5m" // 예: 1m, 5m, 15m, 1h, 1d 등

// 세션 시작 시각을 UTC 초 단위로 변환해주는 유틸리티 (미국 주식 서머타임 자동 대응)
const getDynamicSessionStartUTC = (sessionStartTime: string, isUSMarket: boolean, baseDate: Date = new Date()) => {
  const now = baseDate
  
  if (isUSMarket) {
    // 미국 주식 개장 (오전 9시 30분 NY 시간)
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        timeZoneName: 'short'
    });
    const isDST = formatter.format(now).includes('EDT');
    
    // 서머타임 적용 시 UTC 13:30, 해제 시 UTC 14:30
    const utcHours = isDST ? 13 : 14;
    const utcMinutes = 30;
    
    const sessionStart = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      utcHours,
      utcMinutes,
      0, 0
    ));
    
    if (now < sessionStart) {
      sessionStart.setUTCDate(sessionStart.getUTCDate() - 1);
    }
    return sessionStart.getTime() / 1000;
  } else {
    // 한국/크립토/커머디티 시장 등 (KST 기준)
    const [sHour, sMin] = sessionStartTime.split(":").map(Number)
    
    // KST는 UTC+9
    const sessionStart = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      sHour - 9, 
      sMin,
      0, 0
    ))
    
    if (now < sessionStart) {
      sessionStart.setUTCDate(sessionStart.getUTCDate() - 1)
    }
    
    return sessionStart.getTime() / 1000;
  }
}

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
  sessionStartTime?: string // HH:mm format, e.g., "09:00"
  lookbackHours?: number
  dataInterval?: string // "1m", "5m", "15m", "1h"
  chartType?: "candle" | "line"
}

/**
 * 실시간 초/분/시 봉을 지원하는 라이브 차트 컴포넌트
 * Lightweight-charts 5.0+ API 사용
 */
const LiveCandleChart: React.FC<LiveCandleChartProps> = ({
  assetIdentifier,
  title,
  mode = "rolling",
  sessionStartTime = "09:00",
  lookbackHours = 24,
  dataInterval = DEFAULT_CANDLE_INTERVAL,
  chartType = "candle",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<any | null>(null)
  const seriesRef = useRef<any | null>(null)
  const lastCandleRef = useRef<any | null>(null)

  // 1. 자산 정보 및 과거 데이터 로드
  const { data: assetDetail } = useAssetDetail(assetIdentifier)
  
  // 24시간 시장 여부 조기 판별 (과거 데이터 로드 범위 결정을 위해)
  const is24hMarketBase = useMemo(() => {
    if (!assetDetail) return true; // 기본값
    const typeName = (assetDetail.asset_type || assetDetail.type_name || '').toLowerCase();
    if (typeName.includes('stock') || typeName.includes('etf')) return false;
    return true;
  }, [assetDetail]);

  // 과거 데이터 범위 계산 (주식/ETF 등 비24시간 시장은 주말을 고려해 5일 로드, 크립토 등은 3일 로드)
  const ohlcvOptions = useMemo(() => {
    return { dataInterval, days: is24hMarketBase ? 3 : 5 }
  }, [dataInterval, is24hMarketBase])

  // 인터벌에 따른 리미트 계산 (예: 5m = 하루 288개 * 요청일수)
  const calcLimit = useMemo(() => {
    let pointsPerDay = 288; // 5m 기본값 (12 * 24)
    if (dataInterval === "1m") pointsPerDay = 1440;
    else if (dataInterval === "15m") pointsPerDay = 96;
    else if (dataInterval === "1h") pointsPerDay = 24;
    return pointsPerDay * ohlcvOptions.days;
  }, [dataInterval, ohlcvOptions.days])

  const ohlcvQuery = useIntradayOhlcv(assetIdentifier, { 
    dataInterval, 
    days: ohlcvOptions.days,
    limit: calcLimit,
    refetchInterval: 10 * 1000 // 10초마다 갱신
  })
  const historyData = ohlcvQuery.data?.data || []

  // 2. 실시간 웹소켓 구독
  const { latestPrice } = useRealtimePrices(assetIdentifier)

  // 3. 차트 초기화
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
        fixLeftEdge: mode === "session", // 세션 모드일 때 좌측(시작점) 고정
        fixRightEdge: false,
        rightOffset: mode === "session" ? 12 : 5, // 빈 공간 확보를 위해 기본 오프셋 설정
      },
      rightPriceScale: {
        borderVisible: false,
        autoScale: true,
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
  }, [chartType, dataInterval])

  // 4. 데이터 필터링 및 업데이트 (Mode 1, 2 적용)
  useEffect(() => {
    if (!seriesRef.current || !historyData.length) return

    let processed: CandlePoint[] = historyData.map((d: any) => {
      const ts = d.timestamp_utc || d.timestamp || d.time;
      const dateStr = typeof ts === 'string' && !ts.includes('Z') && !ts.includes('+') ? `${ts}Z` : ts;
      
      return {
        time: (new Date(dateStr).getTime() / 1000) as Time,
        open: Number(d.open_price ?? d.open ?? 0),
        high: Number(d.high_price ?? d.high ?? 0),
        low: Number(d.low_price ?? d.low ?? 0),
        close: Number(d.close_price ?? d.close ?? 0),
      };
    })

    // 오름차순 정렬
    processed.sort((a, b) => (a.time as number) - (b.time as number))

    // 중복 제거
    processed = processed.filter((v, i, arr) => i === 0 || v.time !== arr[i - 1].time)

    // 미국 시장 개장/폐장 및 24시간 여부 판별
    let isUSMarket = false;
    let is24hMarket = true;
    if (assetDetail) {
      const typeName = (assetDetail.asset_type || assetDetail.type_name || '').toLowerCase();
      const exchange = (assetDetail.exchange || '').toUpperCase();
      const currency = (assetDetail.currency || '').toUpperCase();
      
      if (typeName.includes('stock') || typeName.includes('etf')) {
        is24hMarket = false; // 주식, ETF는 24시간 시장이 아님
        if (currency === 'USD' || exchange === 'NASDAQ' || exchange === 'NYSE' || exchange === 'AMEX') {
          isUSMarket = true;
        }
      }
    }

    // 모드별 필터링 (UTC 기준 절대 시간 비교)
    const nowTimestamp = Date.now() / 1000
    
    let startTimeSeconds = 0;
    
    if (mode === "session") {
      // 1번 모드: 장 시작 시각부터 표시
      startTimeSeconds = getDynamicSessionStartUTC(sessionStartTime, isUSMarket)
      let filtered = processed.filter(d => (d.time as number) >= startTimeSeconds)

      // 주식/ETF 등의 경우 아직 개장 전이거나 주말/휴일이면 오늘 세션 데이터가 0개입니다.
      // 이 경우 데이터가 존재하는 가장 '최근 거래일'의 세션을 찾아 그 날의 세션 시작 시간을 기준으로 삼습니다.
      if (filtered.length === 0 && processed.length > 0 && !is24hMarket) {
        const lastDataTime = (processed[processed.length - 1].time as number) * 1000;
        startTimeSeconds = getDynamicSessionStartUTC(sessionStartTime, isUSMarket, new Date(lastDataTime));
        filtered = processed.filter(d => (d.time as number) >= startTimeSeconds);
      }
      processed = filtered;
    } else {
      // 2번 모드: 최근 N시간 롤링 (유지)
      let effectiveLookback = lookbackHours
      if (!is24hMarket && lookbackHours < 96) {
        // 주식/ETF 롤링 차트에서도 주말을 건너뛰고 '전날 시세'가 보이도록 최소 4일 확보
        effectiveLookback = 96
      }
      startTimeSeconds = nowTimestamp - (effectiveLookback * 3600)
      processed = processed.filter(d => (d.time as number) >= startTimeSeconds)
    }

    if (processed.length > 0) {
      seriesRef.current.setData(processed)
      lastCandleRef.current = processed[processed.length - 1]

      if (mode === "session") {
        // 세션 차트의 경우, 좌측은 고정(시작시간)되게 하고 우측은 (24시간 보장용 빈 공간)을 논리적으로 확보
        // 남은 시간(예: 현재가 15시면 09:00까지 남은 18시간)을 계산해 빈 캔들 개수(rightOffset)로 변환
        const lastTime = processed[processed.length - 1].time as number;
        const sessionEndSeconds = startTimeSeconds + (24 * 3600);
        
        let intervalSeconds = 300; // default 5m
        if (dataInterval === "1m") intervalSeconds = 60;
        else if (dataInterval === "15m") intervalSeconds = 900;
        else if (dataInterval === "1h") intervalSeconds = 3600;

        // 세션 종료까지 남은 봉(캔들)의 개수
        const missingCandlesCount = Math.max(0, Math.floor((sessionEndSeconds - lastTime) / intervalSeconds));
        
        // Lightweight Charts의 timeScale에 오프셋 강제 주입하여 우측 텅 빈 여백 생성 (데이터 자체를 더하진 않음)
        chartRef.current.timeScale().applyOptions({
           rightOffset: missingCandlesCount,
           fixLeftEdge: true,
        });
      } else {
        chartRef.current.timeScale().fitContent()
      }
    }
  }, [historyData, mode, sessionStartTime, lookbackHours])

  // 5. 실시간 웹소켓 틱(Tick) 처리 (캔들 높이 실시간 반영)
  useEffect(() => {
    if (!seriesRef.current || !latestPrice || !lastCandleRef.current) return

    const tickTime = new Date(latestPrice.timestamp).getTime() / 1000
    const tickPrice = Number(latestPrice.price)
    
    // 현재 인터벌 계산 (예: 15m = 900초)
    let intervalSeconds = 900
    if (dataInterval === "1m") intervalSeconds = 60
    else if (dataInterval === "5m") intervalSeconds = 300
    else if (dataInterval === "1h") intervalSeconds = 3600

    const candleStartTime = Math.floor(tickTime / intervalSeconds) * intervalSeconds
    const lastCandle = lastCandleRef.current

    if (candleStartTime > (lastCandle.time as number)) {
      // 새로운 봉 시작: 최초 시작가는 실시간 직전가(혹은 현재 틱가)로 생성
      const newCandle = {
        time: candleStartTime as Time,
        open: lastCandle.close, // 갭 방지를 위해 오픈가를 이전 봉 종가로 시작
        high: Math.max(lastCandle.close, tickPrice),
        low: Math.min(lastCandle.close, tickPrice),
        close: tickPrice,
      }
      seriesRef.current.update(newCandle)
      lastCandleRef.current = newCandle
    } else {
      // 기존 봉 업데이트: 오픈가는 건드리지 않고, 고가/저가/종가만 업데이트
      // 이렇게 해야 "29초 1200 -> 30초 1100" 변동 시 1200이 윗꼬리(High)로 남고 종가(Close)가 1100으로 찍힙니다
      const updatedCandle = {
        ...lastCandle,
        high: Math.max(lastCandle.high, tickPrice),
        low: Math.min(lastCandle.low, tickPrice),
        close: tickPrice,
      }
      seriesRef.current.update(updatedCandle)
      lastCandleRef.current = updatedCandle
    }
  }, [latestPrice, dataInterval])

  return (
    <div className="group relative flex flex-col gap-2 h-full w-full p-4 rounded-xl bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 shadow-xl transition-all hover:bg-white/60 dark:hover:bg-gray-900/60">
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {title || assetIdentifier}
          </h3>
          <p className="text-[10px] text-gray-500 font-medium">
            {mode === "session" ? `Session Open~` : `Rolling: Last ${lookbackHours}h`} | {dataInterval}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
