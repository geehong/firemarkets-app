import React, { useState, useMemo, useEffect, useCallback } from 'react'
import axios from 'axios'
import { CCard, CCardBody, CCardHeader, CNav, CNavItem, CNavLink } from '@coreui/react'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-theme-alpine.css' // AG Grid 테마 (alpine 테마 사용)
// AG Grid 모듈 등록
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-theme-alpine.css' // AG Grid 테마 (alpine 테마 사용)

// Helper function to format date as YY/MM/DD (re-using from MainTable.js)
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    // MainChart.js와 유사한 형식으로 변경 (예: 7/23/2024)
    return date.toLocaleDateString()
  } catch (e) {
    console.error('Error formatting date:', dateString, e)
    return 'Invalid Date'
  }
}

ModuleRegistry.registerModules([AllCommunityModule])

const AssetsTables = ({ assetId }) => {
  const [tableData, setTableData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeInterval, setActiveInterval] = useState('1d')

  // 데이터 간격 옵션
  const intervalOptions = [
    { value: '1d', label: 'Daily' },
    { value: '1W', label: 'Weekly' },
    { value: '1M', label: 'Monthly' },
  ]

  const fetchDataForTable = useCallback(async () => {
    if (!assetId) return
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`/api/ohlcv/${assetId}?data_interval=${activeInterval}`)
      // API 응답 데이터를 최신 날짜 순으로 정렬 (테이블 표시 순서)
      // AG Grid의 정렬 기능과 별개로 초기 데이터 순서를 맞춤
      // API가 과거 데이터 -> 최신 데이터 순으로 준다고 가정하고 change_percent 계산
      const processedData = response.data.data
        .sort((a, b) => new Date(a.timestamp_utc) - new Date(b.timestamp_utc)) // 시간 오름차순으로 정렬
        .map((item, index, arr) => {
          let changePercent = null
          if (index > 0) {
            const prevClose = parseFloat(arr[index - 1].close_price)
            const currentClose = parseFloat(item.close_price)
            if (prevClose !== 0) changePercent = ((currentClose - prevClose) / prevClose) * 100
          }
          return { ...item, change_percent: changePercent }
        })
        .sort((a, b) => new Date(b.timestamp_utc) - new Date(a.timestamp_utc)) // 다시 최신 날짜 순으로 정렬
      setTableData(processedData)
    } catch (err) {
      setError('Failed to load table data.')
      console.error('Error fetching table data:', err)
      setTableData([])
    } finally {
      setLoading(false)
    }
  }, [assetId, activeInterval])

  useEffect(() => {
    fetchDataForTable()
  }, [fetchDataForTable])

  const handleIntervalChange = (interval) => {
    setActiveInterval(interval)
  }

  // AG Grid 동적 크기 조정 함수
  const onGridSizeChanged = useCallback((params) => {
    // get the current grids width
    const gridWidth = document.querySelector('.ag-body-viewport').clientWidth
    // keep track of which columns to hide/show
    const columnsToShow = []
    const columnsToHide = []
    // iterate over all columns (visible or not) and work out
    // now many columns can fit (based on their minWidth)
    let totalColsWidth = 0
    const allColumns = params.api.getColumns()
    if (allColumns && allColumns.length > 0) {
      for (let i = 0; i < allColumns.length; i++) {
        const column = allColumns[i]
        totalColsWidth += column.getMinWidth()
        if (totalColsWidth > gridWidth) {
          columnsToHide.push(column.getColId())
        } else {
          columnsToShow.push(column.getColId())
        } // Removed window.setTimeout and sizeColumnsToFit()
      }
    }
    // show/hide columns based on current grid width
    params.api.setColumnsVisible(columnsToShow, true)
    params.api.setColumnsVisible(columnsToHide, false)
  }, [])

  // AG Grid 컬럼 정의 - 순서: Date, Price(Close), Change(%), Open, High, Low, Volume
  const columnDefs = useMemo(
    () => [
      {
        headerName: 'Date',
        field: 'timestamp_utc',
        valueFormatter: (params) => new Date(params.value).toLocaleDateString(), // MainChart.js와 유사한 형식
        sortable: true,
        filter: true,
        width: 120,
        minWidth: 100,
        type: 'centerAligned', // 중앙 정렬
      },
      {
        headerName: 'Price (Close)',
        field: 'close_price',
        valueFormatter: (params) =>
          parseFloat(params.value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        cellClass: 'ag-grid-bold-cell', // 굵게 표시
        type: 'centerAligned', // 중앙 정렬
        sortable: true,
        width: 130,
        minWidth: 120,
      },
      {
        headerName: 'Change (%)',
        field: 'change_percent',
        valueFormatter: (params) => (params.value !== null ? `${params.value.toFixed(2)}%` : 'N/A'),
        cellClassRules: {
          'ag-grid-bold-cell': 'true', // 굵게 표시
          'ag-grid-positive-change': 'x > 0', // 양수일 때 초록색
        },
        type: 'centerAligned', // 중앙 정렬
        sortable: true,
        width: 120,
        minWidth: 110,
      },
      {
        headerName: 'Open',
        field: 'open_price',
        valueFormatter: (params) =>
          parseFloat(params.value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        type: 'rightAligned', // 우측 정렬
        sortable: true,
        width: 110,
        minWidth: 100,
      },
      {
        headerName: 'High',
        field: 'high_price',
        valueFormatter: (params) =>
          parseFloat(params.value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        type: 'rightAligned', // 우측 정렬
        sortable: true,
        width: 110,
        minWidth: 100,
      },
      {
        headerName: 'Low',
        field: 'low_price',
        valueFormatter: (params) =>
          parseFloat(params.value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        type: 'rightAligned', // 우측 정렬
        sortable: true,
        width: 110,
        minWidth: 100,
      },
      {
        headerName: 'Volume',
        field: 'volume',
        valueFormatter: (params) =>
          parseFloat(params.value).toLocaleString('en-US', {
            maximumFractionDigits: 0,
          }),
        type: 'rightAligned', // 우측 정렬
        sortable: true,
        width: 120,
        minWidth: 110,
      },
    ],
    [],
  )

  if (loading) {
    return (
      <CCard className="mb-4">
        <CCardHeader>Recent Price Data</CCardHeader>
        <CCardBody>
          <p>Loading data...</p>
        </CCardBody>
      </CCard>
    )
  }

  if (error || tableData.length === 0) {
    return (
      <CCard className="mb-4">
        <CCardHeader>Recent Price Data</CCardHeader>
        <CCardBody>
          <p>{error || 'No price data available.'}</p>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <CNav variant="tabs" role="tablist">
          {intervalOptions.map((option) => (
            <CNavItem key={option.value}>
              <CNavLink // eslint-disable-next-line jsx-a11y/anchor-is-valid
                href="#"
                active={activeInterval === option.value}
                onClick={(e) => {
                  e.preventDefault()
                  handleIntervalChange(option.value)
                }}
              >
                {option.label}
              </CNavLink>
            </CNavItem>
          ))}
        </CNav>
      </CCardHeader>
      <CCardBody>
        <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
          <AgGridReact
            rowData={tableData}
            columnDefs={columnDefs}
            rowSelection="single"
            onGridSizeChanged={onGridSizeChanged}
            suppressHorizontalScroll={true}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[5, 10, 25, 50, 100, 250, 500]}
          />
        </div>
      </CCardBody>
    </CCard>
  )
}

export default AssetsTables
