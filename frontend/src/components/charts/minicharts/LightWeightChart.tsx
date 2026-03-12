// @ts-nocheck
"use client"

import React, { useEffect, useRef, useState, useMemo } from "react"
import {
  createChart,
  ColorType,
  LineStyle,
  Time,
  IChartApi,
  ISeriesApi,
} from "lightweight-charts"
import { useDelayedQuotes, useSparklinePrice } from "@/hooks/data/useRealtime"
import { useRealtimePrices } from "@/hooks/data/useSocket"
import { useAssetDetail } from "@/hooks/assets/useAssets"

type LightWeightChartProps = {
  assetIdentifier: string
  title?: string
  chartType?: "crypto" | "stocks"
  dataSource?: string
}

type ApiResponsePoint = {
  timestamp_utc?: string
  date?: string
  price?: number | string
  close_price?: number | string
  close?: number | string
  value?: number | string
}

type LineDataPoint = {
  time: Time
  value: number
}

const LightWeightChart: React.FC<LightWeightChartProps> = ({
  assetIdentifier,
  title,
  chartType = "crypto",
  dataSource,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null)

  const [dataInterval, setDataInterval] = useState("15m")

  // 데이터/자산 정보 훅
  const { data: assetDetail } = useAssetDetail(assetIdentifier)

  const isStocksOrEtf = useMemo(() => {
    return (
      chartType === "stocks" ||
      assetDetail?.asset_type_id === 2 ||
      assetDetail?.asset_type_id === 5 ||
      assetDetail?.type_name?.toLowerCase() === "stocks" ||
      assetDetail?.type_name?.toLowerCase() === "etfs"
    )
  }, [chartType, assetDetail])

  const delayedQuotesQuery = useDelayedQuotes(
    [assetIdentifier],
    { dataSource, dataInterval },
    { enabled: !isStocksOrEtf }
  )

  const sparklineQuery = useSparklinePrice(
    assetIdentifier,
    { dataInterval, days: 1, dataSource },
    { enabled: isStocksOrEtf }
  )

  const apiResponse: any = isStocksOrEtf ? sparklineQuery.data : delayedQuotesQuery.data
  const { latestPrice } = useRealtimePrices(assetIdentifier)

  // API 응답을 lightweight-charts 형식으로 다운샘플/매핑
  const seriesData = useMemo(() => {
    let raw: ApiResponsePoint[] = []

    if (apiResponse && Array.isArray(apiResponse)) {
      const assetData = apiResponse.find(
        (item: any) => item.asset_identifier === assetIdentifier
      )
      raw = assetData?.quotes || []
    } else if (apiResponse?.quotes && Array.isArray(apiResponse.quotes)) {
      raw = apiResponse.quotes
    } else if (apiResponse?.data && Array.isArray(apiResponse.data)) {
      raw = apiResponse.data
    }

    if (!raw.length) return []

    // 최대 300 포인트로 축소 로직 최적화 (마지막 데이터 보존)
    const maxPoints = 300
    const step = Math.max(1, Math.floor(raw.length / maxPoints))
    
    const sampled: LineDataPoint[] = []
    
    for (let i = 0; i < raw.length; i += step) {
      const p = raw[i]
      const rawTs = p.timestamp_utc || p.date
      const ts = rawTs ? new Date(rawTs).getTime() : NaN
      const val = Number(p.price ?? p.close_price ?? p.close ?? p.value)

      if (!ts || isNaN(ts) || isNaN(val)) continue

      sampled.push({
        time: Math.floor(ts / 1000) as Time,
        value: val,
      })
    }

    // 마지막 배열 요소가 원본의 최신 데이터를 누락했다면 강제 추가 (웹소켓 연결 부드럽게)
    const lastRaw = raw[raw.length - 1]
    const lastRawTs = lastRaw.timestamp_utc || lastRaw.date
    if (lastRawTs) {
      const lastTs = Math.floor(new Date(lastRawTs).getTime() / 1000) as Time
      if (sampled.length > 0 && sampled[sampled.length - 1].time !== lastTs) {
        sampled.push({
          time: lastTs,
          value: Number(lastRaw.price ?? lastRaw.close_price ?? lastRaw.close ?? lastRaw.value),
        })
      }
    }

    // 시간 오름차순 정렬 및 중복 제거
    const uniqueSampled = sampled.filter((item, index, self) => 
      index === 0 || item.time > self[index - 1].time
    )

    return uniqueSampled
  }, [apiResponse, assetIdentifier])

  // 가격 계산 로직 (useMemo로 연산 최소화)
  const { firstPrice, currentPrice, changeAmount, changePercent, isPositive } = useMemo(() => {
    const startP = seriesData.length > 0 ? seriesData[0].value : 0
    const currP = latestPrice?.price 
      ? Number(latestPrice.price) 
      : (seriesData.length > 0 ? seriesData[seriesData.length - 1].value : 0)
    
    const changeAmt = startP > 0 ? currP - startP : 0
    const changePct = startP > 0 ? (changeAmt / startP) * 100 : 0
    
    return {
      firstPrice: startP,
      currentPrice: currP,
      changeAmount: changeAmt,
      changePercent: changePct,
      isPositive: changeAmt >= 0
    }
  }, [seriesData, latestPrice])

  // 차트 초기화 (1회 실행)
  useEffect(() => {
    if (!containerRef.current || chartRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "var(--tw-prose-body, #9CA3AF)",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.12)" },
        horzLines: { color: "rgba(148, 163, 184, 0.12)" },
      },
      rightPriceScale: { visible: true, borderVisible: false },
      timeScale: {
        borderVisible: false,
        rightOffset: 4,
        barSpacing: 6,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      crosshair: { mode: 1 },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisDoubleClickReset: true, mouseWheel: true, pinch: true },
      // watermark: { visible: false }, // CSS에서 처리하므로 제거
      autoSize: true, // v4/v5 기능: ResizeObserver 수동 구현 대체
    })

    const series = chart.addLineSeries({
      color: "#22c55e", 
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      crosshairMarkerVisible: true,
      lineStyle: LineStyle.Solid,
    })

    chartRef.current = chart
    seriesRef.current = series

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // 과거 데이터 업데이트 및 상승/하락 동적 색상 변경
  useEffect(() => {
    if (!seriesRef.current || !seriesData.length) return
    
    seriesRef.current.setData(seriesData)
    seriesRef.current.applyOptions({
      color: isPositive ? "#22c55e" : "#ef4444" // 상승 초록, 하락 빨강
    })
    
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent()
    }
  }, [seriesData, isPositive])

  // 실시간 웹소켓 가격 업데이트
  useEffect(() => {
    if (!seriesRef.current || !latestPrice) return

    const ts = Math.floor(new Date(latestPrice.timestamp).getTime() / 1000) as Time
    const value = Number(latestPrice.price)

    if (isNaN(ts as number) || isNaN(value)) return

    try {
      seriesRef.current.update({ time: ts, value })
    } catch (error) {
      console.warn("Chart realtime update skipped:", error)
    }
  }, [latestPrice])

  return (
    <div className="flex flex-col gap-1 h-full w-full">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-baseline gap-2">
          {title && (
            <span className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isPositive ? 'bg-green-500' : 'bg-red-500'}`} />
              {title}
            </span>
          )}
          {firstPrice > 0 && (
            <div className={`flex items-baseline gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              <span className="font-semibold">
                {isPositive ? '+' : ''}{changeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] opacity-80">
                ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            className="bg-transparent border border-gray-200 dark:border-gray-800 rounded px-1 min-w-[50px] text-[10px] text-gray-500 dark:text-gray-400 outline-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            value={dataInterval}
            onChange={(e) => setDataInterval(e.target.value)}
          >
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="30m">30m</option>
          </select>
          <span className="font-medium truncate uppercase bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px]">
            {assetIdentifier}
          </span>
        </div>
      </div>
      
      <div
        ref={containerRef}
        className="relative w-full h-full min-h-[160px] rounded-md bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 overflow-hidden"
      />
    </div>
  )
}

export default LightWeightChart
