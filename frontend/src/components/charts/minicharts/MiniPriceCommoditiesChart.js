import React from 'react';
import MiniPriceChart from './MiniPriceChart';

const MiniPriceCommoditiesChart = (props) => {
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