import React from 'react';
import MiniPriceChart from './MiniPriceChart';

interface MiniPriceCryptoChartProps {
  containerId?: string;
  assetIdentifier?: string;
  chartType?: string;
  useWebSocket?: boolean;
  apiInterval?: string | null;
  marketHours?: boolean;
  dataSource?: string;
}

const MiniPriceCryptoChart: React.FC<MiniPriceCryptoChartProps> = (props) => {
    return (
        <MiniPriceChart
            {...props}
            chartType="crypto"
            useWebSocket={true}
            dataSource="binance"
        />
    );
};

export default MiniPriceCryptoChart;