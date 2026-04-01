"use client"

import React, { useEffect, useState, useRef } from 'react';

interface SolidGaugeProps {
    value: number | null;
    title?: string;
    description?: string;
    min?: number;
    max?: number;
    unit?: string;
    height?: number | string;
    stops?: Array<[number, string]>;
}

const SolidGauge: React.FC<SolidGaugeProps> = ({
    value,
    title = 'Solid Gauge',
    description,
    min = 0,
    max = 100,
    unit = '',
    height = 200,
    stops
}) => {
    const [HighchartsReact, setHighchartsReact] = useState<any>(null);
    const [Highcharts, setHighcharts] = useState<any>(null);
    const [isClient, setIsClient] = useState(false);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        const loadHighcharts = async () => {
            try {
                const [HC_React, HC_Core] = await Promise.all([
                    import('highcharts-react-official'),
                    import('highcharts')
                ]);

                const HighchartsReactComponent = HC_React.default || HC_React;
                const HC = HC_Core.default || HC_Core;

                if (!HC) return;

                // 1. Load and Init HighchartsMore (contains 'gauge') FIRST
                const HighchartsMore = (await import('highcharts/highcharts-more')).default;
                if (typeof HighchartsMore === 'function') {
                    (HighchartsMore as any)(HC);
                }

                // 2. ONLY NOW import and init SolidGauge (depends on 'gauge')
                const HighchartsSolidGauge = (await import('highcharts/modules/solid-gauge')).default;
                if (typeof HighchartsSolidGauge === 'function') {
                    (HighchartsSolidGauge as any)(HC);
                }

                setHighchartsReact(() => HighchartsReactComponent);
                setHighcharts(HC);
                setIsClient(true);
            } catch (error) {
                console.error('Failed to load Highcharts SolidGauge:', error);
            }
        };

        loadHighcharts();
    }, []);

    const defaultStops = stops || [
        [0.1, '#55BF3B'], // green
        [0.5, '#DDDF0D'], // yellow
        [0.9, '#DF5353']  // red
    ];

    const options = isClient && Highcharts ? {
        chart: {
            type: 'solidgauge',
            backgroundColor: 'transparent',
            margin: [0, 0, 0, 0],
            spacing: [0, 0, 0, 0],
            height: height
        },
        title: {
            text: null
        },
        pane: {
            startAngle: -90,
            endAngle: 90,
            background: {
                backgroundColor: 'rgba(0,0,0,0.03)',
                innerRadius: '75%',
                outerRadius: '100%',
                shape: 'arc',
                borderWidth: 0
            },
            center: ['50%', '80%'],
            size: '120%'
        },
        yAxis: {
            min: min,
            max: max,
            stops: defaultStops,
            lineWidth: 0,
            minorTickInterval: null,
            tickAmount: 2,
            title: {
                y: -60
            },
            labels: {
                y: 16,
                style: {
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#9ca3af' // gray-400
                }
            }
        },
        plotOptions: {
            solidgauge: {
                dataLabels: {
                    enabled: false
                },
                rounded: true
            }
        },
        series: [{
            name: title,
            data: [value],
            tooltip: {
                valueSuffix: ` ${unit}`
            }
        }],
        credits: { enabled: false },
        exporting: { enabled: false }
    } : null;

    if (!isClient || !HighchartsReact) return <div style={{ height }} className="flex items-center justify-center">Loading...</div>;

    return (
        <div className="w-full flex flex-col items-center relative" style={{ height }}>
            <div className="w-full" style={{ height }}>
                <HighchartsReact
                    highcharts={Highcharts}
                    options={options}
                    ref={chartRef}
                />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 group-hover:scale-105 transition-transform duration-300 z-10">
                <span className="text-[20px] font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-1">
                    {value !== null && value !== undefined ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '---'}{unit}
                </span>
                <span className="text-[12px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
                    {title}
                </span>
                {description && (
                    <p className="text-xs text-gray-500 mt-1">{description}</p>
                )}
            </div>
        </div>
    );
};

export default SolidGauge;
