import React, { useRef, useEffect, useState } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { useDelaySparkline, useRealtimePrices } from '../../hooks/useRealtimePrices';

// Load Highcharts modules
import 'highcharts/modules/price-indicator';
import 'highcharts/modules/exporting';
import 'highcharts/modules/accessibility';

const MiniPriceChartItem = ({ assetIdentifier }) => {
  const chartRef = useRef(null);
  const containerRef = useRef(null);
  const [chartData, setChartData] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [basePrice, setBasePrice] = useState(null); // 기준 가격 저장
  const [initialPrice, setInitialPrice] = useState(null); // 초기 가격 저장 (상대적 변화율 계산용)
  const [yAxisRange, setYAxisRange] = useState({ min: null, max: null }); // Y축 범위 고정
  const [xAxisRange, setXAxisRange] = useState({ min: null, max: null }); // X축 범위 고정
  const [lastPointDirection, setLastPointDirection] = useState(null); // 'up' | 'down' | 'flat'
  // 화면 크기 상태 제거 - 모든 화면에서 동일한 설정 사용
  
  // 마지막 가격 포인터에 "빛나는" 효과를 주기 위한 CSS
  const glowingMarkerStyle = `
    @keyframes glowing {
      0% { filter: drop-shadow(0 0 3px #00d4ff); }
      50% { filter: drop-shadow(0 0 10px #00d4ff) drop-shadow(0 0 10px #00d4ff); }
      100% { filter: drop-shadow(0 0 3px #00d4ff); }
    }
    .highcharts-last-point-marker .highcharts-point {
      animation: glowing 1.5s infinite;
      transition: transform 0.5s ease-out;
    }
  `;
  
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
    { refetchInterval: 3000 } // 3초마다 API 호출로 빈도 감소
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
          
          // 모든 화면에서 동일한 패딩 적용
          const rightPaddingMs = 4 * 60 * 60 * 1000; // +4h
          const leftPaddingMs = 2 * 60 * 60 * 1000; // +2h
          
          setXAxisRange({
            min: Math.round(minTime - leftPaddingMs),
            max: Math.round(maxTime + rightPaddingMs)
          });
          
          // 네비게이터 초기 선택 범위 계산 (전체 기간의 80%)
          const effectiveMaxForCalc = maxTime + rightPaddingMs;
          const effectiveMinForCalc = minTime - leftPaddingMs;
          const totalTimeRange = effectiveMaxForCalc - effectiveMinForCalc;
          const navigatorRange = totalTimeRange * 0.8; // 전체 기간의 80%
          const navigatorMin = effectiveMaxForCalc - navigatorRange; // 최신+패딩에서 80% 범위만큼 전
          const navigatorMax = effectiveMaxForCalc; // 최신 시간 + 패딩
          
          // 콘솔에 초기 축 범위 및 네비게이터 범위 출력
          console.log('📊 초기 축 범위 설정:', {
            '화면 타입': '통일된 설정',
            'X축 (시간)': {
              min: new Date(minTime).toLocaleString(),
              max: new Date(maxTime).toLocaleString(),
              range: `${((maxTime - minTime) / (1000 * 60 * 60)).toFixed(1)}시간`
            },
            'X축 패딩': {
              left: `${(leftPaddingMs / (1000 * 60 * 60)).toFixed(1)}시간`,
              right: `${(rightPaddingMs / (1000 * 60 * 60)).toFixed(1)}시간`,
              total: `${((leftPaddingMs + rightPaddingMs) / (1000 * 60 * 60)).toFixed(1)}시간`
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
              // 방향 계산 (이전 포인트 대비)
              if (lastPoint && typeof lastPoint[1] === 'number') {
                if (safePrice > lastPoint[1]) setLastPointDirection('up');
                else if (safePrice < lastPoint[1]) setLastPointDirection('down');
                else setLastPointDirection('flat');
              }
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

  // 1500ms마다 랜덤 변화 적용 (빈도 감소)
  useEffect(() => {
    if (!basePrice || !isInitialized || !initialPrice) return;

    const interval = setInterval(() => {
      setChartData(prevData => {
        if (prevData.length === 0) return prevData;
        
        const newData = [...prevData];
        const lastPoint = newData[newData.length - 1];
        
        // Add random variation (0.01~0.05% range)
        const randomVariation = (Math.random() * 0.0004) + 0.0001; // 0.01~0.05% range
        const isPositive = Math.random() > 0.5; // 50% 확률로 양수/음수
        const finalVariation = isPositive ? randomVariation : -randomVariation;
        const variedPrice = parseFloat((basePrice * (1 + finalVariation)).toFixed(4));
        
        // 안전한 데이터 업데이트 (소수점 자릿수 제한)
        const safePrice = parseFloat(variedPrice.toFixed(4));
        const safeTime = Math.round(lastPoint[0]); // 시간은 변경하지 않음
        // 방향 계산 (이전 포인트 대비)
        if (lastPoint && typeof lastPoint[1] === 'number') {
          if (safePrice > lastPoint[1]) setLastPointDirection('up');
          else if (safePrice < lastPoint[1]) setLastPointDirection('down');
          else setLastPointDirection('flat');
        }
        newData[newData.length - 1] = [safeTime, safePrice];
        
        return newData;
      });
    }, 1500); // 1.5초마다 업데이트

    return () => clearInterval(interval);
  }, [basePrice, isInitialized, initialPrice]);

  // 화면 크기 변경 감지 제거 - 모든 화면에서 동일한 설정 사용

  // 티커를 기반으로 차트 타이틀 생성
  const getChartTitle = (ticker) => {
    if (!ticker) return 'Real-time Price Chart'
    
    // 티커별 표시명 매핑 (회사명(티커) 형식)
    const tickerMap = {
      'BTCUSDT': 'Bitcoin (BTCUSDT)',
      'ETHUSDT': 'Ethereum (ETHUSDT)',
      'XRPUSDT': 'Ripple (XRPUSDT)',
      'ADAUSDT': 'Cardano (ADAUSDT)',
      'AVGO': 'Broadcom Inc. (AVGO)',
      'TSLA': 'Tesla Inc. (TSLA)',
      'GCUSD': 'Gold Spot (GCUSD)',
      'AAPL': 'Apple Inc. (AAPL)',
      'MSFT': 'Microsoft Corporation (MSFT)',
      'AMZN': 'Amazon.com, Inc. (AMZN)',
      'NVDA': 'NVIDIA Corporation (NVDA)',
      'GOOG': 'Alphabet Inc. (GOOG)',
      'META': 'Meta Platforms Inc. (META)',
      'SPY': 'SPDR S&P 500 ETF Trust (SPY)',
      'QQQ': 'Invesco QQQ Trust (QQQ)'
    }
    
    return tickerMap[ticker] || `${ticker} Price Chart`
  }

  // Chart options with real data
const options = {
    title: {
        text: getChartTitle(assetIdentifier),
        style: { color: '#ffffff' }
    },

    chart: {
        backgroundColor: '#1a1a1a',
        style: { fontFamily: 'Inter, sans-serif' },
        animation: false, // 애니메이션 비활성화로 SVG 에러 방지
        height: 300, // 모든 화면에서 300px
        events: {
            load() {
                const chart = this;
                if (chart.renderer && chart.renderer.globalAnimation) {
                    chart.renderer.globalAnimation = false;
                }
            },
            error(e) {
                console.warn('Chart rendering error:', e);
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
    },

    xAxis: {
        type: 'datetime',
        overscroll: 14400000, // 모든 화면에서 4h
        gridLineWidth: 1,
        gridLineColor: '#333333',
        min: xAxisRange.min,
        max: xAxisRange.max,
        ordinal: false,
        breaks: [],
        labels: { style: { color: '#a0a0a0' } },
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
        endOnTick: false,
        gridLineColor: '#333333',
        labels: {
            style: { color: '#a0a0a0' },
            formatter: function () { return typeof this.value === 'number' ? this.value.toFixed(2) : this.value; }
        },
        lastVisiblePrice: {
            enabled: true,
            label: {
                enabled: true,
                style: { color: '#000000', fontWeight: 'bold' },
                backgroundColor: '#00d4ff',
                borderColor: '#ffffff',
                borderWidth: 1,
                borderRadius: 2,
                padding: 2
            }
        }
    },

    rangeSelector: {
        enabled: false, // 모든 화면에서 비활성화
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
                
                // "4h" 버튼 (index 2) 클릭 시 80% 범위 설정 (+4h padding 포함)
                if (buttonIndex === 2) {
                    setTimeout(() => {
                        if (chart.xAxis && chart.xAxis[0]) {
                            const xAxis = chart.xAxis[0];
                            const dataMin = xAxis.dataMin;
                            const dataMax = xAxis.dataMax;
                            const rightPaddingMs = 4 * 60 * 60 * 1000; // +4h padding
                            
                            if (dataMin && dataMax) {
                                const effectiveMax = dataMax + rightPaddingMs;
                                const totalRange = effectiveMax - dataMin;
                                const navigatorRange = totalRange * 0.8; // 80% 범위
                                const navigatorMin = effectiveMax - navigatorRange;
                                const navigatorMax = effectiveMax;
                                
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
        enabled: false, // 모든 화면에서 비활성화
        series: {
            // Extend navigator data to include right padding so the selection bar can extend visually
            data: (chartData && chartData.length > 0)
              ? [...chartData, [xAxisRange.max, chartData[chartData.length - 1][1]]]
              : [],
            color: '#66bfff' // brighter color for visibility
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
        height: 40,
        margin: 2
    },

    tooltip: {
        enabled: false
    },

    exporting: {
        enabled: false // 모든 화면에서 비활성화
    },

    series: [
        {
            type: 'spline',
            name: 'Price',
            color: '#00d4ff',
            data: chartData.length > 0 ? chartData : fallbackData,
            animation: false,
            lineWidth: 2
        },
        {
            id: 'last-point',
            type: 'spline',
            name: 'Last Price',
            data: chartData.length > 0 ? [chartData[chartData.length - 1]] : [],
            color: 'transparent',
            lineWidth: 0,
            className: 'highcharts-last-point-marker',
            marker: {
                enabled: true,
                symbol: 'circle',
                radius: 5,
                fillColor: lastPointDirection === 'down' ? '#ff4d4f' : '#00d4ff',
                lineColor: '#ffffff',
                lineWidth: 2
            },
            dataLabels: {
                enabled: true,
                formatter: function () { return typeof this.y === 'number' ? this.y.toFixed(2) : this.y; },
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                borderWidth: 0,
                borderRadius: 0,
                padding: 5,
                y: -30,
                style: { color: (lastPointDirection === 'down' ? '#ff4d4f' : '#00d4ff'), fontWeight: 'bold' }
            }
        }
    ]
};

  // Show loading state only if we have no data at all
  if (delayLoading && chartData.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '300px',
        minHeight: '300px',
        width: '100%',
        backgroundColor: '#1a1a1a',
        color: '#ffffff'
      }}>
        <div>Loading chart data...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '300px', minHeight: '300px' }}>
      <style>
        {glowingMarkerStyle}
        {`
          .highcharts-range-selector-group,
          .highcharts-exporting-group {
            display: none !important;
          }
          .highcharts-range-selector-buttons,
          .highcharts-exporting-group {
            display: none !important;
          }
        `}
        {`
          .highcharts-navigator,
          .highcharts-scrollbar {
            display: none !important;
          }
          .highcharts-navigator-container,
          .highcharts-scrollbar-container {
            display: none !important;
          }
        `}
        {`
          .highcharts-container {
            height: 300px !important;
            max-height: 300px !important;
          }
        `}
      </style>
      <HighchartsReact
        highcharts={Highcharts}
        constructorType={'stockChart'}
        options={options}
        ref={chartRef}
        containerProps={{ style: { height: '300px' } }}
        callback={(chart) => {
          // Add error handling for chart
          if (chart && typeof chart.on === 'function') {
            chart.on('error', (e) => {
              console.warn('Chart error:', e);
            });
          }
          
          // 모든 화면에서 Range selector와 Exporting 버튼 숨기기
          setTimeout(() => {
            const chartContainer = chart.container;
            if (chartContainer) {
              // Range selector 숨기기
              const rangeSelectors = chartContainer.querySelectorAll('.highcharts-range-selector-group, .highcharts-range-selector-buttons');
              rangeSelectors.forEach(el => {
                if (el) el.style.display = 'none';
              });
              
              // Exporting 버튼 숨기기
              const exportingGroups = chartContainer.querySelectorAll('.highcharts-exporting-group');
              exportingGroups.forEach(el => {
                if (el) el.style.display = 'none';
              });
            }
          }, 100);
          
          // 모든 화면에서 Navigator와 Scrollbar 숨기기
          setTimeout(() => {
            const chartContainer = chart.container;
            if (chartContainer) {
              // Navigator 숨기기
              const navigators = chartContainer.querySelectorAll('.highcharts-navigator, .highcharts-navigator-container');
              navigators.forEach(el => {
                if (el) el.style.display = 'none';
              });
              
              // Scrollbar 숨기기
              const scrollbars = chartContainer.querySelectorAll('.highcharts-scrollbar, .highcharts-scrollbar-container');
              scrollbars.forEach(el => {
                if (el) el.style.display = 'none';
              });
            }
          }, 100);
        }}
      />
    </div>
  );
};

const MiniPriceChart = ({ assetIdentifier, symbols }) => {
  if (Array.isArray(symbols) && symbols.length > 0) {
    return (
      <div style={{ width: '100%', padding: '4px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '4px'
          }}
        >
          {symbols.map((sym) => (
            <div key={sym} style={{ padding: '2px' }}>
              <MiniPriceChartItem assetIdentifier={sym} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return <MiniPriceChartItem assetIdentifier={assetIdentifier} />;
};

export default MiniPriceChart;