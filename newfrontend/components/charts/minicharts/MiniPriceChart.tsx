"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Highcharts from "highcharts/highstock"
import { useAPI } from "@/hooks/useAPI"
import "./MiniPriceChart.css"

type MiniPriceChartProps = {
  containerId?: string
  assetIdentifier?: string
  chartType?: string
  useWebSocket?: boolean
  apiInterval?: string | null
  marketHours?: unknown
}

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && isFinite(v)

const formatCompact = (v: unknown) => {
  const n = Number(v)
  const abs = Math.abs(n)
  if (!isFiniteNumber(n)) return ""
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + "T"
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B"
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M"
  if (abs >= 1e3) return (n / 1e3).toFixed(2) + "K"
  return n.toFixed(2)
}

const MiniPriceChart: React.FC<MiniPriceChartProps> = ({
  containerId = "mini-chart-test",
  assetIdentifier = "BTCUSDT",
  chartType = "crypto",
  useWebSocket = true,
  apiInterval = null,
  marketHours = null,
}) => {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const [chart, setChart] = useState<any>(null)
  const [isMobile, setIsMobile] = useState<boolean>(() => (typeof window !== "undefined" ? window.innerWidth <= 768 : false))

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // API 데이터 로드 (지연 데이터 기반 시계열)
  const { data: apiResponse, loading: isLoading, error } = useAPI.realtime.pricesPg({
    asset_identifier: assetIdentifier,
    data_interval: "15m",
    days: 1,
  } as any)

  // 시계열 데이터로 변환 (정렬 포함)
  const chartData: [number, number][] = useMemo(() => {
    if (!apiResponse?.quotes || apiResponse.quotes.length === 0) return []
    return apiResponse.quotes
      .map((q: any) => {
        const ts = new Date(q.timestamp_utc).getTime()
        if (!ts || !isFinite(ts)) return null
        return [ts, parseFloat(q.price)] as [number, number]
      })
      .filter((p: any) => p !== null)
      .sort((a: [number, number], b: [number, number]) => a[0] - b[0])
  }, [apiResponse])

  // 전일 클로즈 가격(24:00) 계산
  const prevClosePrice = useMemo(() => {
    if (!chartData.length) return null as number | null
    const now = new Date()
    const todayStartUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
    let candidate: number | null = null
    for (let i = chartData.length - 1; i >= 0; i -= 1) {
      const [ts, price] = chartData[i]
      if (ts <= todayStartUtc) {
        candidate = price
        break
      }
    }
    return isFiniteNumber(candidate) ? candidate : null
  }, [chartData])

  // x축 범위 (우측 패딩만 유지)
  const xAxisRange = useMemo(() => {
    if (chartData.length === 0) return { min: null as number | null, max: null as number | null }
    const times = chartData.map((p) => p[0])
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const span = maxTime - minTime
    const leftPad = span * 0.05
    const rightPad = 4 * 60 * 60 * 1000
    return { min: minTime - leftPad, max: maxTime + rightPad }
  }, [chartData])

  // 차트 생성 (초기 로드 전용)
  useEffect(() => {
    if (!chartRef.current) return
    if (isLoading || chartData.length === 0) return

    const last = chartData[chartData.length - 1]
    const lastPrice = last ? last[1] : null
    let isRising: boolean | null = null
    if (isFiniteNumber(lastPrice) && isFiniteNumber(prevClosePrice)) {
      const diff = lastPrice - prevClosePrice
      if (diff > 0) isRising = true
      else if (diff < 0) isRising = false
      else isRising = null
    }
    const lineColor = isRising === null ? "#999999" : isRising ? "#18c58f" : "#ff4d4f"

    const options: any = {
      title: {
        text: `${assetIdentifier}`,
        align: "center",
        verticalAlign: "middle",
        style: { fontSize: "14px", fontWeight: "bold", color: "#ffffff" },
      },
      xAxis: {
        type: "datetime",
        min: xAxisRange.min,
        max: xAxisRange.max,
        gridLineColor: "rgba(255,255,255,0.06)",
        gridLineWidth: 0.5,
        labels: { enabled: true, style: { color: "#cccccc" } },
        lineColor: "rgba(255,255,255,0.12)",
        tickColor: "rgba(255,255,255,0.15)",
        minPadding: 0,
        maxPadding: 0,
        softMax: xAxisRange.max,
        softMin: xAxisRange.min,
      },
      yAxis: {
        opposite: true,
        gridLineColor: "rgba(255,255,255,0.06)",
        gridLineWidth: 0.5,
        labels: {
          enabled: true,
          style: { color: "#cccccc" },
          align: "left",
          x: 15,
          formatter: function (this: any) {
            return formatCompact(this.value)
          },
        },
        title: { text: null, style: { color: "#cccccc" } },
        plotLines: isFiniteNumber(lastPrice)
          ? [
              {
                id: "current-price-line",
                value: Math.round(lastPrice * 100) / 100,
                color: lineColor,
                width: 0.75,
                zIndex: 10,
              },
            ]
          : [],
      },
      rangeSelector: { enabled: false },
      navigator: { enabled: false },
      scrollbar: { enabled: false },
      credits: { enabled: false },
      exporting: { enabled: false },
      accessibility: { enabled: false },
      chart: { backgroundColor: "#1a1a1a", animation: false },
      series: [
        { type: "line", name: "Price", color: "#00d4ff", lineWidth: 2, marker: { enabled: false }, data: chartData },
        {
          type: "scatter",
          name: "Last",
          data: last ? [[last[0], last[1]]] : [],
          color: lineColor,
          marker: { enabled: true, radius: 3, symbol: "circle" },
          dataLabels: {
            enabled: true,
            formatter: function (this: any) {
              const val = Number(this.y)
              if (!isFinite(val)) return ""
              if (isFiniteNumber(prevClosePrice) && prevClosePrice !== 0) {
                const diff = val - prevClosePrice
                const pct = (diff / prevClosePrice) * 100
                const sign = diff > 0 ? "+" : diff < 0 ? "-" : ""
                return `$${val.toFixed(2)} (${sign}${Math.abs(pct).toFixed(2)}%, ${sign}$${Math.abs(diff).toFixed(2)})`
              }
              return `$${val.toFixed(2)}`
            },
            style: { fontWeight: "900", color: lineColor, fontSize: "14px" },
          },
        },
      ],
    }

    let newChart: any
    try {
      newChart = Highcharts.stockChart(chartRef.current as any, options)
      setChart(newChart)
      return () => {
        if (newChart) {
          newChart.destroy()
          setChart(null)
        }
      }
    } catch (e) {
      console.error(`[MiniPriceChart - ${assetIdentifier}] chart init error:`, e)
    }
  }, [assetIdentifier, chartData, isLoading, xAxisRange, prevClosePrice])

  // 웹소켓 연동은 테스트 페이지에서는 사용하지 않음 (store 미존재 환경 호환)

  return (
    <div className="mini-price-chart-container">
      <div
        ref={chartRef}
        id={containerId}
        className={`mini-price-chart ${isLoading ? "loading" : ""} ${error ? "error" : ""}`}
        style={{ height: isMobile ? "200px" : "300px" }}
      />
    </div>
  )
}

export default MiniPriceChart


