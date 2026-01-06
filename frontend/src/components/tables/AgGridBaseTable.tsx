
"use client"

import React, { useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeQuartz, ColDef, GridOptions } from 'ag-grid-community'

ModuleRegistry.registerModules([AllCommunityModule])

export interface AgGridBaseTableProps<T = any> {
    rows: T[]
    columns: ColDef<T>[]
    height?: number
    gridOptions?: GridOptions<T>
    loading?: boolean
    error?: string | null
}

export default function AgGridBaseTable<T = any>({
    rows,
    columns,
    height = 600,
    gridOptions,
    loading,
    error,
}: AgGridBaseTableProps<T>) {
    const gridTheme = useMemo(() => {
        return themeQuartz.withParams({
            rowHoverColor: 'rgba(0,0,0,0.04)',
            selectedRowBackgroundColor: 'rgba(0, 123, 255, 0.08)'
        })
    }, [])

    const containerStyle = useMemo<React.CSSProperties>(() => {
        const isAuto = gridOptions && (gridOptions as any).domLayout === 'autoHeight'
        return {
            width: '100%',
            height: isAuto ? 'auto' : `${height}px`,
        }
    }, [gridOptions, height])

    if (loading) return <div className="p-4 text-center text-gray-500">Loading...</div>
    if (error) return <div className="p-4 text-red-600 text-center">{error}</div>

    return (
        <div style={containerStyle} className="ag-theme-quartz dark:ag-theme-quartz-dark">
            {/* Note: dark mode theme might need specific configuration or CSS */}
            <AgGridReact
                rowData={rows}
                columnDefs={columns}
                theme={gridTheme}
                pagination
                paginationPageSize={10}
                paginationPageSizeSelector={[10, 25, 50, 100, 200]}
                defaultColDef={{ resizable: true, sortable: true, filter: true }}
                gridOptions={gridOptions}
            />
        </div>
    )
}
