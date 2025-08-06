import React, { useEffect, useRef, useState, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import { CSpinner, CAlert } from '@coreui/react'

// AG Grid 모듈 등록
ModuleRegistry.registerModules([AllCommunityModule])

/**
 * 스케줄러 로그 테이블 컴포넌트
 * @param {Object} props
 * @param {Array} props.logs - 로그 데이터 배열
 * @param {boolean} props.loading - 로딩 상태
 * @param {Object} props.error - 에러 객체
 * @param {number} props.height - 테이블 높이 (기본값: 600px)
 */
const LogsTable = ({
  logs = [],
  loading = false,
  error = null,
  height = 600,
  ...props
}) => {
  const gridRef = useRef()
  const [gridApi, setGridApi] = useState(null)

  // Job 이름 매핑
  const jobNameMapping = {
    'worldassetscollector_collection': 'World Assets Ranking',
    'ohlcvcollector_collection': 'OHLCV Data',
    'stockcollector_collection': 'Stock Data',
    'etfcollector_collection': 'ETF Data',
    'onchaincollector_collection': 'OnChain Data',
    'cryptocollector_collection': 'Crypto Data',
    'technicalindicators_collection': 'Technical Indicators',
    'companyinfo_collection': 'Company Info',
    'scheduler_start': 'Scheduler Start',
    'scheduler_stop': 'Scheduler Stop',
    'scheduler_pause': 'Scheduler Pause',
    'scheduler_trigger': 'Scheduler Trigger'
  }

  // 컬럼 정의
  const columnDefs = useMemo(() => [
    {
      field: 'log_id',
      headerName: 'ID',
      width: 80,
      sort: 'desc',
      cellStyle: {
        fontSize: '.875rem',
        fontWeight: '500'
      }
    },
    {
      field: 'job_name',
      headerName: 'JOB',
      width: 200,
      valueFormatter: params => {
        const jobName = params.value
        return jobNameMapping[jobName] || jobName
      },
      cellStyle: {
        fontSize: '.875rem',
        fontWeight: '500'
      }
    },
    {
      field: 'assets_processed',
      headerName: 'Process',
      width: 100,
      valueFormatter: params => {
        const value = params.value || 0
        return value.toLocaleString()
      },
      cellStyle: {
        fontSize: '.875rem',
        textAlign: 'center'
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      cellRenderer: params => {
        const status = params.value
        let color = ''
        let glowEffect = ''
        
        if (status === 'completed') {
          color = '#00ff00'
          glowEffect = '0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00'
        } else if (status === 'failed') {
          color = '#ff0000'
          glowEffect = '0 0 10px #ff0000, 0 0 20px #ff0000, 0 0 30px #ff0000'
        } else if (status === 'running') {
          color = '#ffff00'
          glowEffect = '0 0 10px #ffff00, 0 0 20px #ffff00, 0 0 30px #ffff00'
        }
        
        return React.createElement('span', {
          style: {
            color: color,
            textShadow: glowEffect,
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }
        }, status)
      },
      cellStyle: {
        fontSize: '.875rem',
        fontWeight: 'bold',
        textAlign: 'center'
      }
    },
    {
      field: 'start_time',
      headerName: 'Date',
      width: 150,
      valueFormatter: params => {
        if (!params.value) return ""
        const date = new Date(params.value)
        const year = date.getFullYear().toString().slice(-2)
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        const seconds = date.getSeconds().toString().padStart(2, '0')
        return `${year}-${month}-${day}-${hours}:${minutes}:${seconds}`
      },
      cellStyle: {
        fontSize: '.875rem',
        fontWeight: '400'
      }
    },
    {
      field: 'duration_seconds',
      headerName: 'Duration',
      width: 100,
      valueFormatter: params => {
        const seconds = params.value || 0
        if (seconds < 60) {
          return `${seconds}s`
        } else if (seconds < 3600) {
          const minutes = Math.floor(seconds / 60)
          const remainingSeconds = seconds % 60
          return `${minutes}m ${remainingSeconds}s`
        } else {
          const hours = Math.floor(seconds / 3600)
          const minutes = Math.floor((seconds % 3600) / 60)
          return `${hours}h ${minutes}m`
        }
      },
      cellStyle: {
        fontSize: '.875rem',
        textAlign: 'center'
      }
    },
    {
      field: 'data_points_added',
      headerName: 'Data Points',
      width: 120,
      valueFormatter: params => {
        const value = params.value || 0
        return value.toLocaleString()
      },
      cellStyle: {
        fontSize: '.875rem',
        textAlign: 'center'
      }
    },
    {
      field: 'error_message',
      headerName: 'Error',
      width: 200,
      valueFormatter: params => {
        return params.value || ''
      },
      cellStyle: {
        fontSize: '.875rem',
        color: '#ff0000'
      }
    }
  ], [])

  // 그리드 옵션
  const gridOptions = useMemo(() => ({
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100
    },
    pagination: true,
    paginationPageSize: 50,
    rowSelection: {
      mode: 'singleRow'
    },
    animateRows: true,
    onGridReady: (params) => {
      setGridApi(params.api)
    }
  }), [])

  // 로딩 상태
  if (loading) {
    return (
      <div className="text-center p-5" style={{ height }}>
        <CSpinner size="sm" />
        <div className="mt-2">로그 데이터를 불러오는 중...</div>
      </div>
    )
  }

  // 에러 상태
  if (error) {
    return (
      <div className="p-3" style={{ height }}>
        <CAlert color="danger">
          <div>로그 데이터를 불러오는데 실패했습니다.</div>
          <div className="small">{error.message}</div>
        </CAlert>
      </div>
    )
  }

  return (
    <div 
      className="ag-theme-quartz"
      style={{ 
        height: `${height}px`, 
        width: '100%',
        '--ag-header-height': '40px',
        '--ag-row-height': '40px'
      }}
    >
      <AgGridReact
        ref={gridRef}
        columnDefs={columnDefs}
        rowData={logs}
        gridOptions={gridOptions}
        {...props}
      />
    </div>
  )
}

export default LogsTable 