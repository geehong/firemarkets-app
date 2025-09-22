import React from 'react'
import OnchainDataOverviews from '../overviews/OnchainDataOverviews'

const SOPROverviews = () => {
  return (
    <OnchainDataOverviews
      metricId="sopr"
      metricName="SOPR (Spent Output Profit Ratio)"
      metricDescription="Measures the profit/loss ratio of spent outputs"
      title="Bitcoin Price vs SOPR Correlation"
      subtitle="Historical correlation analysis with interactive range selection"
    />
  )
}

export default SOPROverviews 