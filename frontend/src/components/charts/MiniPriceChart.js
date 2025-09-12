import React, { useRef, useEffect, useState } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { useDelaySparkline, useRealtimePrices } from '../../hooks/useRealtimePrices';

// Load Highcharts modules
import 'highcharts/modules/price-indicator';
import 'highcharts/modules/exporting';
import 'highcharts/modules/accessibility';

const MiniPriceChart = ({ assetIdentifier }) => {
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Fallback data for testing
  const fallbackData = [
    [Date.now() - 3600000, 100], // 1 hour ago
    [Date.now() - 1800000, 101], // 30 minutes ago
    [Date.now() - 900000, 102],  // 15 minutes ago
    [Date.now(), 103]            // now
  ];

  // Get initial chart data from delay API
  const { data: delayData, isLoading: delayLoading } = useDelaySparkline(
    assetIdentifier ? [assetIdentifier] : [],
    '15m',
    96
  );

  // Get real-time price updates (faster updates like original)
  const { data: realtimeData } = useRealtimePrices(
    assetIdentifier ? [assetIdentifier] : [],
    'crypto',
    { refetchInterval: 1000 } // 1초마다 업데이트 (원본처럼 빠르게)
  );

  // Process delay data for initial chart
  useEffect(() => {
    if (delayData && assetIdentifier && delayData[assetIdentifier]) {
      const points = delayData[assetIdentifier];
      
      if (Array.isArray(points) && points.length > 0) {
        // Convert to simple relative timestamps to avoid future date issues
        const now = Date.now();
        const formattedData = points
          .map((point, index) => {
            // Use relative time from now (1 hour apart for each point to create longer range)
            const timestamp = now - (points.length - index - 1) * 60 * 60 * 1000;
            const price = parseFloat(point.price);
            return isNaN(price) ? null : [timestamp, price];
          })
          .filter(point => point !== null);
        
        if (formattedData.length > 0) {
          // 데이터 범위 디버깅 (주석처리)
          // const firstTime = new Date(formattedData[0][0]);
          // const lastTime = new Date(formattedData[formattedData.length - 1][0]);
          // const timeRange = (formattedData[formattedData.length - 1][0] - formattedData[0][0]) / (1000 * 60 * 60); // 시간 단위
          // console.log('데이터 범위:', {
          //   포인트수: formattedData.length,
          //   시작시간: firstTime.toLocaleString(),
          //   종료시간: lastTime.toLocaleString(),
          //   시간범위: `${timeRange.toFixed(1)}시간`
          // });
          
          setChartData(formattedData);
          setIsInitialized(true);
        }
      }
    }
  }, [delayData, assetIdentifier]);

  // Update chart with real-time data (like original temp_debug.js)
  useEffect(() => {
    if (realtimeData && assetIdentifier && realtimeData[assetIdentifier] && isInitialized) {
      const latestPrice = realtimeData[assetIdentifier];
      if (latestPrice && latestPrice.price) {
        const newPrice = parseFloat(latestPrice.price);
        
        // Only update if price is valid
        if (!isNaN(newPrice)) {
          // Compare quotes-delay-price last data with quotes-price
          if (delayData && delayData[assetIdentifier] && delayData[assetIdentifier].length > 0) {
            const lastDelayPoint = delayData[assetIdentifier][delayData[assetIdentifier].length - 1];
            const delayPrice = parseFloat(lastDelayPoint.price);
            const priceDiff = newPrice - delayPrice;
            const priceDiffPercent = ((priceDiff / delayPrice) * 100).toFixed(2);
            
            // Calculate time difference
            const delayTime = new Date(lastDelayPoint.timestamp_utc || lastDelayPoint.timestamp);
            const realtimeTime = new Date();
            const timeDiffMs = realtimeTime - delayTime;
            const timeDiffMinutes = Math.round(timeDiffMs / (1000 * 60));
            
            // Add random variation for display
            const randomVariation = (Math.random() - 0.5) * 0.004; // ±0.2% range
            const variedPrice = parseFloat((newPrice * (1 + randomVariation)).toFixed(4));
            
            console.log('📊 데이터 비교:', {
              'quotes-delay-price (마지막)': {
                timestamp: lastDelayPoint.timestamp_utc || lastDelayPoint.timestamp,
                price: delayPrice,
                '시간차(분)': timeDiffMinutes
              },
              'quotes-price (실시간)': {
                timestamp: realtimeTime.toISOString(),
                price: newPrice
              },
              '차트표시가격 (랜덤변화)': {
                price: variedPrice,
                '변화율': `${(randomVariation * 100).toFixed(2)}%`
              },
              '차이': {
                절대값: priceDiff.toFixed(4),
                비율: `${priceDiffPercent}%`
              }
            });
          }
          
          setChartData(prevData => {
            if (prevData.length === 0) return [[Date.now(), newPrice]];
            
            const newData = [...prevData];
            const lastPoint = newData[newData.length - 1];
            const currentTime = Date.now();
            
            // Add random variation like temp_debug.js (±0.2% range)
            const randomVariation = (Math.random() - 0.5) * 0.004; // ±0.2% range
            const variedPrice = parseFloat((newPrice * (1 + randomVariation)).toFixed(4));
            
            // Add new point every 15 seconds (like original)
            if (currentTime - lastPoint[0] >= 15000) {
              newData.push([currentTime, variedPrice]);
              
              // Keep only last 200 points
              if (newData.length > 200) {
                newData.shift(); // Remove first point
              }
            } else {
              // Update last point with varied price
              newData[newData.length - 1] = [lastPoint[0], variedPrice];
            }
            
            return newData;
          });
        }
      }
    }
  }, [realtimeData, assetIdentifier, isInitialized, delayData]);


  // Chart options with real data
const options = {
    title: {
        text: assetIdentifier ? `${assetIdentifier} Price Chart` : 'Real-time Price Chart'
    },

    xAxis: {
        type: 'datetime',
        overscroll: 500000,
        gridLineWidth: 1,
        min: null,
        max: null,
        ordinal: false,
        breaks: [],
        dateTimeLabelFormats: {
            millisecond: '%H:%M:%S.%L',
            second: '%H:%M:%S',
            minute: '%H:%M',
            hour: '%H:%M',
            day: '%m/%d',
            week: '%m/%d',
            month: '%m/%Y',
            year: '%Y'
        }
    },

    rangeSelector: {
        buttons: [{
            type: 'minute',
            count: 15,
            text: '15m'
        }, {
            type: 'minute',
            count: 120,
            text: '1h'
        },
        {type: 'minute',
            count: 240,
            text: '4h'
        },
        {
            type: 'all',
            count: 1,
            text: 'All'
        }],
        selected: 2,
        inputEnabled: false
    },

    navigator: {
        series: {
            color: '#000000'
        }
    },

    tooltip: {
        dateTimeLabelFormats: {
            millisecond: '%m/%d %H:%M:%S.%L',
            second: '%m/%d %H:%M:%S',
            minute: '%m/%d %H:%M',
            hour: '%m/%d %H:%M',
            day: '%m/%d',
            week: '%m/%d',
            month: '%m/%Y',
            year: '%Y'
        }
    },

    series: [{
        type: 'spline',
        name: 'Price',
        color: '#00d4ff',
        data: chartData.length > 0 ? chartData : fallbackData,
        animation: {
            duration: 300
        },
        lineWidth: 2,
        marker: {
            enabled: false
        }
    }],

    // Real-time chart behavior like original
    chart: {
    events: {
        load() {
                const chart = this;

                // Auto-scroll to latest data
                chart.xAxis[0].setExtremes(null, null, true, false);

                // Set up real-time updates
            setInterval(() => {
                    if (chart.series && chart.series[0] && chart.series[0].data) {
                        const series = chart.series[0];
                        const dataLength = series.data.length;
                        
                        if (dataLength > 0) {
                            // Auto-scroll to show latest data
                            const lastPoint = series.data[dataLength - 1];
                            const xAxis = chart.xAxis[0];
                            const currentRange = xAxis.max - xAxis.min;
                            
                            // Move the visible range to show latest data
                            xAxis.setExtremes(
                                lastPoint.x - currentRange,
                                lastPoint.x,
                                true,
                                false
                            );
                        }
                    }
                }, 1000); // Check every second
            }
        }
    }
};

  // Show loading state only if we have no data at all
  if (delayLoading && chartData.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '700px',
        backgroundColor: '#1a1a1a',
        color: '#ffffff'
      }}>
        <div>Loading chart data...</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '700px' }}>
      <HighchartsReact
        highcharts={Highcharts}
        constructorType={'stockChart'}
        options={options}
        ref={chartRef}
        callback={(chart) => {
          // Add error handling for chart
          if (chart && typeof chart.on === 'function') {
            chart.on('error', (e) => {
              console.warn('Chart error:', e);
            });
          }
        }}
      />
    </div>
  );
};

export default MiniPriceChart;