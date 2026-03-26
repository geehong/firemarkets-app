"use client"

import React, { useState, useRef, useEffect } from 'react';
import { useMultipleHalvingData } from '@/hooks/useCrypto';
import { useNavigation } from '@/hooks/useNavigation';
import ChartControls from '@/components/common/ChartControls';
import { getColorMode } from '@/constants/colorModes';

interface HalvingChartProps {
    title?: string;
    height: number;
    showRangeSelector?: boolean;
    showExporting?: boolean;
    singlePeriod?: number | null;
    locale?: string;
}

const HalvingChart: React.FC<HalvingChartProps> = ({
    title = 'Bitcoin Halving Price Analysis',
    height,
    showRangeSelector = false,
    showExporting = true,
    singlePeriod = null,
    locale = 'ko'
}) => {
    const [chartType, setChartType] = useState('line');
    const [useLogScale, setUseLogScale] = useState(true);
    const [isAreaMode, setIsAreaMode] = useState(false);
    const [lineSplineMode, setLineSplineMode] = useState<'line' | 'spline'>('line');
    const [startPrice, setStartPrice] = useState(64940);
    const [customStartPrice, setCustomStartPrice] = useState(64940);
    const [showPlotBands, setShowPlotBands] = useState(false);
    const [showMovingAverage, setShowMovingAverage] = useState(false);
    const [maPeriod, setMaPeriod] = useState(20);
    const [maWidth, setMaWidth] = useState(2);
    const [dayRange, setDayRange] = useState(1460);
    const [plotLineDay, setPlotLineDay] = useState(365);
    const [plotBandStart, setPlotBandStart] = useState(366);
    const [plotBandEnd, setPlotBandEnd] = useState(550);

    const [showHalving1, setShowHalving1] = useState(true);
    const [showHalving2, setShowHalving2] = useState(true);
    const [showHalving3, setShowHalving3] = useState(true);
    const [showHalving4, setShowHalving4] = useState(true);
    const [showFlags, setShowFlags] = useState(false);
    const [cycleOffset, setCycleOffset] = useState(0);
    const [stretchFactor, setStretchFactor] = useState(1.0);

    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    const [colorMode, setColorMode] = useState<'dark' | 'vivid' | 'high-contrast' | 'simple'>('vivid'); // 다크모드 제거
    const [showSettings, setShowSettings] = useState(false);
    const [recommendations, setRecommendations] = useState<Record<string, number | null>>({});
    const [isClient, setIsClient] = useState(false);


    const [HighchartsReact, setHighchartsReact] = useState<any>(null);

    const [Highcharts, setHighcharts] = useState<any>(null);

    const chartRef = useRef<any>(null);

    // 네비게이션 메뉴 데이터 가져오기
    const { currentMenuItem } = useNavigation();

    // 반감기 데이터 - 훅 사용
    const periodsToLoad = React.useMemo(() => singlePeriod ? [singlePeriod] : [1, 2, 3, 4], [singlePeriod]);
    
    const { queries: rawQueries, isLoading, errors } = useMultipleHalvingData(
        periodsToLoad,
        startPrice,
        !!startPrice && startPrice > 0
    );

    // queries 레퍼런스 안정화
    const halvingQueries = rawQueries;

    // 에러 확인
    const error = errors && errors.length > 0 ? errors[0] : null;

    // 클라이언트 사이드에서 Highcharts 동적 로드
    useEffect(() => {
        const loadHighcharts = async () => {
            try {
                const [
                    HighchartsReactComponentModule,
                    HighchartsCoreModule
                ] = await Promise.all([
                    import('highcharts-react-official'),
                    import('highcharts/highstock')
                ]);

                const HighchartsReactComponent = HighchartsReactComponentModule.default || HighchartsReactComponentModule;
                const HighchartsCore = HighchartsCoreModule.default || HighchartsCoreModule;

                if (!HighchartsCore) {
                    throw new Error('Highcharts Core could not be loaded');
                }

                // Highcharts 모듈들 로드 및 초기화
                const moduleImports = await Promise.all([
                    import('highcharts/modules/stock'),
                    import('highcharts/modules/exporting'),
                    import('highcharts/modules/accessibility'),
                    import('highcharts/modules/drag-panes'),
                    import('highcharts/modules/navigator')
                ]);

                // 각 모듈 초기화 (CJS/ESM 공통 대응)
                moduleImports.forEach((mod) => {
                    const init = mod.default || mod;
                    if (typeof init === 'function') {
                        (init as any)(HighchartsCore);
                    }
                });

                setHighchartsReact(() => HighchartsReactComponent);
                setHighcharts(HighchartsCore);
                setIsClient(true);
            } catch (error) {
                console.error('Failed to load Highcharts:', error);
            }
        };

        loadHighcharts();
    }, []);

    // 화면 크기 변경 감지
    useEffect(() => {
        if (!isClient) return

        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isClient]);

    // Line/Spline 토글 핸들러
    const handleLineSplineToggle = () => {
        const newLineSplineMode = lineSplineMode === 'line' ? 'spline' : 'line';
        setLineSplineMode(newLineSplineMode);

        // Area 모드가 켜져있으면 spline-area 또는 area, 꺼져있으면 line/spline
        let newChartType;
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
        let newChartType;
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
        setUseLogScale(!useLogScale);
        const chart = chartRef.current?.chart;
        if (chart) {
            // 모든 Y축을 로그 스케일로 변경

            chart.yAxis.forEach((axis: any) => {
                axis.update({
                    type: !useLogScale ? 'logarithmic' : 'linear'
                }, false);
            });
            chart.redraw();
        }
    };

    // 리셋 핸들러
    const handleReset = () => {
        setStretchFactor(1.0);
        setCycleOffset(0);
        setCustomStartPrice(64940);
        setStartPrice(64940);
    };

    // 피어슨 상관계수 계산 함수
    const calculatePearsonCorrelation = (x: number[], y: number[]) => {
        if (x.length < 5) return null; // 최소 데이터 포인트 5개
        const n = x.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumX2 += x[i] * x[i];
            sumY2 += y[i] * y[i];
        }
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        if (denominator === 0) return 0;
        return numerator / denominator;
    };

    // 사이클 데이터 미리처리 (계산 최적화)
    const processedChartData = React.useMemo(() => {
        if (!halvingQueries || halvingQueries.length < 2) return null;

        const results: {
            hMaps: Record<number, Record<number, number>>,
            priceData4: { days: number, close: number }[]
        } = { hMaps: {}, priceData4: [] };

        const hStartDates = {
            1: new Date('2012-11-28T00:00:00.000Z'),
            2: new Date('2016-07-09T00:00:00.000Z'),
            3: new Date('2020-05-11T00:00:00.000Z')
        };

        // 1, 2, 3차 데이터 맵 생성
        [1, 2, 3].forEach(period => {
            const hIndex = periodsToLoad.indexOf(period);
            if (hIndex === -1) return;
            
            const hQuery = halvingQueries[hIndex];
            if (!hQuery || !hQuery.data) return;

            const hPriceData = hQuery.data.ohlcv_data || hQuery.data.close_price_data || [];
            const hMap: Record<number, number> = {};
            const hStart = hStartDates[period as keyof typeof hStartDates];

            hPriceData.forEach((p: any) => {
                const dateStr = p.timestamp_utc.includes('T') ? p.timestamp_utc : p.timestamp_utc + 'T00:00:00.000Z';
                const date = new Date(dateStr);
                const days = Math.floor((date.getTime() - hStart.getTime()) / (24 * 60 * 60 * 1000));
                hMap[days] = p.close_price;
            });
            results.hMaps[period] = hMap;
        });

        // 4차 데이터 일수 전처리
        const q4Index = periodsToLoad.indexOf(4);
        if (q4Index !== -1) {
            const q4Query = halvingQueries[q4Index];
            if (q4Query && q4Query.data) {
                const rawPriceData4 = q4Query.data.ohlcv_data || q4Query.data.close_price_data || [];
                const q4Start = new Date('2024-04-20T00:00:00.000Z');
                
                results.priceData4 = rawPriceData4.map((p: any) => {
                    const dateStr = p.timestamp_utc.includes('T') ? p.timestamp_utc : p.timestamp_utc + 'T00:00:00.000Z';
                    const date = new Date(dateStr);
                    const days = Math.floor((date.getTime() - q4Start.getTime()) / (24 * 60 * 60 * 1000));
                    return { days, close: p.close_price };
                });
            }
        }

        return results;
    }, [halvingQueries, periodsToLoad]);

    // 특정 stretchFactor에서의 상관관계 계산 함수 (최적화 버전)
    const getCorrelationsAt = React.useCallback((sFactor: number, cOffset: number) => {
        if (!processedChartData) return {};
        
        const results: Record<number, number | null> = {};
        const { hMaps, priceData4 } = processedChartData;

        [1, 2, 3].forEach(period => {
            const hMap = hMaps[period];
            if (!hMap || priceData4.length === 0) {
                results[period] = null;
                return;
            }

            const x4: number[] = [];
            const yH: number[] = [];

            priceData4.forEach((p) => {
                const finalDay = Math.round((p.days + cOffset) * sFactor);
                if (hMap[finalDay] !== undefined) {
                    x4.push(p.close);
                    yH.push(hMap[finalDay]);
                }
            });

            results[period] = calculatePearsonCorrelation(x4, yH);
        });

        return results;
    }, [processedChartData]);

    // 최적의 stretchFactor 찾기 (Auto 버튼 클릭 시)
    const handleAutoStretch = (targetPeriod?: number) => {
        let bestS = 1.0;
        let maxCor = -2;

        // 0.5 ~ 2.5 범위에서 0.01 간격으로 최적 배수 검색
        for (let s = 0.5; s <= 2.5; s += 0.01) {
            const cors = getCorrelationsAt(s, cycleOffset);
            let score = 0;
            if (targetPeriod) {
                score = cors[targetPeriod] || -2;
            } else {
                const validCors = [1, 2, 3].map(p => cors[p]).filter(v => v !== null) as number[];
                if (validCors.length > 0) {
                    score = validCors.reduce((a, b) => a + b, 0) / validCors.length;
                } else {
                    score = -2;
                }
            }

            if (score > maxCor) {
                maxCor = score;
                bestS = s;
            }
        }
        setStretchFactor(Math.round(bestS * 100) / 100);
    };

    // 권장 배수 주기적 계산 (또는 데이터 로드 시)
    useEffect(() => {
        if (isLoading || !processedChartData) return;

        const recs: Record<string, number | null> = {};
        const scoreMakers: Record<string, { bestS: number, maxCor: number }> = {
            '1': { bestS: 1.0, maxCor: -2 },
            '2': { bestS: 1.0, maxCor: -2 },
            '3': { bestS: 1.0, maxCor: -2 },
            'all': { bestS: 1.0, maxCor: -2 }
        };

        // 0.5 ~ 2.5 범위에서 0.05 간격으로 탐색 (단일 루프로 최적화)
        for (let s = 0.5; s <= 2.5; s += 0.05) {
            const cors = getCorrelationsAt(s, cycleOffset);
            
            // 각 개별 주기 점수 업데이트
            [1, 2, 3].forEach(period => {
                const score = cors[period] || -2;
                if (score > scoreMakers[period.toString()].maxCor) {
                    scoreMakers[period.toString()].maxCor = score;
                    scoreMakers[period.toString()].bestS = s;
                }
            });

            // 전체 평균 점수 업데이트
            const validCors = [1, 2, 3].map(p => cors[p]).filter(v => v !== null) as number[];
            if (validCors.length > 0) {
                const avg = validCors.reduce((a, b) => a + b, 0) / validCors.length;
                if (avg > scoreMakers['all'].maxCor) {
                    scoreMakers['all'].maxCor = avg;
                    scoreMakers['all'].bestS = s;
                }
            }
        }

        // 결과 저장
        recs['1'] = Math.round(scoreMakers['1'].bestS * 100) / 100;
        recs['2'] = Math.round(scoreMakers['2'].bestS * 100) / 100;
        recs['3'] = Math.round(scoreMakers['3'].bestS * 100) / 100;
        recs['all'] = Math.round(scoreMakers['all'].bestS * 100) / 100;

        setRecommendations(prev => {
            // 값이 실제로 변경된 경우에만 업데이트하여 불필요한 리렌더링 방지
            if (JSON.stringify(prev) === JSON.stringify(recs)) return prev;
            return recs;
        });
    }, [processedChartData, cycleOffset, isLoading, getCorrelationsAt]);

    // 4차 사이클과 다른 사이클 간의 실시간 상관관계 계산
    const correlations = React.useMemo(() => {
        return getCorrelationsAt(stretchFactor, cycleOffset);
    }, [getCorrelationsAt, stretchFactor, cycleOffset]);

    // 시작가격 실행 핸들러
    const handleExecuteStartPrice = () => {
        setStartPrice(customStartPrice);
    };

    // dayRange 변경 시 차트 x축 범위 업데이트
    useEffect(() => {
        const chart = chartRef.current?.chart;
        if (chart) {
            chart.xAxis[0].setExtremes(0, dayRange);
        }
    }, [dayRange]);

    // 이동평균 계산 함수
    const calculateMovingAverage = (data: number[][], period: number) => {
        if (!data || data.length < period) return [];

        const result: (number[] | null)[] = [];
        let sum = 0;

        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                sum += data[i][1]; // close price
                result.push(null);
            } else {
                if (i === period - 1) {
                    sum += data[i][1];
                } else {
                    sum = sum - data[i - period][1] + data[i][1];
                }
                result.push([data[i][0], sum / period]); // [timestamp, MA value]
            }
        }

        return result;
    };

    // 차트 데이터에 이동평균 추가
    const getChartSeriesWithMA = () => {
        const series = getChartSeries();

        if (showMovingAverage) {
            // 각 반감기 데이터에 대해 이동평균 계산
            halvingQueries.forEach((query, index) => {
                const period = periodsToLoad[index];
                const data = query.data;

                if (data && (data.ohlcv_data || data.close_price_data)) {
                    const priceData = data.ohlcv_data || data.close_price_data;

                    const chartData = priceData.map((point: any) => {
                        const pointDate = new Date(point.timestamp_utc + 'T00:00:00.000Z');

                        // 각 반감기의 시작일 정의
                        const halvingStartDates = {
                            1: new Date('2012-11-28T00:00:00.000Z'),
                            2: new Date('2016-07-09T00:00:00.000Z'),
                            3: new Date('2020-05-11T00:00:00.000Z'),
                            4: new Date('2024-04-20T00:00:00.000Z')
                        };

                        const startDate = halvingStartDates[period as keyof typeof halvingStartDates];
                        const days = Math.floor((pointDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

                        // 모든 반감기를 동일한 시작 가격으로 정규화
                        const normalizedPrice = point.close_price;
                        
                        // 4차 반감기의 경우 가로축 확장(Stretch) 및 오프셋(Offset) 적용
                        const finalDays = (period === 4) ? (days + cycleOffset) * stretchFactor : days;
                        
                        return [finalDays, normalizedPrice];

                    }).sort((a: any, b: any) => a[0] - b[0]); // 날짜순으로 정렬

                    const maData = calculateMovingAverage(chartData, maPeriod);
                    const maSeries = maData
                        .filter(point => point !== null)
                        .map(point => [point![0], point![1]]);

                    if (maSeries.length > 0) {
                        const currentColors = getColorMode(colorMode);
                        series.push({
                            name: `${period}st MA(${maPeriod})`,
                            type: chartType === 'area' ? 'area' : 'line',
                            data: maSeries,
                            color: Highcharts.color(currentColors.moving_average).setOpacity(0.6).get('rgba'),
                            line: {
                                dash: 'dot',
                                width: maWidth
                            },
                            // Area 차트일 때 그라데이션 효과 추가
                            ...(chartType === 'area' && {
                                fillColor: {
                                    linearGradient: {
                                        x1: 0,
                                        y1: 0,
                                        x2: 0,
                                        y2: 1
                                    },
                                    stops: [
                                        [0, Highcharts.color(currentColors.moving_average).setOpacity(0.4).get('rgba')],
                                        [1, Highcharts.color(currentColors.moving_average).setOpacity(0.05).get('rgba')]
                                    ]
                                }
                            }),
                            tooltip: {
                                valueDecimals: 2,
                                valuePrefix: '$',
                                formatter: function (): string {
                                    // 각 반감기의 시작일 기준으로 날짜 계산
                                    const halvingStartDates = {
                                        1: new Date('2012-11-28T00:00:00.000Z'),
                                        2: new Date('2016-07-09T00:00:00.000Z'),
                                        3: new Date('2020-05-11T00:00:00.000Z'),
                                        4: new Date('2024-04-20T00:00:00.000Z')
                                    };

                                    // 시리즈 이름에서 반감기 번호 추출 (예: "1st MA(20)" -> 1)

                                    // @ts-ignore
                                    const periodMatch = this.series.name.match(/(\d+)st/);
                                    const period = periodMatch ? parseInt(periodMatch[1]) : 4;
                                    const startDate = halvingStartDates[period as keyof typeof halvingStartDates];


                                    // @ts-ignore
                                    const currentDate = new Date(startDate.getTime() + this.x * 24 * 60 * 60 * 1000);
                                    const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;

                                    // 가격을 K 단위로 표시

                                    // @ts-ignore
                                    const price = this.y;
                                    let priceStr;
                                    if (price >= 1000000) {
                                        priceStr = `$${(price / 1000000).toFixed(1)}M`;
                                    } else if (price >= 1000) {
                                        priceStr = `$${(price / 1000).toFixed(0)}k`;
                                    } else {
                                        priceStr = `$${price.toFixed(0)}`;
                                    }


                                    // @ts-ignore
                                    return `<b>${this.series.name}</b><br/>
                          <b>${dateStr}</b><br/>
                          <b>${priceStr}</b>`;
                                }
                            }
                        });
                    }
                }
            });
        }

        return series;
    };

    // 반감기 색상 가져오기
    const getHalvingColors = () => {
        const currentColors = getColorMode(colorMode);
        return {
            1: currentColors.halving_1,
            2: currentColors.halving_2,
            3: currentColors.halving_3,
            4: currentColors.halving_4
        };
    };

    // 차트 데이터 변환
    const getChartSeries = () => {

        const series: any[] = [];
        const currentColors = getColorMode(colorMode);
        const lineWidths = [2, 2, 2, 4]; // 4차 반감기는 굵게

        halvingQueries.forEach((query, index) => {
            const period = periodsToLoad[index];
            const data = query.data;

            // 반감기 표시 설정 확인
            const showHalving = {
                1: showHalving1,
                2: showHalving2,
                3: showHalving3,
                4: showHalving4
            }[period];

            if (!showHalving) return; // 표시하지 않을 반감기는 건너뛰기

            if (data && (data.ohlcv_data || data.close_price_data)) {
                const priceData = data.ohlcv_data || data.close_price_data;

                // 가로축을 일수로 변경 (각 반감기의 시작일 기준으로 계산)

                const chartData = priceData.map((point: any) => {
                    const pointDate = new Date(point.timestamp_utc + 'T00:00:00.000Z');

                    // 각 반감기의 시작일 정의
                    const halvingStartDates = {
                        1: new Date('2012-11-28T00:00:00.000Z'),
                        2: new Date('2016-07-09T00:00:00.000Z'),
                        3: new Date('2020-05-11T00:00:00.000Z'),
                        4: new Date('2024-04-20T00:00:00.000Z')
                    };

                    const startDate = halvingStartDates[period as keyof typeof halvingStartDates];
                    const days = Math.floor((pointDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

                    const normalizedPrice = point.close_price;
                    
                    // 4차 반감기의 경우 가로축 확장(Stretch) 및 오프셋(Offset) 적용
                    const finalDays = (period === 4) ? (days + cycleOffset) * stretchFactor : days;
                    
                    return [finalDays, normalizedPrice]; // 정규화된 가격 사용

                }).sort((a: any, b: any) => a[0] - b[0]); // 날짜순으로 정렬

                // 4차 반감기의 경우 데이터가 끝나는 지점 이후부터 1400일까지 빈 데이터 추가
                if (period === 4) {

                    const maxDay = Math.max(...chartData.map((point: any) => point[0]));

                    // 1400일까지 빈 데이터 추가 (마지막 데이터 이후부터)
                    // 확장된 경우에도 1400일(또는 그 이상)까지 표시되도록 설정
                    const endDay = Math.max(1400, maxDay);
                    for (let day = maxDay + 1; day <= endDay; day++) {
                        chartData.push([day, null]); // null 값으로 빈 데이터 표시
                    }
                }

                series.push({
                    name: `${period}st`,
                    type: chartType,
                    data: chartData,
                    color: currentColors[`halving_${period}` as keyof typeof currentColors],
                    line: {
                        width: lineWidths[index % lineWidths.length]
                    },
                    // Area 차트일 때 그라데이션 효과 추가
                    ...(chartType === 'area' && {
                        fillColor: {
                            linearGradient: {
                                x1: 0,
                                y1: 0,
                                x2: 0,
                                y2: 1
                            },
                            stops: [
                                [0, Highcharts.color(currentColors[`halving_${period}` as keyof typeof currentColors]).setOpacity(0.7).get('rgba')],
                                [0.5, Highcharts.color(currentColors[`halving_${period}` as keyof typeof currentColors]).setOpacity(0.35).get('rgba')],
                                [0.8, Highcharts.color(currentColors[`halving_${period}` as keyof typeof currentColors]).setOpacity(0.05).get('rgba')],
                                [0.9, Highcharts.color(currentColors[`halving_${period}` as keyof typeof currentColors]).setOpacity(0.02).get('rgba')],
                                [1, Highcharts.color(currentColors[`halving_${period}` as keyof typeof currentColors]).setOpacity(0.01).get('rgba')]
                            ]
                        }
                    }),
                    tooltip: {
                        valueDecimals: 2,
                        valuePrefix: '$',
                        formatter: function (): string {
                            // 각 반감기의 시작일 기준으로 날짜 계산
                            const halvingStartDates = {
                                1: new Date('2012-11-28T00:00:00.000Z'),
                                2: new Date('2016-07-09T00:00:00.000Z'),
                                3: new Date('2020-05-11T00:00:00.000Z'),
                                4: new Date('2024-04-20T00:00:00.000Z')
                            };

                            // 시리즈 이름에서 반감기 번호 추출 (예: "1st" -> 1)

                            // @ts-ignore
                            const periodMatch = this.series.name.match(/(\d+)st/);
                            const period = periodMatch ? parseInt(periodMatch[1]) : 4;
                            const startDate = halvingStartDates[period as keyof typeof halvingStartDates];


                            // @ts-ignore
                            const currentDate = new Date(startDate.getTime() + this.x * 24 * 60 * 60 * 1000);
                            const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;

                            // 가격을 K 단위로 표시

                            // @ts-ignore
                            const price = this.y;
                            let priceStr;
                            if (price >= 1000000) {
                                priceStr = `$${(price / 1000000).toFixed(1)}M`;
                            } else if (price >= 1000) {
                                priceStr = `$${(price / 1000).toFixed(0)}k`;
                            } else {
                                priceStr = `$${price.toFixed(0)}`;
                            }


                            // @ts-ignore
                            return `<b>${this.series.name}</b><br/>
                      <b>${dateStr}</b><br/>
                      <b>${priceStr}</b>`;
                        }
                    }
                });
            }
        });

        return series;
    };

    const chartOptions = React.useMemo(() => {
        const currentColors = getColorMode(colorMode);
        const series = getChartSeriesWithMA();

        return {
            chart: {
                height: height,
                type: 'line',
                animation: false, // 실시간 조작 시 깜빡임 방지 (true -> false)
                zoomType: 'xy',
                panning: {
                    enabled: true,
                    type: 'xy'
                },
                pinchType: 'xy',
                spacing: [5, 5, 5, 5],
                margin: [10, 10, 10, 10]
            },
            boost: {
                useGPUTranslations: true,
                seriesThreshold: 1
            },
            title: {
                text: title,
                style: {
                    fontSize: '14px'
                },
                useHTML: true,
                ...(currentMenuItem?.metadata?.description && {
                    text: `<span title="${currentMenuItem.metadata.description.ko || currentMenuItem.metadata.description.en || ''}">${title}</span>`
                })
            },
            subtitle: {
                text: `Normalized to $${startPrice.toLocaleString('en-US')}`,
                style: {
                    fontSize: '12px'
                }
            },
            xAxis: {
                type: 'linear',
                title: {
                    text: 'Days After Halving'
                },
                labels: {
                    formatter: function (): string {
                        // 4차 반감기 기준으로 날짜 계산 (2024-04-20 UTC)
                        const fourthHalvingDate = new Date('2024-04-20T00:00:00.000Z');

                        // @ts-ignore
                        const currentDate = new Date(fourthHalvingDate.getTime() + this.value * 24 * 60 * 60 * 1000);
                        const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;

                        // @ts-ignore
                        return `${String(this.value).padStart(3, '0')}Day [${dateStr}]`;
                    },
                    style: { fontSize: '11px' }
                },
                tickPositioner: function () {
                    const positions = [];

                    // @ts-ignore
                    const max = Math.min(this.dataMax, dayRange);
                    const interval = Math.ceil(max / 6);

                    for (let i = 0; i <= max; i += interval) {
                        positions.push(i);
                    }

                    if (positions.indexOf(max) === -1) {
                        positions.push(max);
                    }

                    return positions;
                },
                crosshair: true,
                min: 0,
                max: dayRange,
                plotBands: showPlotBands ? [{
                    color: currentColors.plot_band,
                    from: plotBandStart,
                    to: plotBandEnd,
                    label: {
                        text: 'Custom Band',
                        style: {
                            color: '#606060'
                        }
                    }
                }] : [],
                plotLines: showPlotBands ? [{
                    color: currentColors.plot_line,
                    width: 2,
                    value: plotLineDay,
                    label: {
                        text: 'Plot Line',
                        style: {
                            color: currentColors.plot_line
                        }
                    }
                }] : []
            },
            yAxis: {
                title: {
                    text: 'Bitcoin Price (USD)',
                    style: {
                        fontSize: isMobile ? '0px' : '12px' // 모바일에서 제목 숨김
                    }
                },
                labels: {
                    formatter: function (): string {

                        // @ts-ignore
                        const value = this.value;
                        if (value >= 1000000) {
                            return '$' + (value / 1000000).toFixed(1) + 'M';
                        } else if (value >= 1000) {
                            return '$' + (value / 1000).toFixed(1) + 'K';
                        } else {
                            return '$' + value.toFixed(0);
                        }
                    },
                    style: {
                        fontSize: isMobile ? '0px' : '12px' // 모바일에서 라벨 숨김
                    }
                },
                crosshair: true,
                type: useLogScale ? 'logarithmic' : 'linear'
            },
            rangeSelector: {
                enabled: false
            },
            tooltip: {
                split: true,
                valueDecimals: 2,
                formatter: function (): string[] {

                    // @ts-ignore
                    const points = this.points;

                    // @ts-ignore
                    const days = this.x;

                    // Format the date based on the fourth halving (2024-04-20 UTC) - 공통 기준
                    const fourthHalvingDate = new Date('2024-04-20T00:00:00.000Z');
                    const currentDate = new Date(fourthHalvingDate.getTime() + days * 24 * 60 * 60 * 1000);
                    const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;

                    let tooltip = [`Day ${days} <span style="font-weight: bold; color: blue;">[${dateStr}]</span>`];


                    points.forEach((point: any) => {
                        tooltip.push(`<span style="color:${point.series.color}">\u25CF ${point.series.name}</span>: <b>$${Highcharts.numberFormat(point.y, 2)}</b>`);
                    });

                    return tooltip;
                },
                style: { fontSize: '12px' }
            },
            series: series,
            plotOptions: {
                line: {
                    marker: {
                        enabled: false
                    },
                    connectNulls: false // null 값 연결하지 않음
                },
                series: {
                    animation: false, // 개별 시리즈 애니메이션도 비활성화
                    stickyTracking: false,
                    enableMouseTracking: true,
                    dataGrouping: { enabled: false } // 데이터가 많을 때 성능 위해 그룹화 해제 또는 최적화
                }
            },
            credits: {
                enabled: false
            },
            exporting: {
                enabled: showExporting
            },
            navigator: {
                enabled: true, // 항상 활성화하되 내부 반응형으로 처리
                adaptToUpdatedData: false, // 데이터 업데이트 시 네비게이터가 멋대로 조절되지 않게
                height: isMobile ? 30 : 40,
                handles: {
                    backgroundColor: '#ffffff',
                    borderColor: '#999999',
                    enabled: true,
                    width: isMobile ? 6 : 8
                },
                xAxis: {
                    labels: {
                        formatter: function (): string {
                            const fourthHalvingDate = new Date('2024-04-20T00:00:00.000Z');
                            // @ts-ignore
                            const currentDate = new Date(fourthHalvingDate.getTime() + this.value * 24 * 60 * 60 * 1000);
                            const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;
                            return dateStr;
                        }
                    }
                }
            },
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
                        navigator: {
                            height: 25,
                            handles: {
                                width: 5
                            }
                        }
                    }
                }]
            }
        };
    }, [
        isClient, chartType, useLogScale, startPrice, showPlotBands, 
        showMovingAverage, maPeriod, maWidth, dayRange, plotLineDay, 
        plotBandStart, plotBandEnd, showHalving1, showHalving2, 
        showHalving3, showHalving4, cycleOffset, stretchFactor, 
        colorMode, isMobile, halvingQueries, height, title, currentMenuItem, showExporting
    ]);

    const getChartOptions = () => {
        return chartOptions;
    };

    // 클라이언트 사이드에서만 차트 렌더링
    if (!isClient || !HighchartsReact || !Highcharts) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <span className="ms-3">Loading chart library...</span>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <span className="ms-3">반감기 데이터 로딩 중...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger">
                <h5>차트 에러</h5>
                <p>{error.message}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5
                    className="mb-0"
                    title={currentMenuItem?.metadata?.description?.ko || currentMenuItem?.metadata?.description?.en || ''}
                    style={{ cursor: 'help' }}
                >
                    {title}
                </h5>
            </div>

            {/* Chart Controls */}
            <div className="row justify-content-center mb-3">
                <div className="col-md-8">
                    <ChartControls
                        chartType={lineSplineMode}
                        onChartTypeChange={handleLineSplineToggle}
                        isAreaMode={isAreaMode}
                        onAreaModeToggle={handleAreaModeToggle}
                        showFlags={showFlags}
                        onFlagsToggle={() => setShowFlags(!showFlags)}
                        useLogScale={useLogScale}
                        onLogScaleToggle={handleLogScaleToggle}
                        colorMode={colorMode}
                        onColorModeChange={setColorMode}
                        showFlagsButton={false} // Halving 차트에서는 플래그 버튼 숨김
                        isHalvingChart={true}
                        halvingStates={{
                            showHalving1,
                            showHalving2,
                            showHalving3,
                            showHalving4
                        }}
                        onHalvingToggle={(id) => {
                            const setters = {
                                1: setShowHalving1,
                                2: setShowHalving2,
                                3: setShowHalving3,
                                4: setShowHalving4
                            };
                            const states = {
                                1: showHalving1,
                                2: showHalving2,
                                3: showHalving3,
                                4: showHalving4
                            };
                            setters[id as keyof typeof setters](!states[id as keyof typeof states]);
                        }}
                        halvingColors={getHalvingColors()}
                    />
                </div>
            </div>

            {/* 차트 */}
            <div style={{ height: `${height}px` }}>
                <HighchartsReact
                    highcharts={Highcharts}
                    constructorType={'stockChart'}
                    options={getChartOptions()}
                    ref={chartRef}
                />
            </div>

            {/* Settings Toggle Button */}
            <div className="row mt-4">
                <div className="col-12">
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setShowSettings(!showSettings)}
                        style={{ width: '100%' }}
                    >
                        {showSettings ? '▼ Option' : '▶ Option'}
                    </button>
                </div>
            </div>

            {/* Input Controls and Indicate Controls */}
            {showSettings && (
                <div className="mt-4 space-y-4">
                    {/* Row 1: Settings Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Input Settings */}
                        <div className="bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h6 className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-4">Input Settings</h6>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Start Price</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={customStartPrice}
                                            onChange={(e) => setCustomStartPrice(Number(e.target.value))}
                                            placeholder="64940"
                                        />
                                        <button
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                            onClick={handleExecuteStartPrice}
                                        >
                                            Execute
                                        </button>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <div className="flex justify-content-between align-items-center mb-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-0">Range (Days)</label>
                                        <span className="text-sm font-bold text-blue-500">{dayRange}d</span>
                                    </div>
                                    <input
                                        type="range"
                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        min="0"
                                        max="1460"
                                        value={dayRange}
                                        onChange={(e) => setDayRange(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Indicate Settings */}
                        <div className="bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h6 className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-4">Indicate Settings</h6>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Plot Bands Section */}
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={showPlotBands}
                                            onChange={(e) => setShowPlotBands(e.target.checked)}
                                        />
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Plot Bands/Lines</span>
                                    </label>
                                    {showPlotBands && (
                                        <div className="space-y-2 pl-6">
                                            <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-1.5 rounded-md">
                                                <span className="text-[10px] text-gray-500">PL Day</span>
                                                <input type="number" className="w-12 text-center bg-transparent border-none text-[11px] font-bold p-0 outline-none" value={plotLineDay} onChange={(e) => setPlotLineDay(Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-1.5 rounded-md">
                                                <span className="text-[10px] text-gray-500">PB Start</span>
                                                <input type="number" className="w-12 text-center bg-transparent border-none text-[11px] font-bold p-0 outline-none" value={plotBandStart} onChange={(e) => setPlotBandStart(Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-1.5 rounded-md">
                                                <span className="text-[10px] text-gray-500">PB End</span>
                                                <input type="number" className="w-12 text-center bg-transparent border-none text-[11px] font-bold p-0 outline-none" value={plotBandEnd} onChange={(e) => setPlotBandEnd(Number(e.target.value))} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* MA Section */}
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={showMovingAverage}
                                            onChange={(e) => setShowMovingAverage(e.target.checked)}
                                        />
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Moving Average</span>
                                    </label>
                                    {showMovingAverage && (
                                        <div className="space-y-2 pl-6">
                                            <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-1.5 rounded-md">
                                                <span className="text-[10px] text-gray-500">Period</span>
                                                <input type="number" className="w-12 text-center bg-transparent border-none text-[11px] font-bold p-0 outline-none" value={maPeriod} onChange={(e) => setMaPeriod(Number(e.target.value))} />
                                            </div>
                                            <div className="flex justify-between items-center bg-white/50 dark:bg-black/20 p-1.5 rounded-md">
                                                <span className="text-[10px] text-gray-500">Width</span>
                                                <input type="number" className="w-12 text-center bg-transparent border-none text-[11px] font-bold p-0 outline-none" value={maWidth} onChange={(e) => setMaWidth(Number(e.target.value))} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Advanced Cycle Controls & Correlation */}
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-12">
                            {/* Left Section: Sliders & Reset */}
                            <div className="md:col-span-7 p-6 border-r border-gray-50 dark:border-gray-800">
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                {locale === 'ko' ? `4차 사이클 확장: ${stretchFactor.toFixed(2)}배` : `4th Cycle Stretch: ${stretchFactor.toFixed(2)}x`}
                                            </label>
                                            <span className="text-sm font-black text-blue-600">{stretchFactor.toFixed(2)}x</span>
                                        </div>
                                        <input
                                            type="range"
                                            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            min="0.5"
                                            max="2.5"
                                            step="0.01"
                                            value={stretchFactor}
                                            onChange={(e) => setStretchFactor(Number(e.target.value))}
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                {locale === 'ko' ? `4차 사이클 오프셋: ${cycleOffset}일` : `4th Cycle Offset: ${cycleOffset} Days`}
                                            </label>
                                            <span className="text-sm font-black text-blue-600">{cycleOffset < 0 ? cycleOffset : `+${cycleOffset}`}d</span>
                                        </div>
                                        <input
                                            type="range"
                                            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            min="-365"
                                            max="365"
                                            step="1"
                                            value={cycleOffset}
                                            onChange={(e) => setCycleOffset(Number(e.target.value))}
                                        />
                                    </div>

                                    <div className="pt-2 text-center">
                                        <button
                                            className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                                            onClick={handleReset}
                                        >
                                            {locale === 'ko' ? '설정 초기화 (Reset Settings)' : 'Reset Settings'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Section: Correlation Analysis */}
                            <div className="md:col-span-5 p-6 bg-gray-50/50 dark:bg-gray-800/10">
                                <div className="flex items-center justify-between mb-6">
                                    <h6 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{locale === 'ko' ? '상관관계 분석' : 'Correlation Analysis'}</h6>
                                    <button 
                                        onClick={() => handleAutoStretch()}
                                        className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black hover:bg-blue-100 transition-colors"
                                    >
                                        AUTO {recommendations['all'] ? `(${recommendations['all']}x)` : ''}
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {[1, 2, 3].map(period => {
                                        const score = correlations[period];
                                        const rec = recommendations[period];
                                        const currentColors = getColorMode(colorMode);
                                        const periodColor = currentColors[`halving_${period}` as keyof typeof currentColors];

                                        return (
                                            <div key={period} className="bg-white dark:bg-gray-900 flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full ring-2 ring-white/50 flex-shrink-0" style={{ backgroundColor: periodColor }}></div>
                                                    <div>
                                                        <div className="text-[10px] font-black uppercase" style={{ color: periodColor }}>{period}st Cycle</div>
                                                        {rec && (
                                                            <button 
                                                                onClick={() => handleAutoStretch(period)}
                                                                className="text-[9px] font-bold text-blue-500/60 hover:text-blue-500 mt-0.5"
                                                            >
                                                                Best: {rec}x <span className="underline">[Apply]</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={`text-sm font-black ${score && score > 0.8 ? 'text-green-500' : score && score > 0.5 ? 'text-orange-500' : 'text-red-500'}`}>
                                                    {score !== null && score !== undefined ? score.toFixed(4) : '-'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="mt-4 text-[9px] text-gray-400 italic leading-snug">
                                    {locale === 'ko' ? '* 피어슨 상관계수 기반의 통계적 패턴 매칭 지수' : '* Pearson Correlation based pattern matching score'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HalvingChart;
