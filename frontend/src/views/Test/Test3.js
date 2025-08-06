import React, { useState } from 'react';
import OnChainChart from '../../components/charts/OnChainChart';
import CorrelationChart from '../../components/charts/CorrelationChart';

const Test3 = () => {
  const [assetId, setAssetId] = useState('BTCUSDT');

  const handleAssetChange = (e) => {
    setAssetId(e.target.value);
  };

  return (
    <div style={{ 
      padding: '20px',
      minHeight: '100vh'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ 
          marginBottom: '20px',
          fontSize: '2rem'
        }}>
          On-Chain Price Chart Test
        </h1>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          marginBottom: '20px'
        }}>
          <label htmlFor="asset-select">
            Asset ID:
          </label>
          <select
            id="asset-select"
            value={assetId}
            onChange={handleAssetChange}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="BTCUSDT">Bitcoin (BTCUSDT)</option>
            <option value="ETHUSDT">Ethereum (ETHUSDT)</option>
            <option value="ADAUSDT">Cardano (ADAUSDT)</option>
            <option value="DOTUSDT">Polkadot (DOTUSDT)</option>
          </select>
        </div>
      </div>

      <div style={{ 
        padding: '20px'
      }}>
        <OnChainChart 
          assetId={assetId}
          title={`${assetId} Price Chart`}
          height={600}
          showHalvingEvents={true}
          showRangeSelector={true}
          priceColor="#ffbf00"
        />
      </div>

      <div style={{ 
        padding: '20px'
      }}>
        <CorrelationChart 
          assetId={assetId}
          title={`${assetId} Price vs MVRV Z-Score Correlation`}
          height={600}
          showRangeSelector={true}
          showStockTools={true}
          showExporting={true}
        />
      </div>


    </div>
  );
};

export default Test3;
