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

  if (loading) return <div className="p-4">Loading...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>

  return (
    <div style={containerStyle}>
      <AgGridReact
        rowData={rows as any}
        columnDefs={columns as any}
        theme={gridTheme}
        pagination
        paginationPageSize={10}
        paginationPageSizeSelector={[10, 25, 50, 100, 200]}
        defaultColDef={{ resizable: true, sortable: true, filter: true, flex: 1 }}
        gridOptions={gridOptions as any}
      />
    </div>
  )
}


