"use client"

import React from "react"
import LiveCandleChart from "./LiveCandleChart"

interface SessionLiveChartProps {
  assetIdentifier: string
  title?: string
  sessionStartTime?: string // HH:mm format, 기본값 "09:00"
  dataInterval?: "1m" | "5m" | "15m" | "1h"
  chartType?: "candle" | "line"
}

/**
 * [모드 1] 장 개시 기준 세션 차트
 * 한국 시간 기준 지정된 시각(기본 09:00)부터 현재까지의 데이터를 표시합니다.
 */
const SessionLiveChart: React.FC<SessionLiveChartProps> = (props) => {
  return (
    <LiveCandleChart
      {...props}
      mode="session"
    />
  )
}

export default SessionLiveChart
