"use client"

import React from "react"
import LiveCandleChart from "./LiveCandleChart"

interface RollingLiveChartProps {
  assetIdentifier: string
  title?: string
  lookbackHours?: number // 최근 N시간 유지, 기본값 24
  dataInterval?: "1m" | "5m" | "15m" | "1h"
  chartType?: "candle" | "line"
}

/**
 * [모드 2] 롤링 윈도우 라이브 차트
 * 현재 시간을 기준으로 설정된 기간(예: 최근 24시간)의 데이터를 지속적으로 유지하며 표시합니다.
 */
const RollingLiveChart: React.FC<RollingLiveChartProps> = (props) => {
  return (
    <LiveCandleChart
      {...props}
      mode="rolling"
    />
  )
}

export default RollingLiveChart
