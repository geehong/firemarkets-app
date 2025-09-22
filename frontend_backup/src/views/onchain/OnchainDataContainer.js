import React from 'react';
import { usePriceData } from '../../hooks/useIntegratedMetrics';
import OnchainDataOverviews from '../overviews/OnchainDataOverviews';

const OnchainDataContainer = () => {
  // 데이터 fetching
  const { data: priceData, isLoading, error } = usePriceData('BTCUSDT', {
    limit: 1000,
    dataInterval: '1d'
  });

  // 데이터 변환
  const chartData = priceData ? {
    price: priceData.data || []
  } : null;

  return (
    <OnchainDataOverviews
      chartData={chartData}
      loading={isLoading}
      error={error}
      correlation={null}
    />
  );
};

export default OnchainDataContainer; 