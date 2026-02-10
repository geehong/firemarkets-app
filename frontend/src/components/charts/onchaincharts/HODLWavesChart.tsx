"use client"

import React, { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';

interface HODLWavesChartProps {
    height?: number;
    locale?: string;
}

const AGE_BUCKET_LABELS: Record<string, { en: string; ko: string; color: string }> = {
    "0d_1d": { en: "< 1 Day", ko: "< 1일", color: "#FF6B6B" },
    "1d_1w": { en: "1 Day - 1 Week", ko: "1일 - 1주", color: "#FF8E72" },
    "1w_1m": { en: "1 Week - 1 Month", ko: "1주 - 1개월", color: "#FFA94D" },
    "1m_3m": { en: "1 - 3 Months", ko: "1 - 3개월", color: "#FFD43B" },
    "3m_6m": { en: "3 - 6 Months", ko: "3 - 6개월", color: "#A9E34B" },
    "6m_1y": { en: "6 - 12 Months", ko: "6 - 12개월", color: "#69DB7C" },
    "1y_2y": { en: "1 - 2 Years", ko: "1 - 2년", color: "#38D9A9" },
    "2y_3y": { en: "2 - 3 Years", ko: "2 - 3년", color: "#3BC9DB" },
    "3y_4y": { en: "3 - 4 Years", ko: "3 - 4년", color: "#4DABF7" },
    "4y_5y": { en: "4 - 5 Years", ko: "4 - 5년", color: "#748FFC" },
    "5y_7y": { en: "5 - 7 Years", ko: "5 - 7년", color: "#9775FA" },
    "7y_10y": { en: "7 - 10 Years", ko: "7 - 10년", color: "#DA77F2" },
    "10y": { en: "> 10 Years", ko: "> 10년", color: "#F783AC" }
};

// 테마 스타일 정의
const THEMES = {
    light: {
        background: '#ffffff',
        text: '#333333',
        subtext: '#666666',
        grid: '#e0e0e0',
        axis: '#cccccc',
        tooltipBg: 'rgba(255, 255, 255, 0.95)',
        tooltipBorder: '#cccccc',
        legendBg: 'rgba(255, 255, 255, 0.8)',
        buttonFill: '#f0f0f0',
        buttonStroke: '#cccccc',
        buttonText: '#333333',
        containerBg: 'bg-white',
        metaText: 'text-gray-600',
        priceColor: '#000000'
    },
    dark: {
        background: '#1a1a2e',
        text: '#ffffff',
        subtext: '#8892b0',
        grid: '#2a2a4a',
        axis: '#3d3d5c',
        tooltipBg: 'rgba(26, 26, 46, 0.95)',
        tooltipBorder: '#3d3d5c',
        legendBg: 'rgba(0, 0, 0, 0.3)',
        buttonFill: '#2a2a4a',
        buttonStroke: '#3d3d5c',
        buttonText: '#8892b0',
        containerBg: 'bg-gray-900',
        metaText: 'text-gray-500',
        priceColor: '#ffffff'
    }
};

const fetchHODLWavesData = async () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/onchain/metrics/hodl_waves/distribution?limit=5000`);
    if (!response.ok) {
        throw new Error('Failed to fetch HODL Waves data');
    }
    return response.json();
};

const HODLWavesChart: React.FC<HODLWavesChartProps> = ({
    height = 600,
    locale = 'en'
}) => {
    const [isClient, setIsClient] = useState(false);
    const [Highcharts, setHighcharts] = useState<any>(null);
    const [HighchartsReact, setHighchartsReact] = useState<any>(null);
    const { theme: globalTheme } = useTheme(); // 글로벌 테마 사용
    const chartRef = useRef<any>(null);

    const isDarkMode = globalTheme === 'dark';
    const theme = isDarkMode ? THEMES.dark : THEMES.light;

    const { data, isLoading, error } = useQuery({
        queryKey: ['hodl-waves-distribution'],
        queryFn: fetchHODLWavesData,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false
    });

    // Highcharts 동적 로드
    useEffect(() => {
        const loadHighcharts = async () => {
            try {
                const [
                    { default: HighchartsReactComponent },
                    { default: HighchartsCore }
                ] = await Promise.all([
                    import('highcharts-react-official'),
                    import('highcharts/highstock')
                ]);

                await Promise.all([
                    import('highcharts/modules/exporting'),
                    import('highcharts/modules/accessibility')
                ]);

                setHighchartsReact(() => HighchartsReactComponent);
                setHighcharts(HighchartsCore);
                setIsClient(true);
            } catch (error) {
                console.error('Failed to load Highcharts:', error);
            }
        };

        loadHighcharts();
    }, []);

    if (!isClient || !Highcharts || !HighchartsReact) {
        return (
            <div className={`flex items-center justify-center ${theme.containerBg} rounded-xl`} style={{ height }}>
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center ${theme.containerBg} rounded-xl`} style={{ height }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className={theme.metaText}>Loading HODL Waves data...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={`flex items-center justify-center ${theme.containerBg} rounded-xl`} style={{ height }}>
                <p className="text-red-400">Failed to load HODL Waves data</p>
            </div>
        );
    }

    // 시리즈 데이터 구성
    const ageBuckets = data.age_buckets || [];
    const seriesData = data.series || {};
    const rawData = data.data || [];

    // HODL Waves 시리즈 (공급량)
    const wavesSeries = ageBuckets.map((bucket: string) => {
        const bucketData = seriesData[bucket] || [];
        const formattedData = bucketData.map((item: { date: string; value: number }) => {
            const timestamp = new Date(item.date).getTime();
            return [timestamp, item.value];
        });

        const label = AGE_BUCKET_LABELS[bucket];
        return {
            name: label ? (locale === 'ko' ? label.ko : label.en) : bucket,
            type: 'areaspline',
            data: formattedData,
            color: label?.color || '#888',
            fillOpacity: 0.6,
            yAxis: 0, // 우측 (공급량)
            zIndex: 1
        };
    });

    // 가격 데이터 구성
    const priceData = rawData
        .filter((item: any) => item.price != null)
        .map((item: any) => [
            new Date(item.date).getTime(),
            item.price
        ])
        .sort((a: any, b: any) => a[0] - b[0]); // 시간순 정렬

    const priceSeries = {
        name: 'Bitcoin Price',
        type: 'line',
        data: priceData,
        yAxis: 1, // 좌측 (로그 가격)
        color: theme.priceColor,
        lineWidth: 1.5,
        zIndex: 2,
        tooltip: {
            valueDecimals: 2,
            valuePrefix: '$'
        }
    };

    const chartOptions = {
        chart: {
            backgroundColor: theme.background,
            height: height,
            zooming: {
                type: 'x'
            },
            style: {
                fontFamily: 'inherit'
            },
            panning: {
                enabled: true,
                type: 'x'
            },
            panKey: 'shift'
        },
        title: {
            text: locale === 'ko' ? 'Bitcoin HODL Waves (보유 연령 분포)' : 'Bitcoin HODL Waves (Age Distribution)',
            style: {
                color: theme.text,
                fontSize: '18px',
                fontWeight: 'bold'
            }
        },
        subtitle: {
            text: locale === 'ko' ? '비트코인 공급량의 보유 기간별 분포 vs 가격' : 'Distribution of Bitcoin Supply by Holding Period vs Price',
            style: {
                color: theme.subtext
            }
        },
        xAxis: {
            type: 'datetime',
            labels: {
                style: { color: theme.subtext }
            },
            lineColor: theme.axis,
            tickColor: theme.axis,
            crosshair: true
        },
        yAxis: [{
            // Primary Y-Axis (Supply) - Right
            title: {
                text: locale === 'ko' ? '공급량 (BTC)' : 'Supply (BTC)',
                style: { color: theme.subtext }
            },
            labels: {
                style: { color: theme.subtext },
                align: 'left',
                x: 8,
                formatter: function(this: any) {
                    return (this.value / 1000000).toFixed(1) + 'M';
                }
            },
            gridLineColor: theme.grid,
            opposite: true, // 우측 배치
            stackLabels: {
                enabled: false
            }
        }, {
            // Secondary Y-Axis (Price) - Left
            title: {
                text: locale === 'ko' ? '가격 (USD, Log)' : 'Price (USD, Log)',
                style: { color: theme.subtext }
            },
            labels: {
                style: { color: theme.subtext },
                align: 'right',
                x: -8,
                formatter: function(this: any) {
                    return '$' + this.value.toLocaleString();
                }
            },
            gridLineWidth: 0, // 그리드 라인 제거 (공급량 축 그리드 사용)
            opposite: false, // 좌측 배치
            type: 'logarithmic' // 로그 스케일
        }],
        legend: {
            enabled: true,
            align: 'center',
            verticalAlign: 'bottom',
            layout: 'horizontal',
            itemStyle: {
                color: theme.subtext,
                fontSize: '11px'
            },
            itemHoverStyle: {
                color: theme.text
            },
            backgroundColor: theme.legendBg,
            borderRadius: 5,
            padding: 10
        },
        tooltip: {
            shared: true,
            backgroundColor: theme.tooltipBg,
            borderColor: theme.tooltipBorder,
            style: {
                color: theme.text
            },
            headerFormat: '<span style="font-size: 12px; font-weight: bold;">{point.key}</span><br/>',
            pointFormatter: function(this: any) {
                const value = this.y;
                // 가격인 경우
                if (this.series.name === 'Bitcoin Price') {
                    return `<span style="color:${this.series.color}">●</span> ${this.series.name}: <b>$${value.toLocaleString()}</b><br/>`;
                }
                // 공급량인 경우
                const formattedValue = value >= 1000000 
                    ? (value / 1000000).toFixed(2) + 'M'
                    : value >= 1000 
                        ? (value / 1000).toFixed(2) + 'K'
                        : value.toFixed(2);
                return `<span style="color:${this.series.color}">●</span> ${this.series.name}: <b>${formattedValue} BTC</b><br/>`;
            }
        },
        plotOptions: {
            areaspline: {
                stacking: 'normal',
                lineWidth: 0, // 영역 차트 선 제거 (깔끔하게)
                marker: {
                    enabled: false,
                    states: {
                        hover: {
                            enabled: true
                        }
                    }
                },
                fillOpacity: 0.8 // 불투명도 증가
            },
            line: {
                marker: {
                    enabled: false
                }
            }
        },
        series: [...wavesSeries, priceSeries], // 가격 시리즈 추가
        credits: {
            enabled: false
        },
        exporting: {
            enabled: true,
            buttons: {
                contextButton: {
                    theme: {
                        fill: theme.background
                    }
                }
            }
        },
        navigator: {
            enabled: true,
            height: 40,
            margin: 10,
            maskFill: isDarkMode ? 'rgba(102,133,194,0.2)' : 'rgba(102,133,194,0.3)',
            outlineColor: theme.axis,
            series: {
                color: theme.priceColor,
                lineColor: theme.priceColor
            }
        },
        scrollbar: {
            enabled: true,
            barBackgroundColor: theme.axis,
            barBorderColor: theme.axis,
            buttonBackgroundColor: theme.buttonFill,
            buttonBorderColor: theme.axis,
            rifleColor: theme.subtext,
            trackBackgroundColor: theme.background,
            trackBorderColor: theme.axis
        },
        rangeSelector: {
            enabled: true,
            selected: 4,
            buttons: [{
                type: 'month',
                count: 1,
                text: '1M'
            }, {
                type: 'month',
                count: 3,
                text: '3M'
            }, {
                type: 'month',
                count: 6,
                text: '6M'
            }, {
                type: 'year',
                count: 1,
                text: '1Y'
            }, {
                type: 'all',
                text: 'All'
            }],
            buttonTheme: {
                fill: theme.buttonFill,
                stroke: theme.buttonStroke,
                style: {
                    color: theme.buttonText
                },
                states: {
                    hover: {
                        fill: isDarkMode ? '#3d3d5c' : '#e0e0e0'
                    },
                    select: {
                        fill: '#f97316',
                        style: {
                            color: 'white'
                        }
                    }
                }
            },
            inputEnabled: false,
            labelStyle: {
                color: theme.subtext
            }
        }
    };

    return (
        <div className={`${theme.containerBg} rounded-xl p-4`}>
            <HighchartsReact
                highcharts={Highcharts}
                constructorType={'stockChart'}
                options={chartOptions}
                ref={chartRef}
            />
            
            {/* 메타데이터 표시 */}
            {data.metadata && (
                <div className={`mt-4 text-center text-sm ${theme.metaText}`}>
                    <span>
                        {locale === 'ko' ? '데이터 범위: ' : 'Data Range: '}
                        {data.metadata.date_range}
                    </span>
                    <span className="mx-4">|</span>
                    <span>
                        {locale === 'ko' ? '데이터 포인트: ' : 'Data Points: '}
                        {data.metadata.total_count?.toLocaleString()}
                    </span>
                </div>
            )}
        </div>
    );
};

export default HODLWavesChart;
