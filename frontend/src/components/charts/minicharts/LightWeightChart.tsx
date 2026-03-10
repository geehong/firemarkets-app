// @ts-nocheck
"use client"

import React, { useEffect, useRef } from "react"
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
    { dataSource },
    { enabled: !isStocksOrEtf }
  )

  const sparklineQuery = useSparklinePrice(
    assetIdentifier,
    { dataInterval: "15m", days: 1, dataSource },
    { enabled: isStocksOrEtf }
  )

  const apiResponse: any = isStocksOrEtf
    ? sparklineQuery.data
    : delayedQuotesQuery.data

  const { latestPrice } = useRealtimePrices(assetIdentifier)

  // API 응답을 lightweight-charts 형식으로 다운샘플/매핑
  const buildInitialSeriesData = (): LineDataPoint[] => {
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
  }

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
    const data = buildInitialSeriesData()
    if (!data.length) return
    seriesRef.current.setData(data)
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent()
    }
    // buildInitialSeriesData는 apiResponse와 assetIdentifier에만 의존하므로
    // 이 두 값이 변경될 때만 다시 실행되도록 의도적으로 제한
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiResponse, assetIdentifier])

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
      {title && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium truncate">
            {title} ({assetIdentifier})
          </span>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full min-h-[160px] rounded-md bg-white/60 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800"
      />
    </div>
  )
}

export default LightWeightChart

