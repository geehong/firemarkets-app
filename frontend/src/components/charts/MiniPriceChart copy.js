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
  const [basePrice, setBasePrice] = useState(null); // 기준 가격 저장
  const [initialPrice, setInitialPrice] = useState(null); // 초기 가격 저장 (상대적 변화율 계산용)
  const [yAxisRange, setYAxisRange] = useState({ min: null, max: null }); // Y축 범위 고정
  const [xAxisRange, setXAxisRange] = useState({ min: null, max: null }); // X축 범위 고정
  
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

  // Get real-time price updates (15초마다 API 호출)
  const { data: realtimeData } = useRealtimePrices(
    assetIdentifier ? [assetIdentifier] : [],
    'crypto',
    { refetchInterval: 15000 } // 15초마다 API 호출
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
            const timestamp = Math.round(now - (points.length - index - 1) * 60 * 60 * 1000);
            const price = parseFloat(point.price);
            // 안전한 데이터 포맷팅 (소수점 자릿수 제한)
            const safePrice = isNaN(price) ? null : parseFloat(price.toFixed(4));
            return safePrice === null ? null : [timestamp, safePrice];
          })
          .filter(point => point !== null);
        
        if (formattedData.length > 0) {
          // Y축 범위 계산 및 고정
          const prices = formattedData.map(point => point[1]);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const priceRange = maxPrice - minPrice;
          const padding = priceRange * 0.1; // 10% 패딩
          
          setYAxisRange({
            min: parseFloat((minPrice - padding).toFixed(4)),
            max: parseFloat((maxPrice + padding).toFixed(4))
          });
          
          // X축 범위 계산 및 고정 (데이터 전체 범위)
          const timestamps = formattedData.map(point => point[0]);
          const minTime = Math.min(...timestamps);
          const maxTime = Math.max(...timestamps);
          
          setXAxisRange({
            min: Math.round(minTime),
            max: Math.round(maxTime)
          });
          
          // 네비게이터 초기 선택 범위 계산 (전체 기간의 80%)
          const totalTimeRange = maxTime - minTime;
          const navigatorRange = totalTimeRange * 0.8; // 전체 기간의 80%
          const navigatorMin = maxTime - navigatorRange; // 최신 시간에서 80% 범위만큼 전
          const navigatorMax = maxTime; // 최신 시간
          
          // 콘솔에 초기 축 범위 및 네비게이터 범위 출력
          console.log('📊 초기 축 범위 설정:', {
            'X축 (시간)': {
              min: new Date(minTime).toLocaleString(),
              max: new Date(maxTime).toLocaleString(),
              range: `${((maxTime - minTime) / (1000 * 60 * 60)).toFixed(1)}시간`
            },
            'Y축 (가격)': {
              min: minPrice.toFixed(2),
              max: maxPrice.toFixed(2),
              range: `${(maxPrice - minPrice).toFixed(2)}`,
              padding: `${padding.toFixed(2)} (10%)`
            },
            '네비게이터 초기 선택 (80%)': {
              min: new Date(navigatorMin).toLocaleString(),
              max: new Date(navigatorMax).toLocaleString(),
              range: `${((navigatorMax - navigatorMin) / (1000 * 60 * 60)).toFixed(1)}시간`,
              '전체 데이터 대비': `${(((navigatorMax - navigatorMin) / (maxTime - minTime)) * 100).toFixed(1)}%`
            }
          });
          
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
          // Set initial price if not set
          if (!initialPrice) {
            setInitialPrice(newPrice);
          }
          
          // Update base price for random variation
          setBasePrice(newPrice);
          
          // 콘솔 로그는 새 포인트 추가시에만 출력 (아래에서 처리)
          
          // 15초마다 새 포인트 추가 (랜덤 변화는 별도 useEffect에서 처리)
          setChartData(prevData => {
            if (prevData.length === 0) return [[Date.now(), newPrice]];
            
            const newData = [...prevData];
            const lastPoint = newData[newData.length - 1];
            const currentTime = Date.now();
            
            // Add new point every 15 seconds
            if (currentTime - lastPoint[0] >= 15000) {
              // 안전한 데이터 포인트 추가 (소수점 자릿수 제한)
              const safePrice = parseFloat(newPrice.toFixed(4));
              const safeTime = Math.round(currentTime);
              newData.push([safeTime, safePrice]);
              
              // Keep only last 200 points
              if (newData.length > 200) {
                newData.shift(); // Remove first point
              }
              
              // 콘솔 로그는 새 포인트가 추가될 때만 출력
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
                
                console.log('📊 새 포인트 추가 - 데이터 비교:', {
                  'quotes-delay-price (마지막)': {
                    timestamp: lastDelayPoint.timestamp_utc || lastDelayPoint.timestamp,
                    price: delayPrice,
                    '시간차(분)': timeDiffMinutes
                  },
                  'quotes-price (실시간)': {
                    timestamp: realtimeTime.toISOString(),
                    price: newPrice
                  },
                  '기준가격 (basePrice)': {
                    price: newPrice
                  },
                  '차이': {
                    절대값: priceDiff.toFixed(4),
                    비율: `${priceDiffPercent}%`
                  }
                });
              }
            }
            
            return newData;
          });
        }
      }
    }
  }, [realtimeData, assetIdentifier, isInitialized, delayData]);

  // 500ms마다 랜덤 변화 적용 (원래 기능)
  useEffect(() => {
    if (!basePrice || !isInitialized || !initialPrice) return;

    const interval = setInterval(() => {
      setChartData(prevData => {
        if (prevData.length === 0) return prevData;
        
        const newData = [...prevData];
        const lastPoint = newData[newData.length - 1];
        
        // Add random variation (0.1~0.5% range)
        const randomVariation = (Math.random() * 0.004) + 0.001; // 0.1~0.5% range
        const isPositive = Math.random() > 0.5; // 50% 확률로 양수/음수
        const finalVariation = isPositive ? randomVariation : -randomVariation;
        const variedPrice = parseFloat((basePrice * (1 + finalVariation)).toFixed(4));
        
        // 안전한 데이터 업데이트 (소수점 자릿수 제한)
        const safePrice = parseFloat(variedPrice.toFixed(4));
        const safeTime = Math.round(lastPoint[0]); // 시간은 변경하지 않음
        newData[newData.length - 1] = [safeTime, safePrice];
        
        return newData;
      });
    }, 500); // 500ms마다 업데이트

    return () => clearInterval(interval);
  }, [basePrice, isInitialized, initialPrice]);


  // Chart options with real data
const options = {
    title: {
        text: assetIdentifier ? `${assetIdentifier} Price Chart` : 'Real-time Price Chart'
    },

    xAxis: {
        type: 'datetime',
        overscroll: 500000,
        gridLineWidth: 1,
        min: xAxisRange.min,
        max: xAxisRange.max,
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
        },
        // SVG 에러 방지를 위한 추가 설정
        minPadding: 0,
        maxPadding: 0
    },

    yAxis: {
        // Y축 범위 고정 (초기 데이터 기준)
        min: yAxisRange.min,
        max: yAxisRange.max,
        minPadding: 0,
        maxPadding: 0,
        startOnTick: false,
        endOnTick: false
    },

    rangeSelector: {
        buttons: [{
            type: 'minute',
            count: 15,
            text: '15m'
        }, {
            type: 'minute',
            count: 1000,
            text: '1h'
        },
        {
            type: 'hour',
            count: 48, // 48시간 (약 2일) - 전체 데이터의 80%에 해당
            text: '4h'
        },
        {
            type: 'all',
            count: 1,
            text: 'All'
        }],
        selected: 2,
        inputEnabled: false,
        events: {
            select(e) {
                const chart = this;
                const buttonIndex = e.buttonIndex;
                
                // "4h" 버튼 (index 2) 클릭 시 80% 범위 설정
                if (buttonIndex === 2) {
                    setTimeout(() => {
                        if (chart.xAxis && chart.xAxis[0]) {
                            const xAxis = chart.xAxis[0];
                            const dataMin = xAxis.dataMin;
                            const dataMax = xAxis.dataMax;
                            
                            if (dataMin && dataMax) {
                                const totalRange = dataMax - dataMin;
                                const navigatorRange = totalRange * 0.8; // 80% 범위
                                const navigatorMin = dataMax - navigatorRange;
                                const navigatorMax = dataMax;
                                
                                console.log('🎯 4h 버튼 클릭 - 80% 범위 설정:', {
                                    '설정할 범위': {
                                        min: new Date(navigatorMin).toLocaleString(),
                                        max: new Date(navigatorMax).toLocaleString(),
                                        range: `${((navigatorMax - navigatorMin) / (1000 * 60 * 60)).toFixed(1)}시간`
                                    }
                                });
                                
                                xAxis.setExtremes(navigatorMin, navigatorMax);
                            }
                        }
                    }, 50);
                }
            }
        }
    },

    navigator: {
        series: {
            color: '#000000'
        },
        xAxis: {
            dateTimeLabelFormats: {
                millisecond: '%H:%M:%S.%L',
                second: '%H:%M:%S',
                minute: '%H:%M',
                hour: '%H:%M',
                day: '%m/%d',
                week: '%m/%d',
                month: '%m/%d',
                year: '%Y'
            }
        },
        yAxis: {
            // 네비게이터 Y축 범위 고정 (메인 차트와 동일)
            min: yAxisRange.min,
            max: yAxisRange.max,
            minPadding: 0,
            maxPadding: 0,
            startOnTick: false,
            endOnTick: false
        },
        // 네비게이터 초기 선택 범위 설정 (전체 데이터의 80%)
        enabled: true,
        height: 40,
        margin: 2
    },

    tooltip: {
        enabled: false
    },

    series: [{
        type: 'spline',
        name: 'Price',
        color: '#00d4ff',
        data: chartData.length > 0 ? chartData : fallbackData,
        animation: false, // 시리즈 애니메이션 비활성화
        lineWidth: 2,
    }],

    // 고정된 축 범위로 차트 표시
    chart: {
        animation: false, // 애니메이션 비활성화로 SVG 에러 방지
        events: {
            load() {
                const chart = this;
                // 고정된 축 범위 사용 (동적 스크롤 제거)
                
                // SVG 에러 방지를 위한 추가 설정
                if (chart.renderer && chart.renderer.globalAnimation) {
                    chart.renderer.globalAnimation = false;
                }
                
                // 네비게이터 초기 선택 범위 설정 (전체 데이터의 80%)
                setTimeout(() => {
                    if (chart.xAxis && chart.xAxis[0]) {
                        const xAxis = chart.xAxis[0];
                        const dataMin = xAxis.dataMin;
                        const dataMax = xAxis.dataMax;
                        
                        if (dataMin && dataMax) {
                            const totalRange = dataMax - dataMin;
                            const navigatorRange = totalRange * 0.8; // 80% 범위
                            const navigatorMin = dataMax - navigatorRange;
                            const navigatorMax = dataMax;
                            
                            console.log('🎯 네비게이터 초기 범위 설정:', {
                                '전체 데이터 범위': {
                                    min: new Date(dataMin).toLocaleString(),
                                    max: new Date(dataMax).toLocaleString(),
                                    range: `${((dataMax - dataMin) / (1000 * 60 * 60)).toFixed(1)}시간`
                                },
                                '설정할 네비게이터 범위 (80%)': {
                                    min: new Date(navigatorMin).toLocaleString(),
                                    max: new Date(navigatorMax).toLocaleString(),
                                    range: `${((navigatorMax - navigatorMin) / (1000 * 60 * 60)).toFixed(1)}시간`
                                }
                            });
                            
                            // 네비게이터 범위 설정
                            xAxis.setExtremes(navigatorMin, navigatorMax);
                        }
                    }
                    
                    // 네비게이터 Y축 범위 고정 설정
                    if (chart.navigator && chart.navigator.yAxis) {
                        const navigatorYAxis = chart.navigator.yAxis;
                        navigatorYAxis.setExtremes(yAxisRange.min, yAxisRange.max);
                        
                        console.log('🎯 네비게이터 Y축 범위 고정:', {
                            'Y축 범위': {
                                min: yAxisRange.min,
                                max: yAxisRange.max,
                                range: `${(yAxisRange.max - yAxisRange.min).toFixed(2)}`
                            }
                        });
                    }
                    
                }, 100);
                
            },
            error(e) {
                console.warn('Chart rendering error:', e);
                // 에러 발생 시 차트 재렌더링 시도
                if (this && this.redraw) {
                    setTimeout(() => {
                        try {
                            this.redraw();
                        } catch (err) {
                            console.error('Chart redraw failed:', err);
                        }
                    }, 100);
                }
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