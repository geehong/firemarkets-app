
'use client'

import React, { useState, useMemo } from 'react'
import { ColDef } from 'ag-grid-community'
import { ApexOptions } from 'apexcharts'
import dynamic from 'next/dynamic'
import ComponentCard from '@/components/common/ComponentCard'
import AgGridBaseTable from '@/components/tables/AgGridBaseTable'

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import('react-apexcharts'), {
    ssr: false,
})

interface FinancialsTabProps {
    incomeData: { [date: string]: { [field: string]: number } } | null
    balanceData: { [date: string]: { [field: string]: number } } | null
    cashFlowData: { [date: string]: { [field: string]: number } } | null
    ratiosData: { [date: string]: { [field: string]: number } } | null
}

type TabType = 'income' | 'balance' | 'cashFlow' | 'ratios'

const FinancialsTab: React.FC<FinancialsTabProps> = ({
    incomeData,
    balanceData,
    cashFlowData,
    ratiosData
}) => {
    // 사용 가능한 탭 목록 - 데이터가 null이 아니고 비어있지 않은 경우만 표시
    const availableTabs = useMemo(() => {
        const tabs: { key: TabType; label: string; data: any }[] = []

        if (incomeData && Object.keys(incomeData).length > 0) {
            tabs.push({ key: 'income', label: 'Income Statement', data: incomeData })
        }
        if (balanceData && Object.keys(balanceData).length > 0) {
            tabs.push({ key: 'balance', label: 'Balance Sheet', data: balanceData })
        }
        if (cashFlowData && Object.keys(cashFlowData).length > 0) {
            tabs.push({ key: 'cashFlow', label: 'Cash Flow', data: cashFlowData })
        }
        if (ratiosData && Object.keys(ratiosData).length > 0) {
            tabs.push({ key: 'ratios', label: 'Financial Ratios', data: ratiosData })
        }

        return tabs
    }, [incomeData, balanceData, cashFlowData, ratiosData])

    // 첫 번째 사용 가능한 탭을 초기값으로 설정
    const [activeTab, setActiveTab] = useState<TabType>(() => {
        if (incomeData && Object.keys(incomeData).length > 0) return 'income'
        if (balanceData && Object.keys(balanceData).length > 0) return 'balance'
        if (cashFlowData && Object.keys(cashFlowData).length > 0) return 'cashFlow'
        if (ratiosData && Object.keys(ratiosData).length > 0) return 'ratios'
        return 'income'
    })

    // activeTab이 사용 불가능한 탭이면 첫 번째 사용 가능한 탭으로 변경
    React.useEffect(() => {
        if (availableTabs.length > 0 && !availableTabs.find(t => t.key === activeTab)) {
            setActiveTab(availableTabs[0].key)
        }
    }, [availableTabs, activeTab])

    // 현재 활성 탭의 데이터 가져오기
    const currentData = useMemo(() => {
        switch (activeTab) {
            case 'income':
                return incomeData
            case 'balance':
                return balanceData
            case 'cashFlow':
                return cashFlowData
            case 'ratios':
                return ratiosData
            default:
                return null
        }
    }, [activeTab, incomeData, balanceData, cashFlowData, ratiosData])

    // AgGrid 컬럼 및 행 데이터 준비
    const { columns, rows } = useMemo(() => {
        if (!currentData || Object.keys(currentData).length === 0) {
            return { columns: [], rows: [] }
        }

        // 날짜들을 정렬 (최신순)
        const dates = Object.keys(currentData).sort((a, b) => b.localeCompare(a))

        // 모든 필드 수집
        const allFields = new Set<string>()
        dates.forEach(date => {
            Object.keys(currentData[date]).forEach(field => {
                allFields.add(field)
            })
        })

        // 필드들을 알파벳 순으로 정렬
        const sortedFields = Array.from(allFields).sort()

        // 컬럼 정의 생성
        const cols: ColDef[] = [
            {
                field: 'field',
                headerName: 'Field',
                pinned: 'left',
                width: 250,
                resizable: true,
                sortable: true,
                filter: true,
                cellStyle: { fontWeight: '500' }
            },
            ...dates.map(date => ({
                field: date,
                headerName: date,
                width: 130,
                minWidth: 120,
                resizable: true,
                sortable: true,
                filter: true,
                suppressSizeToFit: true,
                type: 'numericColumn',
                valueFormatter: (params: any) => {
                    if (params.value === null || params.value === undefined) return '-'
                    if (typeof params.value === 'number') {
                        return params.value.toLocaleString('en-US', {
                            maximumFractionDigits: 2,
                            minimumFractionDigits: 0
                        })
                    }
                    return params.value
                },
                cellStyle: { textAlign: 'right' }
            } as ColDef))
        ]

        // 행 데이터 생성
        const rowData = sortedFields.map(field => {
            const row: { field: string;[key: string]: string | number | null } = { field }
            dates.forEach(date => {
                row[date] = currentData[date][field] ?? null
            })
            return row
        })

        return { columns: cols, rows: rowData }
    }, [currentData])

    // 차트 데이터 준비 - 각 섹션별 주요 필드 선택
    const chartData = useMemo(() => {
        if (!currentData || Object.keys(currentData).length === 0) {
            return { categories: [], series: [] }
        }

        // 날짜들을 정렬 (오래된 순 - 차트는 시간순이므로)
        const dates = Object.keys(currentData).sort((a, b) => a.localeCompare(b))

        // 모든 필드 수집
        const allFields = new Set<string>()
        dates.forEach(date => {
            Object.keys(currentData[date] || {}).forEach(field => {
                allFields.add(field)
            })
        })

        // 섹션별 주요 필드 선정 (대소문자 무시 매칭)
        const keyFieldsBySection: { [key: string]: string[] } = {
            income: ['Revenue', 'Net Income', 'EBITDA', 'Operating Income', 'Gross Profit', 'EBIT', 'Total Revenue'],
            balance: ['Total Assets', 'Total Liabilities', 'Shareholders Equity', 'Total Current Assets', 'Total Current Liabilities', 'Cash And Cash Equivalents'],
            cashFlow: ['Operating Cash Flow', 'Free Cash Flow', 'Capital Expenditure', 'Cash And Cash Equivalents', 'Net Cash Flow'],
            ratios: ['ROE', 'ROA', 'Current Ratio', 'Quick Ratio', 'Debt To Equity Ratio', 'Return On Equity', 'Return On Assets']
        }

        const keyFields = keyFieldsBySection[activeTab] || []

        // 필드명을 대소문자 무시하여 매칭
        const findMatchingField = (targetField: string, availableFields: string[]): string | null => {
            const lowerTarget = targetField.toLowerCase()
            // 정확히 일치하는 것 먼저 찾기
            const exactMatch = availableFields.find(f => f === targetField)
            if (exactMatch) return exactMatch

            // 대소문자 무시 매칭
            const caseInsensitiveMatch = availableFields.find(f => f.toLowerCase() === lowerTarget)
            if (caseInsensitiveMatch) return caseInsensitiveMatch

            // 부분 매칭 (예: "ROE" -> "Return On Equity")
            const partialMatch = availableFields.find(f =>
                f.toLowerCase().includes(lowerTarget) || lowerTarget.includes(f.toLowerCase())
            )
            return partialMatch || null
        }

        // 실제 존재하는 주요 필드만 선택 (최대 5개)
        const availableKeyFields: string[] = []
        for (const keyField of keyFields) {
            const matched = findMatchingField(keyField, Array.from(allFields))
            if (matched && !availableKeyFields.includes(matched)) {
                availableKeyFields.push(matched)
                if (availableKeyFields.length >= 5) break
            }
        }

        // 주요 필드가 없으면 상위 5개 필드 사용
        const fieldsToChart = availableKeyFields.length > 0
            ? availableKeyFields
            : Array.from(allFields).slice(0, 5)

        // 시리즈 데이터 생성
        const series = fieldsToChart.map(field => {
            const data = dates.map(date => {
                const value = currentData[date]?.[field]
                return value !== null && value !== undefined ? value : null
            })
            return {
                name: field,
                data: data
            }
        })

        return {
            categories: dates,
            series: series
        }
    }, [currentData, activeTab])

    // ApexCharts 옵션
    const chartOptions: ApexOptions = useMemo(() => ({
        chart: {
            fontFamily: 'Outfit, sans-serif',
            height: 350,
            type: 'line',
            toolbar: {
                show: false,
            },
            zoom: {
                enabled: false,
            },
        },
        colors: ['#465FFF', '#9CB9FF', '#FF6B6B', '#4ECDC4', '#FFE66D'],
        stroke: {
            curve: 'straight',
            width: 2,
        },
        fill: {
            type: 'gradient',
            gradient: {
                opacityFrom: 0.55,
                opacityTo: 0,
            },
        },
        markers: {
            size: 0,
            hover: {
                size: 6,
            },
        },
        grid: {
            xaxis: {
                lines: {
                    show: false,
                },
            },
            yaxis: {
                lines: {
                    show: true,
                },
            },
        },
        dataLabels: {
            enabled: false,
        },
        tooltip: {
            enabled: true,
            theme: 'light', // or dark, can be dynamic
            y: {
                formatter: (val: number) => {
                    if (val === null || val === undefined) return '-'
                    return val.toLocaleString('en-US', {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 0
                    })
                },
            },
        },
        xaxis: {
            type: 'category',
            categories: chartData.categories,
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
            labels: {
                rotate: -45,
                rotateAlways: false,
                style: {
                    fontSize: '11px',
                },
            },
        },
        yaxis: {
            labels: {
                style: {
                    fontSize: '12px',
                    colors: ['#6B7280'],
                },
                formatter: (val: number) => {
                    if (val === null || val === undefined) return ''
                    if (Math.abs(val) >= 1e9) return `${(val / 1e9).toFixed(1)}B`
                    if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(1)}M`
                    if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(1)}K`
                    return val.toFixed(0)
                },
            },
        },
        legend: {
            show: true,
            position: 'top',
            horizontalAlign: 'left',
            fontSize: '12px',
        },
    }), [chartData.categories])

    if (availableTabs.length === 0) {
        return (
            <ComponentCard title="Financial Data (Macrotrends)">
                <div className="text-center py-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No financial data available</p>
                </div>
            </ComponentCard>
        )
    }

    return (
        <ComponentCard title="Financial Data (Macrotrends)">
            {/* 탭 헤더 */}
            <div className="mb-6">
                <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
                    {availableTabs.map((tab: { key: TabType; label: string; data: any }) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === tab.key
                                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 차트 */}
            {chartData.series.length > 0 && chartData.categories.length > 0 && (
                <div className="mb-6">
                    <div className="max-w-full overflow-x-auto custom-scrollbar">
                        <div id={`chart-${activeTab}`} className="min-w-[600px]">
                            <ReactApexChart
                                options={chartOptions}
                                series={chartData.series}
                                type="area"
                                height={350}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* AgGrid 테이블 */}
            {rows.length > 0 ? (
                <AgGridBaseTable
                    rows={rows}
                    columns={columns}
                    height={600}
                    gridOptions={{
                        suppressRowClickSelection: true,
                        animateRows: true, // This property is deprecated in later versions but still common
                        suppressHorizontalScroll: false,
                    }}
                />
            ) : (
                <div className="text-center py-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No data available for this section</p>
                </div>
            )}
        </ComponentCard>
    )
}

export default FinancialsTab
