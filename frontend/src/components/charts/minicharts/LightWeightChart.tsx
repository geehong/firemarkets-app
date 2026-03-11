// @ts-nocheck
"use client"

import React, { useEffect, useRef, useState, useMemo } from "react"
import {
  createChart,
  LineSeries,
  ColorType,
  LineStyle,
  Time,
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
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const seriesRef = useRef<any | null>(null)

  const [dataInterval, setDataInterval] = useState("15m")

  // 데이터/자산 정보 훅 (기존 MiniPriceChart와 동일한 데이터 파이프 재사용)
  const { data: assetDetail } = useAssetDetail(assetIdentifier)

  const isStocksOrEtf =
    chartType === "stocks" ||
    assetDetail?.asset_type_id === 2 ||
    assetDetail?.asset_type_id === 5 ||
    assetDetail?.type_name?.toLowerCase() === "stocks" ||
    assetDetail?.type_name?.toLowerCase() === "etfs"

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

  const apiResponse: any = isStocksOrEtf
    ? sparklineQuery.data
    : delayedQuotesQuery.data

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

    // 간단한 다운샘플링: 최대 300 포인트로 축소 (1GB VPS 방어)
    const maxPoints = 300
    const step = Math.max(1, Math.floor(raw.length / maxPoints))

    const sampled: LineDataPoint[] = []
    for (let i = 0; i < raw.length; i += step) {
      const p = raw[i]
      const rawTs = p.timestamp_utc || p.date
      const ts = rawTs ? new Date(rawTs).getTime() : NaN
      const val =
        p.price ?? p.close_price ?? p.close ?? p.value

      if (!ts || !isFinite(ts) || val == null) continue

      sampled.push({
        time: (ts / 1000) as Time, // lightweight-charts는 초 단위 사용
        value: Number(val),
      })
    }

    // 시간 정렬
    return sampled.sort((a, b) => (a.time as number) - (b.time as number))
  }, [apiResponse, assetIdentifier])

  const firstPrice = seriesData.length > 0 ? seriesData[0].value : 0
  const currentPrice = latestPrice?.price ? Number(latestPrice.price) : (seriesData.length > 0 ? seriesData[seriesData.length - 1].value : 0)
  const changeAmount = firstPrice > 0 ? currentPrice - firstPrice : 0
  const changePercent = firstPrice > 0 ? (changeAmount / firstPrice) * 100 : 0
  const isPositive = changeAmount >= 0

  // 차트 초기화 (한 번만)
  useEffect(() => {
    if (!containerRef.current) return
    if (chartRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: {
          type: ColorType.Solid,
          color: "transparent",
        },
        textColor: "var(--tw-prose-body, #9CA3AF)",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.12)" },
        horzLines: { color: "rgba(148, 163, 184, 0.12)" },
      },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        rightOffset: 4,
        barSpacing: 6,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      crosshair: {
        mode: 1,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisDoubleClickReset: true,
        mouseWheel: true,
        pinch: true,
      },
    })

    const series = chart.addSeries(LineSeries, {
      color: "#22c55e",
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
      crosshairMarkerVisible: true,
      lineStyle: LineStyle.Solid,
    })

    chartRef.current = chart
    seriesRef.current = series

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry || !chartRef.current) return
      const { width, height } = entry.contentRect
      chartRef.current.applyOptions({ width, height })
      chartRef.current.timeScale().fitContent()
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
      seriesRef.current = null
    }
  }, [])

  // 초기 데이터 주입 (React 리렌더 없이 단발성 호출)
  useEffect(() => {
    if (!seriesRef.current) return
    if (!seriesData.length) return
    seriesRef.current.setData(seriesData)
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent()
    }
  }, [seriesData])

  // 실시간 WebSocket 데이터는 차트 객체에만 전달 (리액트 상태 업데이트 없음)
  useEffect(() => {
    if (!seriesRef.current) return
    if (!latestPrice) return

    const ts = new Date(latestPrice.timestamp).getTime()
    if (!ts || !isFinite(ts)) return

    const value = Number(latestPrice.price)
    if (!isFinite(value)) return

    seriesRef.current.update({
      time: (ts / 1000) as Time,
      value,
    })
  }, [latestPrice])

  return (
    <div className="flex flex-col gap-1 h-full w-full">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-baseline gap-2">
          {title && (
            <span className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {title}
            </span>
          )}
          {firstPrice > 0 && (
            <div className={`flex items-baseline gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              <span className="font-semibold">{isPositive ? '+' : ''}{changeAmount.toFixed(2)}</span>
              <span className="text-[10px] opacity-80">({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)</span>
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
        className="w-full h-full min-h-[160px] rounded-md bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800"
      />
    </div>
  )
}

export default LightWeightChart

