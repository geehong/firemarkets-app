'use client'

import React, { useEffect, useRef, useState } from 'react'
import ChartControls from '@/components/common/ChartControls'

interface PairTradingSpreadChartProps {
    data: { date: string; spread: number; z_score: number }[]
    tickerA: string
    tickerB: string
    height?: number
}

const PairTradingSpreadChart: React.FC<PairTradingSpreadChartProps> = ({
    data,
    tickerA,
    tickerB,
    height = 500
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<any>(null)
    const [isClient, setIsClient] = useState(false)
    const [Highcharts, setHighcharts] = useState<any>(null)
    
    // Chart Controls
    const [chartType, setChartType] = useState<'line' | 'spline' | 'area' | 'areaspline'>('line')
    const [colorMode, setColorMode] = useState<'dark' | 'vivid' | 'high-contrast' | 'simple'>('vivid')

    // Load Highcharts
    useEffect(() => {
        const loadHighcharts = async () => {
            if (typeof window === 'undefined') return
            try {
                // @ts-ignore
                const HighchartsCoreModule = await import('highcharts/highstock')
                const HighchartsCore = HighchartsCoreModule.default

                // Load modules
                const modules = [
                    // @ts-ignore
                    () => import('highcharts/modules/exporting'),
                    // @ts-ignore
                    () => import('highcharts/modules/accessibility'),
                    // @ts-ignore
                    () => import('highcharts/modules/annotations'),
                ]

                await Promise.all(
                    modules.map(async loader => {
                        const mod = await loader()
                        if (typeof mod.default === 'function') {
                            (mod.default as any)(HighchartsCore)
                        }
                    })
                )
                setHighcharts(HighchartsCore)
                setIsClient(true)
            } catch (error) {
                console.error('Failed to load Highcharts:', error)
            }
        }
        loadHighcharts()
    }, [])

    // Prepare Series Data
    const zScoreData = data.map(d => [new Date(d.date).getTime(), d.z_score]).sort((a, b) => a[0] - b[0])
    
    // Effect to render/update chart
    useEffect(() => {
        if (!isClient || !Highcharts || !chartContainerRef.current || zScoreData.length === 0) return

        if (chartRef.current) {
            chartRef.current.destroy()
            chartRef.current = null
        }

        const options: any = {
            chart: { height, backgroundColor: '#ffffff' },
            title: { text: `Z-Score Analysis: ${tickerA} / ${tickerB}`, style: { color: '#333' } },
            subtitle: { text: 'Signal: > 2.0 (Sell A/Buy B) | < -2.0 (Buy A/Sell B)', style: { color: '#666' } },
            yAxis: {
                title: { text: 'Z-Score (Standard Deviations)' },
                plotLines: [
                    { value: 0, width: 2, color: '#333', dashStyle: 'Dot' },
                    { value: 2, width: 2, color: '#ef4444', dashStyle: 'Dash', label: { text: 'Overvalued (+2.0)', style: { color: '#ef4444' } } },
                    { value: -2, width: 2, color: '#22c55e', dashStyle: 'Dash', label: { text: 'Undervalued (-2.0)', style: { color: '#22c55e' } } }
                ],
                // Visual Bands for signaling zones
                plotBands: [
                    { from: 2, to: 10, color: 'rgba(239, 68, 68, 0.1)', label: { text: 'Sell Zone', style: { color: '#ef4444' } } },
                    { from: -10, to: -2, color: 'rgba(34, 197, 94, 0.1)', label: { text: 'Buy Zone', style: { color: '#22c55e' } } }
                ]
            },
            xAxis: { type: 'datetime' },
            tooltip: {
                shared: true,
                valueDecimals: 2
            },
            series: [{
                name: 'Z-Score',
                type: chartType,
                data: zScoreData,
                color: '#3b82f6',
                // Color zones based on value
                zones: [
                    { value: -2, color: '#22c55e' }, // Below -2 (Green/Buy)
                    { value: 2, color: '#3b82f6' },  // Normal Range (Blue)
                    { color: '#ef4444' }             // Above 2 (Red/Sell)
                ]
            }],
            rangeSelector: {
                selected: 3, // Default to All (20y)
                buttons: [
                { type: 'year', count: 2, text: '2y' },
                { type: 'year', count: 5, text: '5y' },
                { type: 'year', count: 10, text: '10y' },
                { type: 'all', text: 'All' }
                ]
            }
        }

        chartRef.current = Highcharts.stockChart(chartContainerRef.current, options)

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy()
                chartRef.current = null
            }
        }
    }, [isClient, Highcharts, data, tickerA, tickerB, chartType]) // chartType triggers re-render

    if (!isClient) return <div className="h-full flex items-center justify-center">Loading Library...</div>

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            {/* Simple Controls */}
            <div className="flex justify-end mb-2">
                 <ChartControls 
                    chartType={chartType}
                    onChartTypeChange={setChartType}
                    useLogScale={false}
                    onLogScaleToggle={() => {}}
                    colorMode={colorMode}
                    onColorModeChange={setColorMode}
                    // Hide irrelevant controls
                    isAreaMode={chartType === 'area'}
                    onAreaModeToggle={() => setChartType(chartType === 'area' ? 'line' : 'area')}
                    showFlags={false}
                    showFlagsButton={false}
                 />
            </div>
            
            <div id="zscore-container" ref={chartContainerRef} style={{ height: `${height}px` }} />
            
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
                <h4 className="font-bold mb-2">📉 통계적 차익거래 (Stat Arb) 실전 가이드</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li><span className="font-semibold">Z-Score {'>'} 2.0</span>: 스프레드 과대 평가 → <span className="text-red-600 font-bold">{tickerA} 매도</span> / {tickerB} 매수 (평균 회귀 기대)</li>
                    <li><span className="font-semibold">Z-Score {'<'} -2.0</span>: 스프레드 과소 평가 → <span className="text-green-600 font-bold">{tickerA} 매수</span> / {tickerB} 매도 (평균 회귀 기대)</li>
                    <li className="text-gray-500">두 자산의 상관성이 깨지면(구조적 변화) 전략을 중단해야 합니다.</li>
                </ul>
            </div>
        </div>
    )
}

export default PairTradingSpreadChart
