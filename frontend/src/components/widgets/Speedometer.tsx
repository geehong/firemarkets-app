"use client"

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

interface SpeedometerProps {
    value: number | null;
    title?: string;
    description?: string;
    min?: number;
    max?: number;
    unit?: string;
    height?: number | string;
    plotBands?: Array<{
        from: number;
        to: number;
        color: string;
        thickness?: number | string;
        borderRadius?: string;
    }>;
}

const Speedometer: React.FC<SpeedometerProps> = ({
    value,
    title = 'Speedometer',
    description,
    min = 0,
    max = 100,
    unit = '',
    height = 300,
    plotBands
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

                // Load and initialize highcharts-more
                const HighchartsMore = (await import('highcharts/highcharts-more')).default;
                if (typeof HighchartsMore === 'function') {
                    (HighchartsMore as any)(HC);
                }

                setHighchartsReact(() => HighchartsReactComponent);
                setHighcharts(HC);
                setIsClient(true);
            } catch (error) {
                console.error('Failed to load Highcharts Speedometer:', error);
            }
        };

        loadHighcharts();
    }, []);

    const defaultPlotBands = plotBands || [
        {
            from: min,
            to: (max - min) * 0.6 + min,
            color: '#55BF3B', // green
            thickness: 20,
            borderRadius: '50%'
        },
        {
            from: (max - min) * 0.6 + min,
            to: (max - min) * 0.8 + min,
            color: '#DDDF0D', // yellow
            thickness: 20,
            borderRadius: '50%'
        },
        {
            from: (max - min) * 0.8 + min,
            to: max,
            color: '#DF5353', // red
            thickness: 20,
            borderRadius: '50%'
        }
    ];

    const options = isClient && Highcharts ? {
        chart: {
            type: 'gauge',
            plotBackgroundColor: null,
            backgroundColor: 'transparent',
            margin: [0, 0, 0, 0],
            spacing: [0, 0, 0, 0],
            height: height
        },
        title: {
            text: null // Disable internal title
        },
        pane: {
            startAngle: -90,
            endAngle: 89.9,
            background: null,
            center: ['50%', '80%'],
            size: '120%'
        },
        yAxis: {
            min: min,
            max: max,
            tickPixelInterval: 72,
            tickPosition: 'inside',
            tickColor: 'var(--background, #FFFFFF)',
            tickLength: 10,
            tickWidth: 1,
            minorTickInterval: null,
            labels: {
                distance: 12,
                style: {
                    fontSize: '9px',
                    fontWeight: '700',
                    color: '#9ca3af'
                }
            },
            lineWidth: 0,
            plotBands: defaultPlotBands
        },
        series: [{
            name: title,
            data: [value],
            tooltip: {
                valueSuffix: ` ${unit}`
            },
            dataLabels: {
                enabled: false // Disable default data labels
            },
            dial: {
                radius: '80%',
                backgroundColor: 'gray',
                baseWidth: 12,
                baseLength: '0%',
                rearLength: '0%'
            },
            pivot: {
                backgroundColor: 'gray',
                radius: 6
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

export default Speedometer;
