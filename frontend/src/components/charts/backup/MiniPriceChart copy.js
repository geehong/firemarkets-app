import React, { useEffect, useRef, useState, useMemo } from 'react';
import Highcharts from 'highcharts/highstock';
import useWebSocketStore from '../../../store/websocketStore';
import { useAPI } from '../../../hooks/useAPI';
import { usePeriodicAPI } from '../../../hooks/usePeriodicAPI';
import './MiniPriceChart.css';

// Import and initialize Highcharts modules
import 'highcharts/modules/price-indicator';
import 'highcharts/modules/accessibility';
import 'highcharts/themes/adaptive';

const MiniPriceChart = ({ 
    containerId = 'container',
    assetIdentifier = 'BTCUSDT',
    // 자산별 커스터마이징 옵션
    chartType = 'crypto', // 'crypto', 'commodities', 'stocks'
    useWebSocket = true,
    apiInterval = null, // API 호출 간격 (밀리초)
    marketHours = null, // 시장 개장시간 체크 함수
}) => {
    // 디버그 토글 (콘솔에서 window.__DEBUG_MINI_CHARTS__ = true 설정)
    const DEBUG = typeof window !== 'undefined' && window.__DEBUG_MINI_CHARTS__ === true;
    const chartRef = useRef(null);
    const [chart, setChart] = useState(null);
    const lastWebSocketPriceRef = useRef(null); // 이전 WebSocket 가격 저장 (객체: {price, timestamp})
    const lastApiPriceRef = useRef(null); // 이전 API 가격 저장 (객체: {price, timestamp})
    const [apiPrice, setApiPrice] = useState(null); // API 직접 호출 가격
    const [apiTimestamp, setApiTimestamp] = useState(null); // API 타임스탬프
    const [isMarketOpen, setIsMarketOpen] = useState(false); // 시장 개장 상태
    // 모바일 전용 UI 설정 제거: 데스크탑 고정 스타일 사용
    const lastApiCloseRef = useRef(null); // stocks 폐장시 참조할 마지막 API 종가
    const lastRealtimeUpdateAtRef = useRef(0); // 실시간 업데이트 스로틀용
    
    // 성능 계측용 카운터 (5초 샘플링 로그)
    const renderCountRef = useRef(0);
    const effectRunCountRef = useRef(0);
    const redrawCountRef = useRef(0);
    const wsTickCountRef = useRef(0);
    renderCountRef.current += 1;
    
    // useAPI 훅 사용 (정규화된 데이터 포함)
    const { data: apiResponse, loading: isLoading, error } = useAPI.realtime.pricesPg({
        asset_identifier: assetIdentifier,
        data_interval: '15m', // 이 파라미터는 현재 API에서 사용되지 않습니다.
        limit: 500 // 가져올 데이터 포인트 수를 늘립니다.
    });

    // 주기적 API 호출 (commodities 타입용, GCUSD/XAGUSD만 지원, delay-price 사용)
    const shouldPollCommodities = chartType === 'commodities' && ['GCUSD', 'SIUSD'].includes(assetIdentifier) && !!apiInterval;
    const fetchLatestPrice = async () => {
        if (!shouldPollCommodities) return null;
        try {
            const url = `https://firemarkets.net/api/v1/realtime/pg/quotes-delay-price?asset_identifier=${assetIdentifier}&limit=1`;
            const response = await fetch(url);
            if (!response.ok) return null; // 404 등은 조용히 무시
            const data = await response.json();
            return data;
        } catch (error) {
            console.warn(`[MiniPriceChart - ${assetIdentifier}] periodic fetch skipped:`, error?.message || error);
            return null;
        }
    };

    const { data: periodicData, loading: periodicLoading, error: periodicError } = usePeriodicAPI(
        fetchLatestPrice,
        shouldPollCommodities ? apiInterval : 0
    );
    
    // WebSocket 데이터 가져오기
    const wsPrices = useWebSocketStore((state) => state.prices);
    // WebSocket 수신 계측
    useEffect(() => {
        if (!DEBUG) return;
        if (wsPrices && wsPrices[assetIdentifier]) {
            wsTickCountRef.current += 1;
        }
    }, [wsPrices, assetIdentifier, DEBUG]);
    
    // WebSocket 구독 관리 (자산별 커스터마이징)
    const connected = useWebSocketStore((state) => state.connected);
    
    useEffect(() => {
        if (!useWebSocket) return;
        
        const { subscribeSymbols, unsubscribeSymbols } = useWebSocketStore.getState();
        
        // 시장 개장시간 체크 (stocks 타입인 경우)
        if (chartType === 'stocks' && marketHours) {
            const shouldSubscribe = marketHours() && connected;
            if (shouldSubscribe) {
                console.log(`[MiniPriceChart - ${assetIdentifier}] 시장 개장, WebSocket 구독 시작`);
                subscribeSymbols([assetIdentifier]);
            } else {
                console.log(`[MiniPriceChart - ${assetIdentifier}] 시장 폐장 또는 연결 안됨, WebSocket 구독 해제`);
                unsubscribeSymbols([assetIdentifier]);
            }
        } else if (connected) {
            // crypto, commodities 타입인 경우
            console.log(`[MiniPriceChart - ${assetIdentifier}] 구독 시작`);
            subscribeSymbols([assetIdentifier]);
        }
        
        return () => {
            console.log(`[MiniPriceChart - ${assetIdentifier}] 구독 해제`);
            unsubscribeSymbols([assetIdentifier]);
        };
    }, [assetIdentifier, connected, chartType, useWebSocket, marketHours]);
    
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

    // stocks 폐장시 사용할 마지막 API 종가를 별도 ref로 관리하여 실시간 effect 의존성에서 chartData를 제거
    useEffect(() => {
        if (Array.isArray(chartData) && chartData.length > 0) {
            const lastPoint = chartData[chartData.length - 1];
            lastApiCloseRef.current = { timestamp: lastPoint[0], price: lastPoint[1] };
        }
    }, [chartData]);

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

    // 주기적 API 데이터 처리 (commodities 타입인 경우)
    useEffect(() => {
        if (!shouldPollCommodities) return;
        if (periodicData) {
            const ts = periodicData?.timestamp_utc || periodicData?.timestamp || null;
            const price = periodicData?.price;
            const timestamp = ts ? new Date(ts).getTime() : null;
            const priceValue = parseFloat(price);
            if (timestamp && isFinite(timestamp) && priceValue && isFinite(priceValue)) {
                setApiPrice(priceValue);
                setApiTimestamp(timestamp);
            }
        }
    }, [shouldPollCommodities, periodicData]);

    // 시장 상태 체크 (stocks 타입인 경우) - 동작 유지, UI 반응형 제거와 무관
    useEffect(() => {
        if (chartType === 'stocks' && marketHours) {
            const checkMarketStatus = () => {
                const isOpen = marketHours();
                setIsMarketOpen(isOpen);
                console.log(`[MiniPriceChart - ${assetIdentifier}] 시장상태: ${isOpen ? '개장' : '폐장'}`);
            };
            checkMarketStatus();
            const intervalId = setInterval(checkMarketStatus, 60 * 1000);
            return () => clearInterval(intervalId);
        }
    }, [chartType, marketHours, assetIdentifier]);

    // 실시간 가격 업데이트 (통합 로직)
    useEffect(() => {
        if (!chart) return;
        
        // 안전한 series 접근
        if (!chart.series || !Array.isArray(chart.series) || chart.series.length === 0) return;
        const series = chart.series[0];
        if (!series) return;
        
        if (DEBUG) effectRunCountRef.current += 1;

        // 간단 스로틀: 120ms 이내 재호출은 건너뜀 (고빈도 틱 보호)
        const nowTs = Date.now();
        if (nowTs - (lastRealtimeUpdateAtRef.current || 0) < 120) {
            return;
        }

        let point, currentPrice, previousPrice, isRising;
        
        // 데이터 소스 결정
        if (chartType === 'crypto' && wsPrices[assetIdentifier]) {
            // Crypto: WebSocket 사용
            const { price, timestamp_utc } = wsPrices[assetIdentifier];
            const timestamp = new Date(timestamp_utc).getTime();
            const priceValue = parseFloat(price);
            
            if (!timestamp || !isFinite(timestamp) || !priceValue || !isFinite(priceValue)) {
                return;
            }
            
            point = [timestamp, priceValue];
            currentPrice = point[1];
            previousPrice = lastWebSocketPriceRef.current;
            lastWebSocketPriceRef.current = {price: currentPrice, timestamp: timestamp};
            
        } else if (chartType === 'commodities' && apiPrice && apiTimestamp) {
            // Commodities: API 직접 호출
            point = [apiTimestamp, apiPrice];
            currentPrice = point[1];
            previousPrice = lastApiPriceRef.current;
            lastApiPriceRef.current = {price: currentPrice, timestamp: apiTimestamp};
            
        } else if (chartType === 'stocks') {
            if (isMarketOpen && wsPrices[assetIdentifier]) {
                // Stocks: 시장 개장시 WebSocket
                const { price, timestamp_utc } = wsPrices[assetIdentifier];
                const timestamp = new Date(timestamp_utc).getTime();
                const priceValue = parseFloat(price);
                
                if (!timestamp || !isFinite(timestamp) || !priceValue || !isFinite(priceValue)) {
                    return;
                }
                
                point = [timestamp, priceValue];
                currentPrice = point[1];
                previousPrice = lastWebSocketPriceRef.current;
                lastWebSocketPriceRef.current = {price: currentPrice, timestamp: timestamp};
                
            } else if (!isMarketOpen && lastApiCloseRef.current) {
                // Stocks: 시장 폐장시 API 마지막 포인트
                point = [Date.now(), lastApiCloseRef.current.price];
                currentPrice = point[1];
                previousPrice = lastApiPriceRef.current;
                lastApiPriceRef.current = {price: currentPrice, timestamp: Date.now()};
            } else {
                return;
            }
        } else {
            return;
        }
        
        const lastPointObject = series.data && series.data.length > 0 ? series.data[series.data.length - 1] : null;

        // 1분 이상 차이나면 새 포인트 추가 (좌측 이동)
        const currentTime = Date.now();
        const timeDiff = currentTime - point[0];

        if (timeDiff >= 60 * 1000) {
            const newTime = point[0] + (60 * 1000); // 1분 추가
            const newPoint = [newTime, point[1]]; // 같은 가격으로 새 포인트
            series.addPoint(newPoint, true, false, true); // 자동 리드롤로 좌측 이동
        } else {
            // 같은 시간대면 업데이트, 아니면 새 포인트 추가
            if (!lastPointObject) {
                series.addPoint(point, true, false, true);
            } else {
                const isSameBucket = Math.abs(point[0] - lastPointObject.x) < 1000; // 1초 이내면 동일 버킷으로 간주
                if (isSameBucket) {
                    // y 값만 업데이트
                    lastPointObject.update(point[1], true);
                } else {
                    series.addPoint(point, true, false, true);
                }
            }
        }
        
        // 가격 변화 감지 (1초 전 가격과 현재 가격 비교)
        let priceChange = 0; // 가격 변화량
        
        // 시장 폐장시에는 회색(변화 없음)으로 표시
        if (chartType === 'stocks' && !isMarketOpen) {
            isRising = null; // 시장 폐장시 변화 없음 (회색)
        } else if (!previousPrice) {
            isRising = false; // 첫 번째 데이터는 하락으로 처리
        } else {
            // 1초 전 가격과 현재 가격 비교
            const timeDiff = currentTime - (previousPrice.timestamp || 0);
            if (timeDiff >= 1000) { // 1초 이상 차이날 때만 비교
                priceChange = currentPrice - previousPrice.price;
                if (priceChange > 0) {
                    isRising = true; // 상승
                } else if (priceChange < 0) {
                    isRising = false; // 하락
                } else {
                    isRising = null; // 변화 없음 (회색)
                }
            } else {
                isRising = null; // 1초 미만 차이면 변화 없음 (회색)으로 처리
            }
        }
        
        // 컬러 결정: 상승(초록), 하락(빨강), 변화없음(회색)
        const lineColor = isRising === null ? '#999999' : (isRising ? '#18c58f' : '#ff4d4f');
        
        // 가격 변동률과 변동가격 계산 (1초 전 가격 기준) - 안전 처리
        const isFiniteNumber = (v) => typeof v === 'number' && isFinite(v);
        const formatTwo = (v) => isFiniteNumber(v) ? v.toFixed(2) : '0.00';
        const safeCurrentPrice = isFiniteNumber(currentPrice) ? currentPrice : 0;

        // let priceChangePercent = 0;
        // let priceChangeAmount = 0;
        // if (previousPrice && isFiniteNumber(previousPrice.price) && previousPrice.price !== 0 && isFiniteNumber(safeCurrentPrice)) {
        //     priceChangeAmount = safeCurrentPrice - previousPrice.price;
        //     priceChangePercent = (priceChangeAmount / previousPrice.price) * 100;
        // }

        // 가격 표시 형식: $가격만 표시 (%, +- 변동가격 제거)
        const priceLabel = `$${formatTwo(safeCurrentPrice)}`;
        
        // plotLine 클래스 결정
        let plotLineClass = 'neutral';
        if (isRising === true) plotLineClass = 'rising';
        else if (isRising === false) plotLineClass = 'falling';

        // 유효하지 않은 값이면 yAxis 업데이트를 건너뜀
        if (!isFiniteNumber(point[1])) {
            return;
        }

        // plotLine 업데이트 최적화: 변경사항이 있을 때만 업데이트
        const roundedValue = Math.round(point[1] * 100) / 100;
        const currentPlotLine = chart.yAxis[0].plotLinesAndBands && chart.yAxis[0].plotLinesAndBands[0];
        const needsUpdate = !currentPlotLine ||
            currentPlotLine.options.value !== roundedValue ||
            currentPlotLine.options.color !== lineColor ||
            (currentPlotLine.options.label && currentPlotLine.options.label.text) !== priceLabel;

        if (needsUpdate) {
            chart.yAxis[0].update({
                plotLines: [{
                    value: roundedValue,
                    color: lineColor,
                    zIndex: 10,
                    className: `highcharts-plot-line ${plotLineClass}`,
                    label: { 
                        text: priceLabel, 
                        align: 'center', 
                        style: { 
                            color: lineColor, 
                            fontWeight: '900',
                            zIndex: 11
                        } 
                    },
                    id: 'current-price-line'
                }]
            });
        }

        lastRealtimeUpdateAtRef.current = nowTs;
    }, [chart, wsPrices, assetIdentifier, chartType, isMarketOpen, apiPrice, apiTimestamp]);

    useEffect(() => {
        if (!chartRef.current) return;
        if (isLoading || chartData.length === 0) {
            return;
        }

        const options = {
            title: {
                text: `${assetIdentifier} Price Chart`,
                align: 'left',
                verticalAlign: 'top',
                style: {
                    color: '#333333',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }
            },

            xAxis: {
                type: 'datetime',
                // xAxisRange 상태 사용 (우측 4시간 패딩 포함)
                min: xAxisRange.min,
                max: xAxisRange.max,
                gridLineColor: '#e6e6e6',
                labels: {
                    enabled: true,
                    style: {
                        color: '#666666'
                    }
                },
                lineColor: '#cccccc',
                tickColor: '#cccccc',
                title: {
                    style: {
                        color: '#666666'
                    }
                }
            },

            rangeSelector: {
                enabled: false
            },

            navigator: {
                enabled: false
            },

            exporting: {
                enabled: false
            },

            series: [{
                type: 'line',
                name: 'Price',
                color: '#006064', //00d4ff
                lineWidth: 2,
                marker: {
                    enabled: false  // 포인트 마커 삭제
                },
                data: chartData
            }],

            yAxis: {
                opposite: true,
                gridLineColor: '#e6e6e6',
                labels: {
                    enabled: true,
                    style: {
                        color: '#666666'
                    },
                    align: 'left',
                    x: 15
                },
                title: {
                    text: 'Price (USD)',
                    style: { color: '#666666' }
                },
                plotLines: [{
                    value: chartData[chartData.length - 1][1], // 마지막 가격
                    color: '#18c58f', // 기본 상승 색상
                    dashStyle: 'solid',
                    width: 0.5,
                    zIndex: 10, // 높은 z-index로 선 위에 표시
                    className: 'highcharts-plot-line neutral',
                    label: {
                        text: `$${chartData[chartData.length - 1][1].toFixed(2)} (0.00%, +0.00)`,
                        align: 'right',
                        x: -50,
                        style: {
                            color: '#18c58f',
                            fontWeight: '900',
                            zIndex: 11 // 라벨도 높은 z-index
                        }
                    },
                    id: 'current-price-line'
                }]
            },

            chart: {
                backgroundColor: 'transparent',
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
            if (DEBUG && newChart) {
                Highcharts.addEvent(newChart, 'redraw', () => {
                    redrawCountRef.current += 1;
                });
            }
            
            // 타임라인 전진 시뮬레이션은 디버그 모드에서만 활성화
            let intervalId = null;
            if (DEBUG) {
                intervalId = setInterval(() => {
                    if (newChart && newChart.series && newChart.series[0]) {
                        const series = newChart.series[0];
                        const data = series.options.data;
                        if (data && data.length > 0) {
                            const lastPoint = data[data.length - 1];
                            const newTime = lastPoint[0] + (60 * 1000);
                            const newPoint = [newTime, lastPoint[1]];
                            series.addPoint(newPoint, true, false, true);
                        }
                    }
                }, 60000);
            }
            
            // 정리 함수에 interval 제거
            return () => {
                if (intervalId) clearInterval(intervalId);
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

    }, [assetIdentifier, chartData, isLoading]);

    // 5초마다 샘플링 요약 로그 출력
    useEffect(() => {
        if (!DEBUG) return;
        const id = setInterval(() => {
            console.log('[MiniPriceChart:metrics]', assetIdentifier, {
                renders: renderCountRef.current,
                effectRuns: effectRunCountRef.current,
                redraws: redrawCountRef.current,
                wsTicks: wsTickCountRef.current,
            });
            renderCountRef.current = 0;
            effectRunCountRef.current = 0;
            redrawCountRef.current = 0;
            wsTickCountRef.current = 0;
        }, 5000);
        return () => clearInterval(id);
    }, [assetIdentifier, DEBUG]);

    return (
        <div className="mini-price-chart-container">
            <div 
                ref={chartRef} 
                id={containerId}
                className={`mini-price-chart ${isLoading ? 'loading' : ''} ${error ? 'error' : ''}`}
                style={{ height: '300px' }}
            />
        </div>
    );
};

export default MiniPriceChart;
