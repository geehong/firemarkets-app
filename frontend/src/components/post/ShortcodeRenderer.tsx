'use client'

import React from 'react'
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import { ShortcodeMatch } from '@/utils/shortcodeParser'
import dynamic from 'next/dynamic'

const ClosePriceChart = dynamic(() => import('../charts/ohlcvcharts/ClosePriceChart'), { ssr: false })
const OHLCVCustomGUIChart = dynamic(() => import('../charts/ohlcvcharts/OHLCVCustomGUIChart'), { ssr: false })
const HistoryTable = dynamic(() => import('../tables/HistoryTable'), { ssr: false })

interface ShortcodeRendererProps {
    shortcode: ShortcodeMatch
}

export default function ShortcodeRenderer({ shortcode }: ShortcodeRendererProps) {
    if (shortcode.type === 'chart') {
        return <ChartRenderer props={shortcode.props} />
    } else if (shortcode.type === 'table') {
        return <TableRenderer props={shortcode.props} />
    }
    return null
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

const ChartRenderer = ({ props }: { props: Record<string, string> }) => {
    const { type, title, labels, data, ticker, interval } = props

    // Handle Specialized Charts
    if (type === 'close_price') {
        return (
            <div className="my-8">
                <ClosePriceChart
                    assetId={ticker}
                    interval={interval}
                    title={title}
                    height={500}
                />
            </div>
        )
    }

    if (type === 'ohlcv_custom') {
        return (
            <div className="my-8">
                <OHLCVCustomGUIChart
                    assetIdentifier={ticker}
                    dataInterval={interval}
                    seriesName={title}
                    height={600}
                />
            </div>
        )
    }

    // Parse data
    const labelArray = labels ? labels.split(',').map(s => s.trim()) : []
    const dataArray = data ? data.split(',').map(s => parseFloat(s.trim())) : []

    // Combine for Recharts
    const chartData = labelArray.map((label, index) => ({
        name: label,
        value: dataArray[index] || 0
    }))

    const renderChart = () => {
        switch (type) {
            case 'bar':
                return (
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#8884d8" name={title || 'Value'} />
                    </BarChart>
                )
            case 'line':
                return (
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" name={title || 'Value'} />
                    </LineChart>
                )
            case 'pie':
            case 'doughnut':
                return (
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={type === 'doughnut' ? 60 : 0}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            label
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                )
            default:
                return <div>Unsupported chart type: {type}</div>
        }
    }

    return (
        <div className="my-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            {title && <h4 className="text-center font-bold mb-4">{title}</h4>}
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>
        </div>
    )
}

const TableRenderer = ({ props }: { props: Record<string, string> }) => {
    const { type, data, ticker, interval } = props

    if (type === 'history') {
        return (
            <div className="my-8">
                {/* @ts-ignore */}
                <HistoryTable
                    assetIdentifier={ticker}
                    initialInterval={interval as any}
                    height={600}
                />
            </div>
        )
    }

    if (!data) return null;

    // Parse CSV-like data: rows separated by ';', cols by ','
    // Example: Header1,Header2;Val1,Val2
    const rows = data.split(';').map(row => row.split(',').map(cell => cell.trim()))
    const header = rows[0]
    const body = rows.slice(1)

    return (
        <div className="my-8 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50">
                    <tr>
                        {header.map((cell, idx) => (
                            <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {cell}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {body.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                            {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
