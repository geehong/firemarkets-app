import React from 'react';
import MiniPriceChart from './MiniPriceChart';

interface MiniPriceStocksEtfChartProps {
  containerId?: string;
  assetIdentifier?: string;
  chartType?: string;
  useWebSocket?: boolean;
  apiInterval?: string | null;
  marketHours?: boolean;
}

// 미국시장 개장시간 체크 함수 (한국시간 기준)
const checkUSMarketHours = (): boolean => {
    const now = new Date();
    const koreanTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const hour = koreanTime.getHours();
    const minute = koreanTime.getMinutes();
    const currentTime = hour * 60 + minute;
    
    // 미국시장 개장시간: 한국시간 23:30 - 06:00 (다음날)
    const marketOpenStart = 23 * 60 + 30; // 23:30
    const marketOpenEnd = 6 * 60; // 06:00
    
    return currentTime >= marketOpenStart || currentTime <= marketOpenEnd;
};

const MiniPriceStocksEtfChart: React.FC<MiniPriceStocksEtfChartProps> = (props) => {
    return (
        <MiniPriceChart
            {...props}
            chartType="stocks"
            useWebSocket={true}
            marketHours={checkUSMarketHours()}
        />
    );
};

export default MiniPriceStocksEtfChart;