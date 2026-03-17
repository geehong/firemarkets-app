"use client"

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import ChartControls from '@/components/common/ChartControls';
import { getColorMode } from '@/constants/colorModes';

interface OnChainChartProps {
    assetId?: string;
    title?: string;
    height?: number;
    showRangeSelector?: boolean;
    showStockTools?: boolean;
    showExporting?: boolean;
    metricId?: string;
    metricName?: string;
    locale?: string;
    showControls?: boolean;
    transparent?: boolean;
    useLogScale?: boolean;
}

const OnChainChart: React.FC<OnChainChartProps> = ({
    assetId = 'BTCUSDT',
    title,
    height = 800,
    showRangeSelector = true,

    showStockTools = false,
    showExporting = true,
    metricId = 'mvrv_z_score',
    metricName,
    locale = 'en',
    showControls = true,
    transparent = false,
    useLogScale
}) => {
    const displayMetricName = metricName || (metricId === 'mvrv_z_score' ? 'MVRV Z-Score' : metricId);
    const chartTitle = title !== undefined ? title : `Bitcoin Price vs ${displayMetricName} Correlation`;
    const [priceData, setPriceData] = useState<number[][]>([]);
    const [mvrvData, setMvrvData] = useState<number[][]>([]);

    const [correlation, setCorrelation] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chartType, setChartType] = useState<'line' | 'spline' | 'area' | 'areaspline'>('line');
    const [showFlags, setShowFlags] = useState(true);
    const [useLogScaleInternal, setUseLogScaleInternal] = useState(false);
    const [isAreaMode, setIsAreaMode] = useState(false);
    const [lineSplineMode, setLineSplineMode] = useState<'line' | 'spline'>('line');
    const [colorMode, setColorMode] = useState<'dark' | 'vivid' | 'high-contrast' | 'simple'>('vivid');
    const [currentCorrelation, setCurrentCorrelation] = useState<{
        correlation: number;
        interpretation: string;
        data_points: number;
        start_date: string;
        end_date: string;
    } | null>(null);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    const [isClient, setIsClient] = useState(false);

    const [HighchartsReact, setHighchartsReact] = useState<any>(null);

    const [Highcharts, setHighcharts] = useState<any>(null);

    const chartRef = useRef<any>(null);
    const previousCorrelationRef = useRef<{
        correlation: number;
        interpretation: string;
        data_points: number;
        start_date: string;
        end_date: string;
    } | null>(null);

    // 클라이언트 사이드에서 Highcharts 동적 로드
    useEffect(() => {
        const loadHighcharts = async () => {
            try {
                const [
                    { default: HighchartsReactComponent },
                    { default: HighchartsCore }
                ] = await Promise.all([
                    import('highcharts-react-official'),
                    import('highcharts/highstock')
                ])

                // Highcharts 모듈들 동적 로드
                await Promise.all([
                    import('highcharts/modules/stock'),
                    import('highcharts/modules/exporting'),
                    import('highcharts/modules/accessibility'),
                    import('highcharts/modules/drag-panes'),
                    import('highcharts/modules/navigator')
                ])

                setHighchartsReact(() => HighchartsReactComponent)
                setHighcharts(HighchartsCore)
                setIsClient(true)
            } catch (error) {
                console.error('Failed to load Highcharts:', error)
                setError('Failed to load chart library')
            }
        }

        loadHighcharts()
    }, [])

    // 외부 prop(useLogScale)과 내부 상태 동기화
    useEffect(() => {
        if (useLogScale !== undefined && useLogScale !== useLogScaleInternal) {
            setUseLogScaleInternal(useLogScale);
            const chart = chartRef.current?.chart;
            if (chart && chart.yAxis[0]) {
                chart.yAxis[0].update({
                    type: useLogScale ? 'logarithmic' : 'linear'
                }, true);
            }
        }
    }, [useLogScale, useLogScaleInternal]);

    // 모바일 감지
    useEffect(() => {
        if (!isClient) return

        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, [isClient]);

    // Line/Spline 토글 핸들러
    const handleLineSplineToggle = () => {
        const newLineSplineMode = lineSplineMode === 'line' ? 'spline' : 'line';
        setLineSplineMode(newLineSplineMode);

        // Area 모드가 켜져있으면 spline-area 또는 area, 꺼져있으면 line/spline
        let newChartType: 'line' | 'spline' | 'area' | 'areaspline';
        if (isAreaMode) {
            newChartType = newLineSplineMode === 'spline' ? 'areaspline' : 'area';
        } else {
            newChartType = newLineSplineMode;
        }
        setChartType(newChartType);

        const chart = chartRef.current?.chart;
        if (chart && chart.series && chart.series.length > 0) {

            chart.series.forEach((series: any) => {
                series.update({ type: newChartType }, false);
            });
            chart.redraw();
        }
    };

    // Area 모드 토글 핸들러
    const handleAreaModeToggle = () => {
        const newAreaMode = !isAreaMode;
        setIsAreaMode(newAreaMode);

        // Area 모드가 켜져있으면 현재 lineSplineMode에 따라 area/areaspline, 꺼져있으면 line/spline
        let newChartType: 'line' | 'spline' | 'area' | 'areaspline';
        if (newAreaMode) {
            newChartType = lineSplineMode === 'spline' ? 'areaspline' : 'area';
        } else {
            newChartType = lineSplineMode;
        }
        setChartType(newChartType);

        const chart = chartRef.current?.chart;
        if (chart && chart.series && chart.series.length > 0) {

            chart.series.forEach((series: any) => {
                series.update({ type: newChartType }, false);
            });
            chart.redraw();
        }
    };

    // 로그 스케일 토글 핸들러
    const handleLogScaleToggle = () => {
        const newValue = !useLogScaleInternal;
        setUseLogScaleInternal(newValue);
        const chart = chartRef.current?.chart;
        if (chart) {
            // 첫 번째 Y축(비트코인 가격)만 로그 스케일로 변경
            if (chart.yAxis[0]) {
                chart.yAxis[0].update({
                    type: newValue ? 'logarithmic' : 'linear'
                }, false);
            }
            chart.redraw();
        }
    };

    const [timeRange, setTimeRange] = useState<'1y' | 'all'>('all');

    // 온체인 메트릭 데이터 조회 (통합 엔드포인트)
    const { data: onchainData, isLoading: onchainLoading, error: onchainError } = useQuery({
        queryKey: ['onchain', assetId, metricId, timeRange],
        queryFn: () => {
            if (timeRange === 'all') {
                return apiClient.getOnchainMetricsData(assetId, metricId, { limit: 100000 });
            }
            return apiClient.getOnchainMetricsData(assetId, metricId, { time_range: timeRange });
        },
        enabled: !!assetId && !!metricId,
        staleTime: 10 * 60 * 1000, // 10분
        retry: 3,
    });

    // 상관계수 계산 함수
    const calculateCorrelation = (priceData: number[][], metricData: number[][]) => {
        if (priceData.length === 0 || metricData.length === 0) return null;

        // 시간 기준으로 데이터 매칭
        const matchedData: { price: number; metric: number }[] = [];

        priceData.forEach(([timestamp, price]) => {
            const closestMetric = metricData.reduce((closest, [metricTimestamp, metricValue]) => {
                const currentDiff = Math.abs(timestamp - metricTimestamp);
                const closestDiff = Math.abs(timestamp - closest[0]);
                return currentDiff < closestDiff ? [metricTimestamp, metricValue] : closest;
            }, metricData[0]);

            if (closestMetric) {
                matchedData.push({ price, metric: closestMetric[1] });
            }
        });

        if (matchedData.length < 2) return null;

        // 피어슨 상관계수 계산
        const n = matchedData.length;
        const sumX = matchedData.reduce((sum, item) => sum + item.price, 0);
        const sumY = matchedData.reduce((sum, item) => sum + item.metric, 0);
        const sumXY = matchedData.reduce((sum, item) => sum + item.price * item.metric, 0);
        const sumX2 = matchedData.reduce((sum, item) => sum + item.price * item.price, 0);
        const sumY2 = matchedData.reduce((sum, item) => sum + item.metric * item.metric, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    };

    // 데이터 처리
    useEffect(() => {
        console.log('📊 OnChainChart: Processing data', {
            onchainData,
            metricId,
            hasData: !!onchainData,
            hasSeries: !!onchainData?.series,
            hasDataProperty: !!onchainData?.data
        });

        if (onchainData?.series) {
            try {
                const dateData = onchainData.series.date || [];
                const priceSeries = onchainData.series.price || [];
                const metricSeries = onchainData.series[metricId] || [];
                console.log('📊 OnChainChart: Series data', { dateData: dateData.length, priceSeries: priceSeries.length, metricSeries: metricSeries.length });

                // 가격 데이터 처리
                const formattedPriceData: number[][] = [];
                for (let i = 0; i < Math.min(dateData.length, priceSeries.length); i++) {
                    const dateStr = dateData[i].date;
                    const price = priceSeries[i].close_price;
                    if (dateStr && price !== undefined && price !== null) {
                        const t = new Date(dateStr).getTime();
                        const v = parseFloat(price);
                        if (!isNaN(t) && !isNaN(v) && t > 0) {
                            formattedPriceData.push([t, v]);
                        }
                    }
                }

                // 메트릭 데이터 처리
                const formattedMetricData: number[][] = [];
                for (let i = 0; i < Math.min(dateData.length, metricSeries.length); i++) {
                    const dateStr = dateData[i].date;
                    const raw = metricSeries[i];
                    const v = raw && typeof raw === 'object' && 'value' in raw ? raw.value : Number(raw);
                    if (dateStr && v !== undefined && v !== null) {
                        const t = new Date(dateStr).getTime();
                        const nv = parseFloat(v);
                        if (!isNaN(t) && !isNaN(nv)) {
                            formattedMetricData.push([t, nv]);
                        }
                    }
                }

                const sortedPriceData = formattedPriceData.sort((a, b) => a[0] - b[0]);
                const sortedMetricData = formattedMetricData.sort((a, b) => a[0] - b[0]);

                setPriceData(sortedPriceData);
                setMvrvData(sortedMetricData);

                // 백엔드에서 계산된 상관관계 사용, 없으면 프론트엔드에서 계산
                if (onchainData.analysis && onchainData.analysis.correlation) {
                    const backendCorrelation = onchainData.analysis.correlation[metricId];

                    // 상관관계 값이 숫자인지 확인
                    if (typeof backendCorrelation === 'number') {
                        setCorrelation(backendCorrelation);
                    } else if (backendCorrelation && typeof backendCorrelation === 'object' && 'value' in backendCorrelation) {
                        // 객체에서 value 속성 추출

                        setCorrelation(Number((backendCorrelation as any).value));
                    } else {
                        // 프론트엔드에서 계산
                        const calculatedCorrelation = calculateCorrelation(sortedPriceData, sortedMetricData);
                        setCorrelation(calculatedCorrelation);
                    }
                } else {
                    const calculatedCorrelation = calculateCorrelation(sortedPriceData, sortedMetricData);
                    setCorrelation(calculatedCorrelation);
                }

                setError(null);
            } catch (err) {
                console.error('Data processing error:', err);
                setError(`데이터 처리 중 오류 발생: ${err}`);
            }
        } else if (onchainData?.data) {
            // Fallback for singular endpoint structure
            try {
                const dataPoints = onchainData.data;
                const formattedPriceData: number[][] = [];
                const formattedMetricData: number[][] = [];


                dataPoints.forEach((point: any) => {
                    const dateStr = point.timestamp || point.date;
                    const timestamp = new Date(dateStr).getTime();

                    if (!isNaN(timestamp)) {
                        if (point.price !== undefined) formattedPriceData.push([timestamp, point.price]);
                        if (point.value !== undefined) formattedMetricData.push([timestamp, point.value]);
                    }
                });

                const sortedPriceData = formattedPriceData.sort((a, b) => a[0] - b[0]);
                const sortedMetricData = formattedMetricData.sort((a, b) => a[0] - b[0]);

                setPriceData(sortedPriceData);
                setMvrvData(sortedMetricData);

                const calculatedCorrelation = calculateCorrelation(sortedPriceData, sortedMetricData);
                setCorrelation(calculatedCorrelation);
                setError(null);

            } catch (err) {
                setError(`Fallback processing error: ${err}`);
            }
        }

        setLoading(onchainLoading);

        if (onchainError) {
            setError(`데이터 로딩 실패: ${onchainError}`);
        }
    }, [onchainData, metricId, onchainLoading, onchainError]);

    // 특정 범위의 상관관계 계산 함수 (메모이제이션)
    const calculateCorrelationForRange = useCallback((startTime: number, endTime: number) => {
        if (!priceData.length || !mvrvData.length) return null;

        // 선택된 범위 내의 데이터 필터링
        const filteredPriceData = priceData.filter(point =>
            point[0] >= startTime && point[0] <= endTime
        );
        const filteredMvrvData = mvrvData.filter(point =>
            point[0] >= startTime && point[0] <= endTime
        );

        if (filteredPriceData.length < 5) return null; // 최소 5개 데이터 필요

        // 공통 날짜의 데이터만 추출
        const priceMap = new Map(filteredPriceData.map(point => [point[0], point[1]]));
        const mvrvMap = new Map(filteredMvrvData.map(point => [point[0], point[1]]));

        const commonDates = [...priceMap.keys()].filter(date => mvrvMap.has(date));

        if (commonDates.length < 5) return null;

        const priceValues = commonDates.map(date => priceMap.get(date)!);
        const mvrvValues = commonDates.map(date => mvrvMap.get(date)!);

        // 상관계수 계산
        const n = priceValues.length;
        const sumX = priceValues.reduce((a, b) => a + b, 0);
        const sumY = mvrvValues.reduce((a, b) => a + b, 0);
        const sumXY = priceValues.reduce((sum, x, i) => sum + x * mvrvValues[i], 0);
        const sumX2 = priceValues.reduce((sum, x) => sum + x * x, 0);
        const sumY2 = mvrvValues.reduce((sum, y) => sum + y * y, 0);

        const correlation = (n * sumXY - sumX * sumY) /
            Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        // 해석
        let interpretation = '';
        if (Math.abs(correlation) >= 0.7) {
            interpretation = correlation > 0 ? 'Strong Positive Correlation' : 'Strong Negative Correlation';
        } else if (Math.abs(correlation) >= 0.5) {
            interpretation = correlation > 0 ? 'Moderate Positive Correlation' : 'Moderate Negative Correlation';
        } else if (Math.abs(correlation) >= 0.3) {
            interpretation = correlation > 0 ? 'Weak Positive Correlation' : 'Weak Negative Correlation';
        } else {
            interpretation = 'No Significant Correlation';
        }

        const result = {
            correlation: Math.round(correlation * 1000) / 1000,
            interpretation,
            data_points: commonDates.length,
            start_date: new Date(startTime).toISOString().split('T')[0],
            end_date: new Date(endTime).toISOString().split('T')[0]
        };

        // 이전 값과 비교하여 변경사항이 있을 때만 상태 업데이트
        const previousCorrelation = previousCorrelationRef.current;
        if (!previousCorrelation ||
            previousCorrelation.correlation !== result.correlation ||
            previousCorrelation.start_date !== result.start_date ||
            previousCorrelation.end_date !== result.end_date) {
            previousCorrelationRef.current = result;
            return result;
        }

        return previousCorrelation;
    }, [priceData, mvrvData, isMobile]);

    // 차트 옵션

    const currentTheme = getColorMode(colorMode);
    
    const chartOptions: any = {
        chart: {
            height: height,
            backgroundColor: transparent ? 'transparent' : '#ffffff',
            style: {
                fontFamily: 'Inter, system-ui, sans-serif'
            },
            // 모바일 설정
            zoomType: 'xy',
            panning: {
                enabled: true,
                type: 'xy'
            },
            pinchType: 'xy',
            events: {
                load: function () {
                    console.log('차트 로드 완료');
                    // 초기 상관관계 계산

                    // @ts-ignore
                    const extremes = this.xAxis[0].getExtremes();
                    const initialCorrelation = calculateCorrelationForRange(extremes.min, extremes.max);
                    if (initialCorrelation) {
                        setCurrentCorrelation(initialCorrelation);
                        previousCorrelationRef.current = initialCorrelation;
                    }
                },
                render: function () {
                    console.log('차트 렌더링 완료');
                }
            }
        },
        title: {
            text: chartTitle,
            style: {
                color: '#1f2937',
                fontSize: isMobile ? '16px' : '20px'
            }
        },
        subtitle: {
            text: currentCorrelation
                ? `${locale === 'ko' ? '상관계수' : 'Correlation'}: ${currentCorrelation.correlation} (${currentCorrelation.interpretation})`
                : (locale === 'ko' ? '데이터 로딩 중...' : 'Loading data...'),
            style: {
                color: currentCorrelation ? (
                    Math.abs(currentCorrelation.correlation) >= 0.7 ? '#dc2626' :
                        Math.abs(currentCorrelation.correlation) >= 0.5 ? '#ea580c' :
                            Math.abs(currentCorrelation.correlation) >= 0.3 ? '#d97706' :
                                '#6b7280'
                ) : '#6b7280',
                fontSize: '14px',
                fontWeight: 'bold'
            }
        },
        xAxis: {
            type: 'datetime',
            labels: {
                style: {
                    color: '#374151'
                }
            },
            gridLineColor: '#e5e7eb',
            events: {
                afterSetExtremes: function () {

                    // @ts-ignore
                    const extremes = this.getExtremes();
                    const newCorrelation = calculateCorrelationForRange(extremes.min, extremes.max);

                    // 이전 값과 비교하여 변경사항이 있을 때만 상태 업데이트
                    if (newCorrelation && (!currentCorrelation ||
                        currentCorrelation.correlation !== newCorrelation.correlation ||
                        currentCorrelation.start_date !== newCorrelation.start_date ||
                        currentCorrelation.end_date !== newCorrelation.end_date)) {
                        setCurrentCorrelation(newCorrelation);
                        console.log('범위 변경 - 새로운 상관관계:', newCorrelation);
                    }
                }
            }
        },
        yAxis: [
            {
                title: {
                    text: 'Bitcoin Price (USD)',
                    style: {
                        color: '#1f2937',
                        fontSize: isMobile ? '0px' : '12px' // 모바일에서 제목 숨김
                    }
                },
                labels: {
                    style: {
                        color: '#374151',
                        fontSize: isMobile ? '0px' : '12px' // 모바일에서 라벨 숨김
                    },
                    formatter: function () {

                        // @ts-ignore
                        return '$' + this.value.toLocaleString('en-US');
                    }
                },
                gridLineColor: '#e5e7eb',
                opposite: false,
                type: useLogScaleInternal ? 'logarithmic' : 'linear'
            },
            {
                title: {
                    text: displayMetricName,
                    style: {
                        color: '#1f2937',
                        fontSize: isMobile ? '0px' : '12px' // 모바일에서 제목 숨김
                    }
                },
                labels: {
                    style: {
                        color: '#374151',
                        fontSize: isMobile ? '0px' : '12px' // 모바일에서 라벨 숨김
                    }
                },
                gridLineColor: '#e5e7eb',
                opposite: true,
                type: 'linear' // MVRV Z-Score는 항상 선형 스케일 유지
            }
        ],
        tooltip: {
            shared: true,
            backgroundColor: '#ffffff',
            borderColor: '#d1d5db',
            style: {
                color: '#1f2937'
            },
            formatter: function () {

                // @ts-ignore
                const points = this.points || [];

                // @ts-ignore
                let tooltip = `<b>${Highcharts.dateFormat('%Y-%m-%d', this.x)}</b><br/>`;


                points.forEach((point: any) => {
                    if (point.series.name === 'Bitcoin Price') {
                        tooltip += `${point.series.name}: $${point.y.toLocaleString('en-US')}<br/>`;
                    } else {
                        tooltip += `${point.series.name}: ${point.y.toFixed(3)}<br/>`;
                    }
                });

                return tooltip;
            }
        },
        legend: {
            itemStyle: {
                color: '#1f2937'
            },
            itemHoverStyle: {
                color: '#374151'
            }
        },
        plotOptions: {
            series: {
                marker: {
                    enabled: false
                },
                // 모바일 터치 설정
                stickyTracking: false,
                enableMouseTracking: true
            }
        },
        series: [
            {
                name: 'Bitcoin Price',
                type: chartType,
                data: priceData,
                color: currentTheme.coin,
                yAxis: 0,
                // Area 차트일 때 그라데이션 효과 추가
                ...(chartType === 'area' || chartType === 'areaspline') && {
                    fillColor: {
                        linearGradient: {
                            x1: 0,
                            y1: 0,
                            x2: 0,
                            y2: 1
                        },
                        stops: [
                            [0, `${currentTheme.coin}B3`], // 0.7 opacity
                            [0.5, `${currentTheme.coin}59`], // 0.35 opacity
                            [0.8, `${currentTheme.coin}0D`], // 0.05 opacity
                            [0.9, `${currentTheme.coin}05`], // 0.02 opacity
                            [1, `${currentTheme.coin}03`] // 0.01 opacity
                        ]
                    }
                },
                tooltip: {
                    valueDecimals: 2,
                    valuePrefix: '$'
                }
            },
            {
                name: displayMetricName,
                type: chartType,
                data: mvrvData,
                color: currentTheme.metric,
                yAxis: 1,
                // Area 차트일 때 그라데이션 효과 추가
                ...(chartType === 'area' || chartType === 'areaspline') && {
                    fillColor: {
                        linearGradient: {
                            x1: 0,
                            y1: 0,
                            x2: 0,
                            y2: 1
                        },
                        stops: [
                            [0, `${currentTheme.metric}B3`], // 0.7 opacity
                            [0.5, `${currentTheme.metric}59`], // 0.35 opacity
                            [0.8, `${currentTheme.metric}0D`], // 0.05 opacity
                            [0.9, `${currentTheme.metric}05`], // 0.02 opacity
                            [1, `${currentTheme.metric}03`] // 0.01 opacity
                        ]
                    }
                },
                tooltip: {
                    valueDecimals: 3
                }
            }
        ],
        rangeSelector: showRangeSelector && !isMobile ? {
            enabled: true,
            selected: 5,
            buttons: [
                {
                    type: 'month',
                    count: 1,
                    text: '1M'
                },
                {
                    type: 'month',
                    count: 3,
                    text: '3M'
                },
                {
                    type: 'month',
                    count: 6,
                    text: '6M'
                },
                {
                    type: 'year',
                    count: 3,
                    text: '3Y'
                },
                {
                    type: 'year',
                    count: 5,
                    text: '5Y'
                },
                {
                    type: 'all',
                    text: 'All'
                }
            ],
            buttonTheme: {
                fill: '#f3f4f6',
                stroke: '#d1d5db',
                style: {
                    color: '#1f2937'
                },
                states: {
                    hover: {
                        fill: '#e5e7eb'
                    },
                    select: {
                        fill: '#3b82f6',
                        style: {
                            color: '#ffffff'
                        }
                    }
                }
            },
            inputStyle: {
                backgroundColor: '#ffffff',
                color: '#1f2937'
            },
            labelStyle: {
                color: '#1f2937'
            }
        } : {
            enabled: false
        },
        navigator: {
            enabled: showRangeSelector && !isMobile,
            handles: {
                backgroundColor: '#3b82f6',
                borderColor: '#1d4ed8'
            },
            outlineColor: '#d1d5db',
            maskFill: 'rgba(59, 130, 246, 0.1)',
            series: {
                color: '#6b7280'
            }
        },
        scrollbar: {
            enabled: showRangeSelector && !isMobile,
            barBackgroundColor: '#f3f4f6',
            barBorderRadius: 7,
            barBorderWidth: 0,
            buttonBackgroundColor: '#f3f4f6',
            buttonBorderWidth: 0,
            buttonBorderRadius: 7,
            rifleColor: '#6b7280',
            trackBackgroundColor: '#ffffff',
            trackBorderWidth: 1,
            trackBorderRadius: 8,
            trackBorderColor: '#d1d5db'
        },
        exporting: {
            enabled: showExporting,
            buttons: {
                contextButton: {
                    theme: {
                        fill: '#f3f4f6',
                        stroke: '#d1d5db',
                        style: {
                            color: '#1f2937'
                        }
                    }
                }
            }
        },
        // 모바일 최적화 설정
        responsive: {
            rules: [{
                condition: {
                    maxWidth: 768
                },
                chartOptions: {
                    chart: {
                        height: Math.min(height, 800),
                        spacing: [10, 10, 10, 10]
                    },
                    rangeSelector: {
                        inputEnabled: false
                    },
                    tooltip: {
                        positioner: function (labelWidth: number, labelHeight: number, point: any) {

                            const chart = (this as any).chart;
                            return {
                                x: Math.min(point.plotX + chart.plotLeft, chart.chartWidth - labelWidth - 10),
                                y: Math.max(point.plotY + chart.plotTop - labelHeight - 10, 10)
                            };
                        }
                    }
                }
            }]
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg p-6 flex items-center justify-center" style={{ height: `${height}px` }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <div className="text-gray-700">{locale === 'ko' ? '온체인 데이터 로딩 중...' : 'Loading on-chain data...'}</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg p-6 flex items-center justify-center" style={{ height: `${height}px` }}>
                <div className="text-center">
                    <div className="text-red-600 mb-2">⚠️ {locale === 'ko' ? '오류 발생' : 'Error'}</div>
                    <div className="text-gray-700 text-sm">{error}</div>
                </div>
            </div>
        );
    }

    // 클라이언트 사이드에서만 차트 렌더링
    if (!isClient || !HighchartsReact || !Highcharts) {
        return (
            <div className="bg-white rounded-lg p-6 flex items-center justify-center" style={{ height: `${height}px` }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <div className="text-gray-700">Loading chart library...</div>
                </div>
            </div>
        );
    }

    if (priceData.length === 0 || mvrvData.length === 0) {
        return (
            <div className="bg-white rounded-lg p-6 flex items-center justify-center" style={{ height: `${height}px` }}>
                <div className="text-center">
                    <div className="text-gray-500 mb-2">📊</div>
                    <div className="text-gray-700">{locale === 'ko' ? '데이터가 없습니다.' : 'No data available.'}</div>
                </div>
            </div>
        );
    }

    return (
        <div className={transparent ? "" : "bg-white rounded-lg p-4"}>
            {showControls && (
                <ChartControls
                    chartType={lineSplineMode}
                    onChartTypeChange={handleLineSplineToggle}
                    isAreaMode={isAreaMode}
                    onAreaModeToggle={handleAreaModeToggle}
                    showFlags={showFlags}
                    onFlagsToggle={() => setShowFlags(!showFlags)}
                    useLogScale={useLogScaleInternal}
                    onLogScaleToggle={handleLogScaleToggle}
                    colorMode={colorMode}
                    onColorModeChange={setColorMode}
                    showFlagsButton={false}
                />
            )}

            <div style={{ height: `${height}px` }}>
                <HighchartsReact
                    ref={chartRef}
                    highcharts={Highcharts}
                    constructorType={'stockChart'}
                    options={chartOptions}
                />
            </div>
        </div>
    );
};

export default OnChainChart;
