import React from 'react';
import MiniPriceChart from './MiniPriceChart';

const MiniPriceCryptoChart = (props) => {
    return (
        <MiniPriceChart
            {...props}
            chartType="crypto"
            useWebSocket={true}
        />
    );
};

export default MiniPriceCryptoChart;