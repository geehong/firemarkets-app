import React from 'react';
import MiniPriceChart from './MiniPriceChart';

interface MiniPriceCommoditiesChartProps {
  containerId?: string;
  assetIdentifier?: string;
  chartType?: string;
  useWebSocket?: boolean;
  apiInterval?: string | null;
  marketHours?: boolean;
}

const MiniPriceCommoditiesChart: React.FC<MiniPriceCommoditiesChartProps> = (props) => {
    return (
        <MiniPriceChart
            {...props}
            chartType="commodities"
            useWebSocket={false}
            apiInterval={5 * 60 * 1000} // 5분마다 API 호출
        />
    );
};

export default MiniPriceCommoditiesChart;