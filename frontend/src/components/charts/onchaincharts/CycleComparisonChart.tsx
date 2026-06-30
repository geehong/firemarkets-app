
"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigation } from '@/hooks/useNavigation';
import ChartControls from '@/components/common/ChartControls';
import { getColorMode } from '@/constants/colorModes';
import { useMultipleComparisonCycleData } from '@/hooks/useCrypto';
import { apiClient } from '@/lib/api';

interface CycleComparisonChartProps {
    title?: string;
    height?: number;
    showRangeSelector?: boolean;
    showExporting?: boolean;
}


// ERA 정의
const ERA_DATES = {
    1: { start: '2011-11-28', end: '2015-11-28' },
    2: { start: '2015-01-14', end: '2019-01-14' },
    3: { start: '2018-12-15', end: '2022-12-15' },
    4: { start: '2022-11-21', end: new Date().toISOString().split('T')[0] }
};

const CycleComparisonChart: React.FC<CycleComparisonChartProps> = ({
    title = 'Bitcoin Cycle Comparison',
    height = 600,
    showRangeSelector = false,
    showExporting = true
}) => {

    const [chartType, setChartType] = useState('line');
    const [useLogScale, setUseLogScale] = useState(true);
    const [isAreaMode, setIsAreaMode] = useState(false);
    const [lineSplineMode, setLineSplineMode] = useState<'line' | 'spline'>('line');
    const [startPrice, setStartPrice] = useState(0); // Initialize to 0 to prevent premature fetching
    const [customStartPrice, setCustomStartPrice] = useState(64940);
    const [showPlotBands, setShowPlotBands] = useState(false);
    const [showMovingAverage, setShowMovingAverage] = useState(false);
    const [maPeriod, setMaPeriod] = useState(20);
    const [maWidth, setMaWidth] = useState(2);
    const [dayRange, setDayRange] = useState(1460);
    const [plotLineDay, setPlotLineDay] = useState(365);
    const [plotBandStart, setPlotBandStart] = useState(366);
    const [plotBandEnd, setPlotBandEnd] = useState(550);

    const [showEra1, setShowEra1] = useState(true);
    const [showEra2, setShowEra2] = useState(true);
    const [showEra3, setShowEra3] = useState(true);
    const [showEra4, setShowEra4] = useState(true);
    const [selectedAssets, setSelectedAssets] = useState<string[]>(['BTCUSDT']);
    const [showFlags, setShowFlags] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    const [colorMode, setColorMode] = useState<'dark' | 'vivid' | 'high-contrast' | 'simple'>('vivid');
    const [showSettings, setShowSettings] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [cycleOffset, setCycleOffset] = useState(0);
    const [stretchFactor, setStretchFactor] = useState(1.0);
    const [correlations, setCorrelations] = useState<Record<number, number | null>>({});
    const [recommendations, setRecommendations] = useState<Record<string, number | null>>({});
    const [HighchartsReact, setHighchartsReact] = useState<any>(null);
    const [Highcharts, setHighcharts] = useState<any>(null);
    const chartRef = useRef<any>(null);

    // 네비게이션 메뉴 데이터 가져오기
    const { currentMenuItem } = useNavigation();

    // Load Highcharts dynamically
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

                setHighchartsReact(() => HighchartsReactComponent)
                setHighcharts(HighchartsCore)
                setIsClient(true)
            } catch (error) {
                console.error('Failed to load Highcharts:', error)
            }
        }

        loadHighcharts()
    }, [])

    // Load Era 4 start price initially
    useEffect(() => {
        const loadEra4StartPrice = async () => {
            try {
                const result = await apiClient.getComparisonCycleData(4, {
                    assetIdentifiers: 'BTCUSDT'
                });
                if (result && result.assets && result.assets.length > 0) {
                    const btcAsset = result.assets.find((a: any) => a.ticker === 'BTCUSDT' || a.ticker === 'BTC');
                    if (btcAsset && btcAsset.data && btcAsset.data.length > 0) {
                        const price = btcAsset.data[0].close_price;
                        setStartPrice(price);
                        setCustomStartPrice(price);
                    }
                } else {
                    // Fallback to default if data load fails
                    setStartPrice(64940);
                }
            } catch (err) {
                console.error('Failed to load ERA 4 start price:', err);
                setStartPrice(64940); // Fallback on error
            }
        };
        loadEra4StartPrice();
    }, []); // Run only once

    // Use the optimized hook for fetching multiple eras
    const periods = useMemo(() => [1, 2, 3, 4], []);
    const cycleData = useMultipleComparisonCycleData(periods, {
        normalizeToPrice: startPrice,
        assetIdentifiers: selectedAssets.join(',')
    }, startPrice > 0);

    const eraData = cycleData.data;
    const loading = cycleData.isLoading;
    const error = cycleData.isError ? cycleData.errors[0] : null;

    // Window resize handler
    useEffect(() => {
        if (!isClient) return;
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isClient]);

    // Handle Chart Type changes
    const updateChartType = (newType: string) => {
        const chart = chartRef.current?.chart;
        if (chart && chart.series && chart.series.length > 0) {
            chart.series.forEach((series: any) => {
                series.update({ type: newType }, false);
            });
            chart.redraw();
        }
    };

    const handleLineSplineToggle = () => {
        const newLineSplineMode = lineSplineMode === 'line' ? 'spline' : 'line';
        setLineSplineMode(newLineSplineMode);

        let newChartType;
        if (isAreaMode) {
            newChartType = newLineSplineMode === 'spline' ? 'areaspline' : 'area';
        } else {
            newChartType = newLineSplineMode;
        }
        setChartType(newChartType);
        updateChartType(newChartType);
    };

    const handleAreaModeToggle = () => {
        const newAreaMode = !isAreaMode;
        setIsAreaMode(newAreaMode);

        let newChartType;
        if (newAreaMode) {
            newChartType = lineSplineMode === 'spline' ? 'areaspline' : 'area';
        } else {
            newChartType = lineSplineMode;
        }
        setChartType(newChartType);
        updateChartType(newChartType);
    };

    const handleLogScaleToggle = () => {
        setUseLogScale(!useLogScale);
        const chart = chartRef.current?.chart;
        if (chart) {
            chart.yAxis.forEach((axis: any) => {
                axis.update({
                    type: !useLogScale ? 'logarithmic' : 'linear'
                }, false);
            });
            chart.redraw();
        }
    };

    // Update x-axis extremes when dayRange changes
    useEffect(() => {
        const chart = chartRef.current?.chart;
        if (chart) {
            chart.xAxis[0].setExtremes(0, dayRange);
        }
    }, [dayRange]);

    const calculateMovingAverage = (data: number[][], period: number) => {
        if (!data || data.length < period) return [];
        const result: (number[] | null)[] = [];
        let sum = 0;

        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                sum += data[i][1];
                result.push(null);
            } else {
                if (i === period - 1) {
                    sum += data[i][1];
                } else {
                    sum = sum - data[i - period][1] + data[i][1];
                }
                result.push([data[i][0], sum / period]);
            }
        }
        return result;
    };

    const calculatePearsonCorrelation = React.useCallback((x: number[], y: number[]) => {
        if (x.length < 5) return null;
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
    }, []);

    const processedChartData = React.useMemo(() => {
        if (!eraData || Object.keys(eraData).length < 2) return null;

        const results: {
            hMaps: Record<number, Record<number, number>>,
            priceData4: { days: number, close: number }[]
        } = { hMaps: {}, priceData4: [] };

        [1, 2, 3].forEach(era => {
            const eraInfo = eraData[era];
            if (!eraInfo || !eraInfo.assets) return;
            const btcAsset = eraInfo.assets.find((a: any) => a.ticker === 'BTCUSDT' || a.ticker === 'BTC');
            if (!btcAsset || !btcAsset.data) return;

            const hMap: Record<number, number> = {};
            btcAsset.data.forEach((p: any) => {
                hMap[p.days] = p.normalized_price;
            });
            results.hMaps[era] = hMap;
        });

        const q4Info = eraData[4];
        if (q4Info && q4Info.assets) {
            const btcAsset = q4Info.assets.find((a: any) => a.ticker === 'BTCUSDT' || a.ticker === 'BTC');
            if (btcAsset && btcAsset.data) {
                results.priceData4 = btcAsset.data.map((p: any) => ({
                    days: p.days,
                    close: p.normalized_price
                }));
            }
        }

        return results;
    }, [eraData]);

    const getCorrelationsAt = React.useCallback((sFactor: number, cOffset: number) => {
        if (!processedChartData) return {};
        
        const results: Record<number, number | null> = {};
        const { hMaps, priceData4 } = processedChartData;

        [1, 2, 3].forEach(era => {
            const hMap = hMaps[era];
            if (!hMap || priceData4.length === 0) {
                results[era] = null;
                return;
            }

            const x4: number[] = [];
            const yH: number[] = [];

            priceData4.forEach(p4 => {
                const finalDays = Math.round((p4.days + cOffset) * sFactor);
                if (hMap[finalDays] !== undefined) {
                    x4.push(p4.close);
                    yH.push(hMap[finalDays]);
                }
            });

            const corr = calculatePearsonCorrelation(x4, yH);
            results[era] = corr;
        });

        return results;
    }, [processedChartData, calculatePearsonCorrelation]);

    const handleAutoStretch = React.useCallback((targetPeriod?: number) => {
        if (!processedChartData) return;
        
        const bestFactors: Record<number, { factor: number, score: number }> = {};
        let globalBest = { factor: 1.0, score: -1 };
        const testOffset = cycleOffset;

        [1, 2, 3].forEach(era => {
            let maxScore = -1;
            let bestFactor = 1.0;
            for (let f = 0.5; f <= 2.5; f += 0.01) {
                const corrs = getCorrelationsAt(f, testOffset);
                const score = corrs[era];
                if (score !== null && score !== undefined && score > maxScore) {
                    maxScore = score;
                    bestFactor = f;
                }
            }
            if (maxScore > -1) {
                bestFactors[era] = { factor: bestFactor, score: maxScore };
                if (maxScore > globalBest.score) {
                    globalBest = { factor: bestFactor, score: maxScore };
                }
            }
        });

        const newRecommendations: Record<string, number | null> = {};
        [1, 2, 3].forEach(era => {
            newRecommendations[era] = bestFactors[era] ? parseFloat(bestFactors[era].factor.toFixed(2)) : null;
        });

        if (globalBest.score > -1) {
            newRecommendations['all'] = parseFloat(globalBest.factor.toFixed(2));
            const selectedFactor = targetPeriod && bestFactors[targetPeriod] ? bestFactors[targetPeriod].factor : globalBest.factor;
            setStretchFactor(parseFloat(selectedFactor.toFixed(2)));
            setRecommendations(newRecommendations);
        }
    }, [processedChartData, cycleOffset, getCorrelationsAt]);

    useEffect(() => {
        const corrs = getCorrelationsAt(stretchFactor, cycleOffset);
        setCorrelations(corrs);
    }, [stretchFactor, cycleOffset, getCorrelationsAt]);

    const getEraColors = () => {
        const currentColors = getColorMode(colorMode);
        return {
            1: currentColors.halving_1,
            2: currentColors.halving_2,
            3: currentColors.halving_3,
            4: currentColors.halving_4
        };
    };

    const getChartSeries = () => {
        const series: any[] = [];
        const currentColors = getColorMode(colorMode);
        const eraColors = getEraColors();
        const lineWidths = [2, 2, 2, 4]; // ERA 4 is thicker

        [1, 2, 3, 4].forEach((era) => {
            const showEra = {
                1: showEra1,
                2: showEra2,
                3: showEra3,
                4: showEra4
            }[era];

            if (!showEra) return;

            const eraInfo = eraData[era];
            if (!eraInfo || !eraInfo.assets) return;

            eraInfo.assets.forEach((asset: any) => {
                const isBitcoin = asset.ticker === 'BTCUSDT' || asset.ticker === 'BTC';
                if (!isBitcoin && !selectedAssets.includes(asset.ticker)) {
                    return;
                }

                if (asset.data && asset.data.length > 0) {
                    const chartData = asset.data.map((point: any) => {
                        const finalDays = (era === 4) ? (point.days + cycleOffset) * stretchFactor : point.days;
                        return [finalDays, point.normalized_price];
                    });
                    const seriesName = `${era}st ${asset.ticker}`;

                    series.push({
                        name: seriesName,
                        type: chartType,
                        data: chartData,
                        color: isBitcoin
                            ? eraColors[era as keyof typeof eraColors]
                            : currentColors.moving_average,
                        line: {
                            width: isBitcoin ? lineWidths[era - 1] : 1.5
                        },
                        ...(chartType === 'area' && Highcharts && {
                            fillColor: {
                                linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                                stops: [
                                    [0, Highcharts.color(isBitcoin ? eraColors[era as keyof typeof eraColors] : currentColors.moving_average).setOpacity(0.7).get('rgba')],
                                    [1, Highcharts.color(isBitcoin ? eraColors[era as keyof typeof eraColors] : currentColors.moving_average).setOpacity(0.01).get('rgba')]
                                ]
                            }
                        }),
                    });
                }
            });
        });

        return series;
    };

    const getChartSeriesWithMA = () => {
        const series = getChartSeries();

        if (showMovingAverage && Highcharts) {
            [1, 2, 3, 4].forEach((era) => {
                const showEra = { 1: showEra1, 2: showEra2, 3: showEra3, 4: showEra4 }[era];
                if (!showEra) return;

                const eraInfo = eraData[era];
                if (!eraInfo || !eraInfo.assets) return;

                eraInfo.assets.forEach((asset: any) => {
                    if (asset.ticker !== 'BTCUSDT' && asset.ticker !== 'BTC') return;
                    if (!asset.data || asset.data.length === 0) return;

                    const chartData = asset.data.map((point: any) => [point.days, point.normalized_price]);
                    const maData = calculateMovingAverage(chartData, maPeriod);
                    const maSeries = maData.filter(point => point !== null).map(point => [point![0], point![1]]);

                    if (maSeries.length > 0) {
                        const eraColors = getEraColors();
                        series.push({
                            name: `${era}st MA(${maPeriod})`,
                            type: chartType === 'area' ? 'area' : 'line',
                            data: maSeries,
                            color: Highcharts.color(eraColors[era as keyof typeof eraColors]).setOpacity(0.6).get('rgba'),
                            line: { dash: 'dot', width: maWidth },
                        });
                    }
                });
            });
        }
        return series;
    };

    const getChartOptions = () => {
        const currentColors = getColorMode(colorMode);

        return {
            chart: {
                height: height,
                type: 'line',
                animation: { duration: 500 },
                zoomType: 'xy',
                panning: { enabled: true, type: 'xy' },
                spacing: [5, 5, 5, 5],
                margin: [10, 10, 10, 10]
            },
            title: {
                text: title,
                style: { fontSize: '14px' },
                useHTML: true
            },
            subtitle: {
                text: `Normalized to $${startPrice.toLocaleString('en-US')}`,
                style: { fontSize: '12px' }
            },
            xAxis: {
                type: 'linear',
                title: { text: 'Days After Start' },
                labels: {
                    formatter: function (this: any) {
                        const era4StartDate = new Date('2022-11-21T00:00:00.000Z');
                        const currentDate = new Date(era4StartDate.getTime() + this.value * 24 * 60 * 60 * 1000);
                        const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;
                        return `${String(this.value).padStart(3, '0')}Day [${dateStr}]`;
                    },
                    style: { fontSize: '11px' }
                },
                min: 0,
                max: dayRange,
                plotLines: showPlotBands ? [{ color: currentColors.plot_line, width: 2, value: plotLineDay, label: { text: 'Plot Line' } }] : []
            },
            yAxis: {
                title: { text: 'Normalized Price (USD)' },
                type: useLogScale ? 'logarithmic' : 'linear',
                labels: {
                    formatter: function (this: any) {
                        if (this.value >= 1000000) return '$' + (this.value / 1000000).toFixed(1) + 'M';
                        if (this.value >= 1000) return '$' + (this.value / 1000).toFixed(1) + 'K';
                        return '$' + this.value.toFixed(0);
                    }
                }
            },
            tooltip: {
                split: true,
                valueDecimals: 2,
                formatter: function (this: any): string[] {
                    const points = this.points;
                    const days = this.x;
                    const era4StartDate = new Date('2022-11-21T00:00:00.000Z');
                    const actualDays = (days / stretchFactor) - cycleOffset;
                    const currentDate = new Date(era4StartDate.getTime() + actualDays * 24 * 60 * 60 * 1000);
                    const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;

                    let tooltip = [`Day ${days} <span style="font-weight: bold; color: blue;">[${dateStr}]</span>`];
                    points.forEach((point: any) => {
                        tooltip.push(`<span style="color:${point.series.color}">\u25CF ${point.series.name}</span>: <b>$${Highcharts.numberFormat(point.y, 2)}</b>`);
                    });
                    return tooltip;
                },
                style: { fontSize: '12px' }
            },
            series: getChartSeriesWithMA(),
            plotOptions: {
                line: { marker: { enabled: false } }
            },
            credits: { enabled: false },
            exporting: { enabled: showExporting },
            navigator: {
                enabled: !isMobile,
                xAxis: {
                    tickInterval: 60,
                    labels: {
                        formatter: function (this: any): string {
                            const era4StartDate = new Date('2022-11-21T00:00:00.000Z');
                            const currentDate = new Date(era4StartDate.getTime() + this.value * 24 * 60 * 60 * 1000);
                            return `${currentDate.getFullYear().toString().slice(-2)}.${('0' + (currentDate.getMonth() + 1)).slice(-2)}`;
                        }
                    }
                }
            },
            responsive: {
                rules: [{
                    condition: { maxWidth: 768 },
                    chartOptions: {
                        chart: { height: Math.min(height, 800) },
                        rangeSelector: { enabled: false },
                        navigator: {
                            enabled: true,
                            xAxis: {
                                tickInterval: 60,
                                labels: {
                                    formatter: function (this: any): string {
                                        const era4StartDate = new Date('2022-11-21T00:00:00.000Z');
                                        const currentDate = new Date(era4StartDate.getTime() + this.value * 24 * 60 * 60 * 1000);
                                        return `${currentDate.getFullYear().toString().slice(-2)}.${('0' + (currentDate.getMonth() + 1)).slice(-2)}`;
                                    }
                                }
                            }
                        }
                    }
                }]
            }
        };
    };

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

    if (loading && Object.keys(eraData).length === 0) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <span className="ms-3">Loading cycle data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger">
                <h5>Chart Error</h5>
                <p>{(error as Error).message}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
                <h5 className="mb-0 font-bold text-lg">{title}</h5>
            </div>

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
                        showFlagsButton={false}
                        isHalvingChart={true}
                        halvingStates={{
                            showHalving1: showEra1,
                            showHalving2: showEra2,
                            showHalving3: showEra3,
                            showHalving4: showEra4
                        }}
                        onHalvingToggle={(id) => {
                            const setters = { 1: setShowEra1, 2: setShowEra2, 3: setShowEra3, 4: setShowEra4 };
                            setters[id as keyof typeof setters](!({ 1: showEra1, 2: showEra2, 3: showEra3, 4: showEra4 }[id as keyof typeof setters]));
                        }}
                        halvingColors={getEraColors()}
                    />
                </div>
            </div>

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

            {/* Option and Controls */}
            {showSettings && (
                <div className="mt-4 bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-12">
                        {/* Left Section: Sliders & Reset */}
                        <div className="md:col-span-7 p-6 border-r border-gray-50 dark:border-gray-800">
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                            4차 사이클 확장: {stretchFactor.toFixed(2)}배
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
                                            4차 사이클 오프셋: {cycleOffset}일
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
                                        onClick={() => { setCycleOffset(0); setStretchFactor(1.0); }}
                                    >
                                        설정 초기화 (Reset Settings)
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Section: Correlation Analysis */}
                        <div className="md:col-span-5 p-6 bg-gray-50/50 dark:bg-gray-800/10">
                            <div className="flex items-center justify-between mb-6">
                                <h6 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">상관관계 분석 (Correlation Analysis)</h6>
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
                                * Pearson Correlation based pattern matching score
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CycleComparisonChart;
