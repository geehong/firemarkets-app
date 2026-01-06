
"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigation } from '@/hooks/useNavigation';
import ChartControls from '@/components/common/ChartControls';
import { getColorMode } from '@/constants/colorModes';
import { useMultipleComparisonCycleData } from '@/hooks/useCrypto';
import { apiClient } from '@/lib/api';

interface CycleComparisonChartProps {
    title?: string;
    height: number;
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
    height,
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
                    { default: HighchartsReactComponent },
                    { default: HighchartsCore }
                ] = await Promise.all([
                    import('highcharts-react-official'),
                    import('highcharts/highstock')
                ])

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
                    const chartData = asset.data.map((point: any) => [point.days, point.normalized_price]);
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
                        tooltip: {
                            valueDecimals: 2,
                            formatter: function (this: any) {
                                const era4StartDate = new Date('2022-11-21T00:00:00.000Z');
                                const currentDate = new Date(era4StartDate.getTime() + this.x * 24 * 60 * 60 * 1000);
                                const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;

                                let priceStr;
                                if (this.y >= 1000000) priceStr = `$${(this.y / 1000000).toFixed(1)}M`;
                                else if (this.y >= 1000) priceStr = `$${(this.y / 1000).toFixed(0)}k`;
                                else priceStr = `$${this.y.toFixed(0)}`;

                                return `<b>${this.series.name}</b><br/>
                        <b>Day ${String(this.x).padStart(3, '0')}[${dateStr}(ERA4기준)]</b><br/>
                        <b>${priceStr}</b>`;
                            }
                        }
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
                            tooltip: {
                                valueDecimals: 2,
                                formatter: function (this: any) {
                                    const era4StartDate = new Date('2022-11-21T00:00:00.000Z');
                                    const currentDate = new Date(era4StartDate.getTime() + this.x * 24 * 60 * 60 * 1000);
                                    const dateStr = `${currentDate.getFullYear().toString().slice(-2)}/${('0' + (currentDate.getMonth() + 1)).slice(-2)}/${('0' + currentDate.getDate()).slice(-2)}`;
                                    return `<b>${this.series.name}</b><br/><b>Day ${String(this.x).padStart(3, '0')}[${dateStr}]</b><br/><b>$${this.y.toFixed(0)}</b>`;
                                }
                            }
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
                valueDecimals: 2
            },
            series: getChartSeriesWithMA(),
            plotOptions: {
                line: { marker: { enabled: false } }
            },
            credits: { enabled: false },
            exporting: { enabled: showExporting },
            navigator: { enabled: !isMobile },
            responsive: {
                rules: [{
                    condition: { maxWidth: 768 },
                    chartOptions: {
                        chart: { height: Math.min(height, 800) },
                        rangeSelector: { enabled: false },
                        navigator: { enabled: true }
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

            {/* Option toggle could go here, simplified for now */}
        </div>
    );
};

export default CycleComparisonChart;
