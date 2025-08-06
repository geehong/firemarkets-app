import React, { useEffect, useRef, useState, useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeQuartz } from 'ag-grid-community'
// CSS import 제거 - 새로운 Theming API 사용
// import 'ag-grid-community/styles/ag-grid.css'
// import 'ag-grid-community/styles/ag-theme-alpine.css'

// AG Grid 모듈 등록
ModuleRegistry.registerModules([AllCommunityModule])

/**
 * 범용 AG Grid 테이블 컴포넌트
 * @param {Object} props
 * @param {Array} props.data - 표시할 데이터 배열
 * @param {Array} props.columnDefs - 컬럼 정의 (선택사항, 기본값 사용)
 * @param {Object} props.gridOptions - 그리드 옵션 (선택사항, 기본값 사용)
 * @param {boolean} props.loading - 로딩 상태
 * @param {Object} props.error - 에러 객체
 * @param {string} props.loadingMessage - 로딩 메시지
 * @param {string} props.errorMessage - 에러 메시지
 * @param {number} props.height - 테이블 높이 (기본값: 600px)
 * @param {Object} props.style - 추가 스타일
 * @param {boolean} props.autoGenerateColumns - 데이터 기반 컬럼 자동 생성 (기본값: true)
 * @param {string} props.dataType - 데이터 타입 ('ohlcv', 'onchain', 'assets', 'custom')
 */
const HistoryTableAgGrid = ({
  data = [],
  columnDefs: customColumnDefs,
  gridOptions: customGridOptions,
  loading = false,
  error = null,
  loadingMessage = "Loading data...",
  errorMessage = "Failed to load data",
  height = 600,
  style = {},
  autoGenerateColumns = true,
  dataType = 'custom',
  ...props
}) => {
  const gridRef = useRef()
  const [gridApi, setGridApi] = useState(null)

  // 디버깅 로그
  console.log('🔍 HistoryTableAgGrid Debug:', {
    dataLength: data?.length,
    columnDefsLength: customColumnDefs?.length,
    loading,
    error: error?.message,
    dataType,
    dataSample: data?.slice(0, 2)
  })

  // onGridSizeChanged 함수 추가 (temp_debug.js에서 가져옴)
  const onGridSizeChanged = (params) => {
    const gridWidth = document.querySelector(".ag-body-viewport")?.clientWidth || 800;
    const columnsToShow = [];
    const columnsToHide = [];
    let totalColsWidth = 0;

    const allColumns = params.api.getColumns();
    if (allColumns && allColumns.length > 0) {
      for (let i = 0; i < allColumns.length; i++) {
        const column = allColumns[i];
        totalColsWidth += column.getMinWidth();
        if (totalColsWidth > gridWidth) {
          columnsToHide.push(column.getColId());
        } else {
          columnsToShow.push(column.getColId());
        }
      }
    }

    params.api.setColumnsVisible(columnsToShow, true);
    params.api.setColumnsVisible(columnsToHide, false);

    setTimeout(() => {
      params.api.sizeColumnsToFit();
    }, 10);
  }

  // 데이터 타입별 컬럼 정의 템플릿
  const columnTemplates = {
    // OHLCV 데이터용 컬럼 정의
    ohlcv: [
      { 
        field: "Date", 
        headerName: "Date", 
        minWidth: 120,
        sort: 'desc',
        valueFormatter: params => {
          if (!params.value) return "";
          const date = new Date(params.value);
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return `${year}.${month}.${day}`;
        },
        cellStyle: {
          fontSize: '.875rem',
          fontWeight: '400'
        }
      },
      {
        field: "Price",
        headerName: "Price",
        minWidth: 120,
        valueFormatter: params => formatCurrency(params.value),
        cellStyle: params => {
          // Change_Percent 값을 가져와서 색상 결정
          const rowData = params.data;
          if (rowData && rowData.Change_Percent !== undefined && rowData.Change_Percent !== null) {
            const changePercent = parseFloat(rowData.Change_Percent);
            return {
              fontSize: '.875rem',
              fontWeight: '700',
              color: changePercent >= 0 ? "#007c32" : "#d91400"
            };
          }
          // Change_Percent가 없으면 기본 상승색
          return {
            fontSize: '.875rem',
            fontWeight: '700',
            color: '#007c32'
          };
        }
      },
      {
        field: "Change_Percent",
        headerName: "Change",
        minWidth: 120,
        valueFormatter: params => {
          if (params.value === undefined || params.value === null) return "";
          const value = parseFloat(params.value);
          return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
        },
        cellStyle: params => {
          if (params.value === undefined || params.value === null) return {
            fontSize: '.875rem',
            fontWeight: '400'
          };
          const value = parseFloat(params.value);
          return { 
            fontSize: '.875rem',
            fontWeight: '700',
            color: value >= 0 ? "#007c32" : "#d91400" 
          };
        }
      },
      { 
        field: "Open", 
        headerName: "Open", 
        minWidth: 120,
        valueFormatter: params => formatCurrency(params.value),
        cellStyle: {
          fontSize: '.875rem',
          fontWeight: '400'
        }
      },
      { 
        field: "High", 
        headerName: "High", 
        minWidth: 120,
        valueFormatter: params => formatCurrency(params.value),
        cellStyle: {
          fontSize: '.875rem',
          fontWeight: '400'
        }
      },
      { 
        field: "Low", 
        headerName: "Low", 
        minWidth: 120,
        valueFormatter: params => formatCurrency(params.value),
        cellStyle: {
          fontSize: '.875rem',
          fontWeight: '400'
        }
      },
      {
        field: "Volume",
        headerName: "Volume",
        minWidth: 120,
        valueFormatter: params => formatCompactCurrency(params.value),
        cellStyle: {
          fontSize: '.875rem',
          fontWeight: '400'
        }
      }
    ],

    // 온체인 데이터용 컬럼 정의
    onchain: [
      { 
        field: "Date", 
        headerName: "Date", 
        minWidth: 120,
        sort: 'desc'
      },
      {
        field: "Value",
        headerName: "Value",
        minWidth: 120,
        valueFormatter: params => {
          if (params.value === undefined || params.value === null) return "";
          return parseFloat(params.value).toFixed(4);
        }
      },
      {
        field: "Metric_Name",
        headerName: "Metric",
        minWidth: 150
      },
      {
        field: "Category",
        headerName: "Category",
        minWidth: 120
      }
    ],

    // 자산 목록용 컬럼 정의
    assets: [
      { 
        field: "symbol", 
        headerName: "Symbol", 
        minWidth: 100
      },
      {
        field: "name",
        headerName: "Name",
        minWidth: 200
      },
      {
        field: "type_name",
        headerName: "Type",
        minWidth: 100
      },
      {
        field: "market_cap",
        headerName: "Market Cap",
        minWidth: 120,
        valueFormatter: params => formatCompactCurrency(params.value)
      },
      {
        field: "price",
        headerName: "Price",
        minWidth: 120,
        valueFormatter: params => formatCurrency(params.value)
      },
      {
        field: "daily_change_percent",
        headerName: "Change",
        minWidth: 120,
        valueFormatter: params => {
          if (params.value === undefined || params.value === null) return "";
          const value = parseFloat(params.value);
          return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
        },
        cellStyle: params => {
          if (params.value === undefined || params.value === null) return null;
          const value = parseFloat(params.value);
          return { color: value >= 0 ? "#007c32" : "#d91400" };
        }
      }
    ]
  };

  // 데이터 기반 컬럼 자동 생성
  const generateColumnsFromData = (data) => {
    if (!data || data.length === 0) return [];

    const sampleRow = data[0];
    const columns = [];

    Object.keys(sampleRow).forEach(key => {
      const value = sampleRow[key];
      const columnDef = {
        field: key,
        headerName: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        minWidth: 120,
        sortable: true,
        filter: true
      };

      // 데이터 타입에 따른 포맷터 적용
      if (typeof value === 'number') {
        if (key.toLowerCase().includes('price') || key.toLowerCase().includes('close') || key.toLowerCase().includes('open') || key.toLowerCase().includes('high') || key.toLowerCase().includes('low')) {
          columnDef.valueFormatter = params => formatCurrency(params.value);
        } else if (key.toLowerCase().includes('volume') || key.toLowerCase().includes('market_cap') || key.toLowerCase().includes('supply')) {
          columnDef.valueFormatter = params => formatCompactCurrency(params.value);
        } else if (key.toLowerCase().includes('percent') || key.toLowerCase().includes('change')) {
          columnDef.valueFormatter = params => {
            if (params.value === undefined || params.value === null) return "";
            const val = parseFloat(params.value);
            return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
          };
          columnDef.cellStyle = params => {
            if (params.value === undefined || params.value === null) return null;
            const val = parseFloat(params.value);
            return { color: val >= 0 ? "#007c32" : "#d91400" };
          };
        } else {
          columnDef.valueFormatter = params => {
            if (params.value === undefined || params.value === null) return "";
            return parseFloat(params.value).toFixed(2);
          };
        }
      } else if (typeof value === 'string' && key.toLowerCase().includes('date')) {
        columnDef.valueFormatter = params => {
          if (!params.value) return "";
          const date = new Date(params.value);
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          return `${year}.${month}.${day}`;
        };
        columnDef.sort = 'desc';
      }

      columns.push(columnDef);
    });

    return columns;
  };

  // 기본 그리드 옵션
  const defaultGridOptions = {
    pagination: true,
    paginationPageSize: 25,
    paginationPageSizeSelector: [10, 25, 50, 100, 200, 500, 1000],
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
      flex: 1,
    },
    domLayout: 'autoHeight', // 전체 높이 사용
    rowHeight: 35,
    headerHeight: 40,
    onGridSizeChanged: onGridSizeChanged, // 반응형 컬럼 숨김 기능 추가
    onGridReady: (params) => {
      setGridApi(params.api)
      params.api.sizeColumnsToFit()
    },
    onFirstDataRendered: (params) => {
      params.api.sizeColumnsToFit()
    }
  }

  // 컬럼 정의 결정 (커스텀, 템플릿, 또는 자동 생성)
  const columnDefs = useMemo(() => {
    if (customColumnDefs) {
      return customColumnDefs;
    }
    
    if (dataType && columnTemplates[dataType]) {
      return columnTemplates[dataType];
    }
    
    if (autoGenerateColumns) {
      return generateColumnsFromData(data);
    }
    
    return [];
  }, [customColumnDefs, dataType, autoGenerateColumns, data]);

  // 그리드 옵션 결정 (커스텀 또는 기본값)
  const gridOptions = useMemo(() => {
    return {
      ...defaultGridOptions,
      ...customGridOptions
    };
  }, [customGridOptions]);

  // 유틸리티 함수 - 통화 형식 변환
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return "";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  // 유틸리티 함수 - 간단한 통화 형식 변환
  const formatCompactCurrency = (value) => {
    if (value === undefined || value === null) return "";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(value);
  }

  // 로딩 상태 표시
  if (loading) {
    console.log('🔍 HistoryTableAgGrid: Showing loading state');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: `${height}px`,
        fontSize: '16px',
        color: '#666',
        ...style
      }}>
        <div>{loadingMessage}</div>
      </div>
    );
  }

  // 에러 상태 표시
  if (error) {
    console.log('🔍 HistoryTableAgGrid: Showing error state:', error.message);
    return (
      <div style={{ 
        padding: '20px',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        color: '#721c24',
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}>
        <div>
          <strong>Error:</strong> {error.message || errorMessage}
        </div>
      </div>
    );
  }

  console.log('🔍 HistoryTableAgGrid: Rendering grid with data length:', data?.length);

  return (
    <div style={{ 
      width: '100%', 
      minHeight: `${height}px`,
      ...style
    }}>
      <AgGridReact
        ref={gridRef}
        columnDefs={columnDefs}
        rowData={data}
        gridOptions={gridOptions}
        theme={themeQuartz} // 새로운 Theming API 사용
        pagination={true}
        paginationPageSize={25}
        paginationPageSizeSelector={[10, 25, 50, 100, 200, 500, 1000]}
        {...props}
      />
    </div>
  )
}

export default HistoryTableAgGrid

