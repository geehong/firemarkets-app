'use client'

import React, { useState } from 'react'
import { PieChart, Table, Plus, Code } from 'lucide-react'

interface ShortcodeInsertionBlockProps {
    onInsert: (shortcode: string) => void
}

export default function ShortcodeInsertionBlock({ onInsert }: ShortcodeInsertionBlockProps) {
    const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart')

    // Chart State
    const [chartType, setChartType] = useState('bar')
    const [chartLabels, setChartLabels] = useState('Jan,Feb,Mar,Apr,May')
    const [chartData, setChartData] = useState('10,25,15,30,20')
    const [chartTitle, setChartTitle] = useState('Monthly Sales')

    // Custom Chart/Table State
    const [ticker, setTicker] = useState('BTCUSDT')
    const [interval, setInterval] = useState('1d')

    // Table State
    const [tableType, setTableType] = useState('simple') // simple | history
    const [tableRows, setTableRows] = useState(3)
    const [tableCols, setTableCols] = useState(3)
    const [tableContent, setTableContent] = useState('Header1,Header2,Header3\nData1,Data2,Data3\nData4,Data5,Data6')

    const generateChartShortcode = () => {
        // Custom Charts
        if (['close_price', 'ohlcv_custom'].includes(chartType)) {
            let code = `[chart type="${chartType}" ticker="${ticker}" interval="${interval}" title="${chartTitle}"`
            if (startDate) code += ` startDate="${startDate}"`
            if (endDate) code += ` endDate="${endDate}"`
            code += `]`
            return code
        }

        // Simple Charts
        return `[chart type="${chartType}" title="${chartTitle}" labels="${chartLabels}" data="${chartData}"]`
    }
// ...
    // Custom Chart/Table State
    const [ticker, setTicker] = useState('BTCUSDT')
    const [interval, setInterval] = useState('1d')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
// ...
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">제목 (선택)</label>
                                    <input
                                        type="text"
                                        value={chartTitle}
                                        onChange={(e) => setChartTitle(e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-md"
                                        placeholder="Chart Title"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">시작일 (선택)</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full text-sm border-gray-300 rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">종료일 (선택)</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full text-sm border-gray-300 rounded-md"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">제목</label>
                                    <input
                                        type="text"
                                        value={chartTitle}
                                        onChange={(e) => setChartTitle(e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-md"
                                        placeholder="Chart Title"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">라벨 (쉼표 구분)</label>
                                    <input
                                        type="text"
                                        value={chartLabels}
                                        onChange={(e) => setChartLabels(e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-md"
                                        placeholder="Jan,Feb,Mar..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">데이터 (쉼표 구분)</label>
                                    <input
                                        type="text"
                                        value={chartData}
                                        onChange={(e) => setChartData(e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-md"
                                        placeholder="10,20,30..."
                                    />
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">테이블 타입</label>
                            <select
                                value={tableType}
                                onChange={(e) => setTableType(e.target.value)}
                                className="w-full text-sm border-gray-300 rounded-md"
                            >
                                <option value="simple">Simple Table</option>
                                <option value="history">Price History Table</option>
                            </select>
                        </div>

                        {tableType === 'history' ? (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Ticker (Symbol)</label>
                                    <input
                                        type="text"
                                        value={ticker}
                                        onChange={(e) => setTicker(e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-md"
                                        placeholder="BTCUSDT"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Initial Interval</label>
                                    <select
                                        value={interval}
                                        onChange={(e) => setInterval(e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-md"
                                    >
                                        <option value="1d">1 Day</option>
                                        <option value="1w">1 Week</option>
                                        <option value="1m">1 Month</option>
                                    </select>
                                </div>
                            </>
                        ) : (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">데이터 (CSV 형식)</label>
                                <textarea
                                    value={tableContent}
                                    onChange={(e) => setTableContent(e.target.value)}
                                    className="w-full text-sm border-gray-300 rounded-md h-32 font-mono"
                                    placeholder="Header1,Header2&#10;Val1,Val2&#10;Val3,Val4"
                                />
                                <p className="text-xs text-gray-500 mt-1">쉼표(,)로 열 구분, 엔터로 행 구분</p>
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={handleInsert}
                    className="w-full flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    본문에 삽입
                </button>
            </div>
        </div>
    )
}
