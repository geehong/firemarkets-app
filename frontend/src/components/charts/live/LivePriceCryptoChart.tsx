
import React from 'react'
import LiveChart from './LiveChart'

interface LivePriceCryptoChartProps {
    containerId?: string
    height?: number | string
    initialData?: Array<[number, number]>
    updateInterval?: number
    assetIdentifier?: string
}

const LivePriceCryptoChart: React.FC<LivePriceCryptoChartProps> = (props) => {
    return (
        <LiveChart
            {...props}
            dataSource="binance"
            useWebSocket={true}
        />
    )
}

export default LivePriceCryptoChart
