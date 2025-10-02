import React, { useEffect, useRef, useState, useMemo } from 'react';
import Highcharts from 'highcharts/highstock';
import useWebSocketStore from '../../../store/websocketStore';
import { useAPI } from '../../../hooks/useAPI';

// Import and initialize Highcharts modules
import 'highcharts/modules/price-indicator';
import 'highcharts/modules/exporting';
import 'highcharts/modules/accessibility';
import 'highcharts/themes/adaptive';

const MiniPriceChart = ({ 
    containerId = 'container',
    assetIdentifier = 'BTCUSDT',
}) => {
    const chartRef = useRef(null);
    const [chart, setChart] = useState(null);
    
    // useAPI 훅 사용 (정규화된 데이터 포함)
    const { data: apiResponse, loading: isLoading, error } = useAPI.realtime.pricesPg({
        asset_identifier: assetIdentifier,
        data_interval: '15m', // 이 파라미터는 현재 API에서 사용되지 않습니다.
        limit: 500 // 가져올 데이터 포인트 수를 늘립니다.
    });
    
    // WebSocket 데이터 가져오기
    const wsPrices = useWebSocketStore((state) => state.prices);
    
    // WebSocket 구독만 담당 (연결 관리는 뷰 레벨에서 처리)
    useEffect(() => {
        const { subscribeSymbols, unsubscribeSymbols, connected } = useWebSocketStore.getState();
        
        // 연결 상태 확인 후 구독
        if (connected) {
            console.log(`[MiniPriceChart - ${assetIdentifier}] 구독 시작`);
            subscribeSymbols([assetIdentifier]);
        } else {
            console.log(`[MiniPriceChart - ${assetIdentifier}] WebSocket 연결 안됨, 구독 대기`);
        }
        
        return () => {
            console.log(`[MiniPriceChart - ${assetIdentifier}] 구독 해제`);
            unsubscribeSymbols([assetIdentifier]);
        };
    }, [assetIdentifier]);

    // WebSocket 연결 상태 변화 감지하여 자동 구독
    const connected = useWebSocketStore((state) => state.connected);
    useEffect(() => {
        if (connected) {
            const { subscribeSymbols } = useWebSocketStore.getState();
            console.log(`[MiniPriceChart - ${assetIdentifier}] 연결됨, 구독 시작`);
            subscribeSymbols([assetIdentifier]);
        }
    }, [connected, assetIdentifier]);
    
    // API 데이터를 Highcharts 형식으로 변환하고 정렬
    const chartData = useMemo(() => {
        if (!apiResponse?.quotes || apiResponse.quotes.length === 0) {
            return [];
        }
        
        const convertedData = apiResponse.quotes
            .map(quote => {
                const timestamp = new Date(quote.timestamp_utc).getTime();
                // 유효하지 않은 타임스탬프(NaN, 0 등) 필터링
                if (!timestamp || !isFinite(timestamp)) {
                    return null;
                }
                return [timestamp, parseFloat(quote.price)];
            })
            .filter(point => point !== null)
            .sort((a, b) => a[0] - b[0]); // 시간순으로 정렬
        
        return convertedData;
    }, [apiResponse, assetIdentifier]);

    // xAxis 범위 계산 (한 곳에서만 관리)
    const xAxisRange = useMemo(() => {
        if (chartData.length === 0) {
            return { min: null, max: null };
        }
        
        const timestamps = chartData.map(point => point[0]);
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        
        // 좌측 패딩: 5% 여유, 우측 패딩: 4시간 추가
        const timeSpan = maxTime - minTime;
        const leftPadding = timeSpan * 0.05;
        const rightPadding = 4 * 60 * 60 * 1000; // 4시간 (밀리초)
        
        return {
            min: minTime - leftPadding,
            max: maxTime + rightPadding
        };
    }, [chartData]);

    // 실시간 가격 업데이트 (원본 더미 데이터 로직)

           // WebSocket 데이터 감시 및 실시간 업데이트
           useEffect(() => {
               if (!chart) return;
               
               // 안전한 series 접근
               if (!chart.series || !Array.isArray(chart.series) || chart.series.length === 0) return;
               const series = chart.series[0];
               if (!series) return;        
               
               // 연결 상태와 관계없이 데이터가 있으면 사용
               if (wsPrices[assetIdentifier]) {
                   const { price, timestamp_utc } = wsPrices[assetIdentifier];
                   
                   // 데이터 유효성 검증
                   const timestamp = new Date(timestamp_utc).getTime();
                   const priceValue = parseFloat(price);
                   
                   // 유효하지 않은 데이터 필터링
                   if (!timestamp || !isFinite(timestamp) || !priceValue || !isFinite(priceValue)) {
                       return;
                   }
                   
                   const point = [timestamp, priceValue];
                   const lastPoint = series.data[series.data.length - 1];
                   
                   // temp_debug.js 방식: 시간을 1분씩 증가시키며 좌측 이동
                   const currentTime = Date.now();
                   const timeDiff = currentTime - point[0];
                   
                   // 1분 이상 차이나면 새 포인트 추가 (좌측 이동)
                   if (timeDiff >= 60 * 1000) {
                       const newTime = point[0] + (60 * 1000); // 1분 추가
                       const newPoint = [newTime, point[1]]; // 같은 가격으로 새 포인트
                       series.addPoint(newPoint, true, false); // 자동 리드롤로 좌측 이동
                   } else {
                       // 같은 시간대면 업데이트
                       lastPoint.update(point, true);
                   }
                   
                   // yAxis plotLine 업데이트 (값 정규화)
                   const isRising = point[1] >= (lastPoint?.y ?? point[1]);
                   const lineColor = isRising ? '#18c58f' : '#ff4d4f';
                   chart.yAxis[0].update({
                       plotLines: [{
                           value: Math.round(point[1] * 100) / 100, // 소수점 2자리로 제한
                           color: lineColor,
                           label: { text: `Current: ${point[1].toFixed(2)}`, style: { color: lineColor } },
                           id: 'current-price-line'
                       }]
                   });
               }
           }, [chart, wsPrices, assetIdentifier]);

    useEffect(() => {
        if (!chartRef.current) return;
        if (isLoading || chartData.length === 0) {
            return;
        }

        const options = {
            title: {
                text: `${assetIdentifier} Price Chart`,
                style: {
                    color: '#E0E0E3'
                }
            },

            xAxis: {
                type: 'datetime',
                // xAxisRange 상태 사용 (우측 4시간 패딩 포함)
                min: xAxisRange.min,
                max: xAxisRange.max,
                gridLineColor: '#404040',
                labels: {
                    style: {
                        color: '#A0A0A0'
                    }
                },
                lineColor: '#707073',
                tickColor: '#707073',
                title: {
                    style: {
                        color: '#A0A0A0'
                    }
                }
            },

            rangeSelector: {
                enabled: false
            },

            navigator: {
                enabled: false
            },

            series: [{
                type: 'line',
                name: 'Price',
                color: '#00d4ff',
                lineWidth: 2,
                marker: {
                    enabled: false  // 포인트 마커 삭제
                },
                data: chartData
            }],

            yAxis: {
                opposite: true,
                gridLineColor: '#404040',
                labels: {
                    style: {
                        color: '#A0A0A0'
                    },
                    align: 'left',
                    x: 15
                },
                title: {
                    text: 'Price (USD)',
                    style: { color: '#A0A0A0' }
                },
                plotLines: [{
                    value: chartData[chartData.length - 1][1], // 마지막 가격
                    color: '#18c58f', // 기본 상승 색상
                    dashStyle: 'solid',
                    width: 0.5,
                    label: {
                        text: 'Current Price: ' + chartData[chartData.length - 1][1].toFixed(2),
                        align: 'right',
                        x: -100,
                        style: {
                            color: '#18c58f',
                            fontWeight: 'bold'
                        }
                    },
                    id: 'current-price-line'
                }]
            },

            chart: {
                backgroundColor: '#1a1a1a',
                style: {
                    fontFamily: 'Inter, sans-serif'
                }
                // 실시간 업데이트를 위해 load 이벤트 제거
            }
        };

        // Create the chart with error handling
        let newChart;
        try {
            newChart = Highcharts.stockChart(chartRef.current, options);
            setChart(newChart);
            
            // temp_debug.js와 동일: 100ms마다 좌측 이동
            const intervalId = setInterval(() => {
                if (newChart && newChart.series && newChart.series[0]) {
                    const series = newChart.series[0];
                    const data = series.options.data;
                    if (data && data.length > 0) {
                        // 마지막 포인트의 시간을 1분 앞으로 이동 (temp_debug.js와 동일)
                        const lastPoint = data[data.length - 1];
                        const newTime = lastPoint[0] + (60 * 1000); // 1분 추가
                        const newPoint = [newTime, lastPoint[1]]; // 같은 가격으로 새 포인트
                        series.addPoint(newPoint, true, false,true); // 자동 리드롤로 좌측 이동
                    }
                }
            }, 60000); // 100ms마다 실행 (temp_debug.js와 동일)
            
            // 정리 함수에 interval 제거
            return () => {
                clearInterval(intervalId);
                if (newChart) {
                    newChart.destroy();
                    setChart(null);
                }
            };
            
        } catch (error) {
            console.error(`[MiniPriceChart - ${assetIdentifier}] Chart creation error:`, error);
            console.error(`[MiniPriceChart - ${assetIdentifier}] Chart data:`, chartData);
            return;
        }

    }, [assetIdentifier, chartData, isLoading]); // API 데이터와 로딩 상태에 따라 차트 재렌더링


    return (
        <div 
            ref={chartRef} 
            id={containerId}
            style={{ width: '100%', height: '400px', backgroundColor: '#1a1a1a' }}
        />
    );
};

export default MiniPriceChart;
