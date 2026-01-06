
import React from 'react'
import LiveChart from './LiveChart'

interface LivePriceStocksEtfChartProps {
    containerId?: string
    height?: number | string
    initialData?: Array<[number, number]>
    updateInterval?: number
    assetIdentifier?: string
}

// 미국시장 개장시간 체크 (한국시간 기준 23:30~06:00)
const checkUSMarketHours = (): boolean => {
    const now = new Date()
    const koreanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const hour = koreanTime.getHours()
    const minute = koreanTime.getMinutes()
    const currentTime = hour * 60 + minute
    const marketOpenStart = 23 * 60 + 30 // 23:30
    const marketOpenEnd = 6 * 60 // 06:00
    return currentTime >= marketOpenStart || currentTime <= marketOpenEnd
}

const LivePriceStocksEtfChart: React.FC<LivePriceStocksEtfChartProps> = (props) => {
    // No explicit dataSource; backend will select appropriate provider for stocks/etf
    return (
        <LiveChart
            {...props}
            useWebSocket={true}
            marketHours={checkUSMarketHours()}
            apiDays={2}
        />
    )
}

export default LivePriceStocksEtfChart
