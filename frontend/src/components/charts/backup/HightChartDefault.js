import React, { useState, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import axios from 'axios';

// Load and initialize Highcharts modules explicitly (Vite/ESM safe)
import ExportingModule from 'highcharts/modules/exporting';
import AccessibilityModule from 'highcharts/modules/accessibility';

// Ensure modules compose onto the same Highcharts instance
AccessibilityModule(Highcharts);
ExportingModule(Highcharts);

const OnChainChart = ({ assetIdentifier }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPriceData = async () => {
      if (!assetIdentifier) {
        setError('Asset identifier is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/v1/price/${assetIdentifier}`);
        
        // Transform the data for Highcharts
        // API returns { asset_id, ticker, data: [...], total_count }
        const transformedData = response.data.data.map(item => ({
          x: new Date(item.date).getTime(),
          y: parseFloat(item.value),
          changePercent: item.change_percent
        }));

        setChartData(transformedData);
      } catch (err) {
        console.error('Error fetching price data:', err);
        setError('Failed to load price data');
      } finally {
        setLoading(false);
      }
    };

    fetchPriceData();
  }, [assetIdentifier]);

  const chartOptions = {
    chart: {
      type: 'line',
      backgroundColor: '#1a1a1a',
      style: {
        fontFamily: 'Arial, sans-serif'
      }
    },
    title: {
      text: `${assetIdentifier} Price Chart`,
      style: {
        color: '#ffffff'
      }
    },
    xAxis: {
      type: 'datetime',
      labels: {
        style: {
          color: '#cccccc'
        }
      },
      gridLineColor: '#333333'
    },
    yAxis: {
      title: {
        text: 'Price',
        style: {
          color: '#cccccc'
        }
      },
      labels: {
        style: {
          color: '#cccccc'
        }
      },
      gridLineColor: '#333333'
    },
    legend: {
      enabled: true,
      itemStyle: {
        color: '#cccccc'
      }
    },
    plotOptions: {
      line: {
        marker: {
          enabled: false
        },
        lineWidth: 2
      },
      series: {
        color: '#00d4ff'
      }
    },
    series: [{
      name: 'Price',
      data: chartData,
      tooltip: {
        valueDecimals: 6
      }
    }],
    tooltip: {
      backgroundColor: '#2a2a2a',
      style: {
        color: '#ffffff'
      },
      formatter: function() {
        const changePercent = this.point.changePercent;
        const changeColor = changePercent >= 0 ? '#00ff00' : '#ff0000';
        const changeSymbol = changePercent >= 0 ? '+' : '';
        return `<b>${Highcharts.dateFormat('%Y-%m-%d', this.x)}</b><br/>
                Price: <b>$${this.y.toLocaleString()}</b><br/>
                Change: <span style="color: ${changeColor}"><b>${changeSymbol}${(changePercent * 100).toFixed(2)}%</b></span>`;
      }
    },
    exporting: {
      enabled: true,
      buttons: {
        contextButton: {
          theme: {
            fill: '#2a2a2a',
            stroke: '#666666',
            states: {
              hover: {
                fill: '#3a3a3a'
              }
            }
          }
        }
      }
    },
    credits: {
      enabled: false
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '600px',
        backgroundColor: '#1a1a1a',
        color: '#ffffff'
      }}>
        <div>Loading price data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '600px',
        backgroundColor: '#1a1a1a',
        color: '#ff6b6b'
      }}>
        <div>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '700px' }}>
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
      />
    </div>
  );
};

export default OnChainChart;
