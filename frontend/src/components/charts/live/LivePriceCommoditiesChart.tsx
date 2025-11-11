import React from 'react'
import LiveChart from './livechart'

interface LivePriceCommoditiesChartProps {
  containerId?: string
  height?: number | string
  initialData?: Array<[number, number]>
  updateInterval?: number
  assetIdentifier?: string
}

const LivePriceCommoditiesChart: React.FC<LivePriceCommoditiesChartProps> = (props) => {
  // No explicit dataSource; backend will select commodity providers
  return (
    <LiveChart
      {...props}
      useWebSocket={false}
      apiRefetchIntervalMs={5 * 60 * 1000}
    />
  )
}

export default LivePriceCommoditiesChart


