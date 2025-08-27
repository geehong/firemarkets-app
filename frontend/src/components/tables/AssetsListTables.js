import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { realtimeAPI } from '../../services/api'
import { 
  ModuleRegistry, 
  AllCommunityModule, 
  ClientSideRowModelModule,
  themeQuartz 
} from 'ag-grid-community'

// AG Grid 모듈 등록 (Community 버전만 사용)
ModuleRegistry.registerModules([
  AllCommunityModule,
  ClientSideRowModelModule,
])

// 유틸리티 함수들
const numberFormatter = ({ value }) => {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "decimal",
    maximumFractionDigits: 2,
  });
  return value == null ? "" : formatter.format(value);
};

// 검색어 정리 함수 (URI malformed 에러 방지)
const sanitizeSearchTerm = (searchTerm) => {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return null;
  }
  
  // 공백 제거
  const trimmed = searchTerm.trim();
  if (!trimmed) {
    return null;
  }
  
  // 특수문자나 인코딩 문제가 될 수 있는 문자들을 필터링
  // URL에서 문제가 될 수 있는 문자들을 제거하거나 인코딩
  const sanitized = trimmed.replace(/[^\w\s\-\.]/g, '');
  
  return sanitized || null;
};

const currencyFormatter = ({ value }) => {
  if (value == null) return "";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
};

const percentageFormatter = ({ value }) => {
  if (value == null) return "";
  const val = parseFloat(value);
  return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
};

const compactCurrencyFormatter = ({ value }) => {
  if (value == null) return "";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
};

// 커스텀 Sparkline Renderer 컴포넌트
const SparklineRenderer = ({ value }) => {
  if (!value || !Array.isArray(value) || value.length === 0) {
    return <span style={{ color: '#999', fontSize: '.875rem' }}>No data</span>;
  }
  
  const prices = value;
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const range = maxPrice - minPrice;
  
  if (range === 0) {
    return <span style={{ color: '#999', fontSize: '.875rem' }}>Flat</span>;
  }
  
  // SVG 포인트 생성 (viewBox 0 0 100 24에 맞춤)
  const points = prices.map((price, index) => {
    const x = (index / (prices.length - 1)) * 100;
    const y = 24 - ((price - minPrice) / range) * 24; // y값을 24 범위로 제한
    return `${x},${y}`;
  }).join(' ');
  
  // 영역 채우기용 포인트 (그라데이션 배경) - y값을 24로 제한
  const areaPoints = `${points} 100,24 0,24`;
  
  // 색상 결정 (첫 번째와 마지막 가격 비교)
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const change = lastPrice - firstPrice;
  const isPositive = change >= 0;
  const strokeColor = isPositive ? '#007c32' : '#d91400';
  const fillColor = isPositive ? 'rgba(0, 124, 50, 0.1)' : 'rgba(217, 20, 0, 0.1)';
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      height: '32px', // 테이블 행 높이에 맞춤
      maxHeight: '32px', // 최대 높이 제한
      overflow: 'hidden' // 넘치는 부분 숨김
    }}>
      <svg 
        width="100%" 
        height="24" // SVG 높이 제한
        viewBox="0 0 100 24" // viewBox도 높이에 맞춤
        style={{ display: 'block' }}
      >
        {/* 그라데이션 배경 영역 */}
        <polygon 
          points={areaPoints} 
          fill={fillColor}
        />
        {/* 라인 차트 */}
        <polyline 
          points={points} 
          fill="none" 
          stroke={strokeColor} 
          strokeWidth="1.5" // 선 두께 줄임
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

/**
 * Assets Table 컴포넌트 - 새로운 Assets Table API 사용
 * @param {Object} props
 * @param {string} props.typeName - 자산 유형 (예: 'Stocks', 'Crypto', 'ETFs')
 * @param {number} props.page - 페이지 번호 (기본값: 1)
 * @param {number} props.pageSize - 페이지당 항목 수 (기본값: 50)
 * @param {string} props.sortBy - 정렬 필드 (기본값: 'market_cap')
 * @param {string} props.order - 정렬 순서 (기본값: 'desc')
 * @param {string} props.search - 검색어
 * @param {boolean} props.loading - 로딩 상태
 * @param {Object} props.error - 에러 객체
 * @param {number} props.height - 테이블 높이 (기본값: 600px)
 * @param {Object} props.style - 추가 스타일
 */
const AssetsListTables = ({
  typeName = 'Stocks',
  page = 1,
  pageSize = 50,
  sortBy = 'market_cap',
  order = 'desc',
  search = null,
  loading = false,
  error = null,
  height = 600,
  style = {},
  ...props
}) => {
  const gridRef = useRef()
  const [gridApi, setGridApi] = useState(null)
  const [rowData, setRowData] = useState([])
  const [totalRows, setTotalRows] = useState(0)
  const [currentPage, setCurrentPage] = useState(page)
  const [currentPageSize, setCurrentPageSize] = useState(pageSize)

  // 디버깅 로그
  console.log('🔍 AssetsListTables Debug:', {
    typeName,
    page,
    pageSize,
    sortBy,
    order,
    search,
    loading,
    error: error?.message,
    rowDataLength: rowData?.length,
    totalRows
  })

  // 컬럼 정의 (Community 버전에 맞게 수정)
  const colDefs = useMemo(() => {
    return [
      {
        field: "rank",
        headerName: "Rank",
        minWidth: 80,
        maxWidth: 80,
        sortable: true,
        filter: false,
        cellStyle: {
          fontSize: '.875rem',
          fontWeight: '600',
          textAlign: 'center'
        }
      },
      {
        field: "ticker",
        headerName: "Ticker",
        minWidth: 100,
        maxWidth: 120,
        sortable: true,
        filter: true,
        cellStyle: {
          fontSize: '.875rem',
          fontWeight: '700',
          color: '#2563eb'
        }
      },
      {
        field: "name",
        headerName: "Name",
        minWidth: 200,
        sortable: true,
        filter: true,
        cellStyle: {
          fontSize: '.875rem',
          fontWeight: '500'
        }
      },
      {
        headerName: "Timeline (30D)",
        field: "sparkline_30d",
        sortable: false,
        filter: false,
        minWidth: 150,
        maxWidth: 200,
        cellRenderer: SparklineRenderer,
        valueFormatter: params => {
          if (!params.value || !Array.isArray(params.value)) {
            return 'No data';
          }
          return `${params.value.length} days`;
        },
        cellStyle: {
          padding: '2px 4px', // 패딩 줄임
          textAlign: 'center',
          height: '32px', // 행 높이 고정
          maxHeight: '32px', // 최대 높이 제한
          overflow: 'hidden' // 넘치는 부분 숨김
        }
      },
      {
        field: "price",
        headerName: "Price",
        minWidth: 120,
        sortable: true,
        filter: "agNumberColumnFilter",
        valueFormatter: currencyFormatter,
        cellStyle: {
          fontSize: '.875rem',
          fontWeight: '600'
        }
      },
      {
        field: "change_percent_today",
        headerName: "Change %",
        minWidth: 120,
        sortable: true,
        filter: "agNumberColumnFilter",
        valueFormatter: percentageFormatter,
        cellStyle: params => {
          if (params.value === undefined || params.value === null) return {
            fontSize: '.875rem',
            fontWeight: '600'
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
        field: "market_cap",
        headerName: "Market Cap",
        minWidth: 140,
        sortable: true,
        filter: "agNumberColumnFilter",
        valueFormatter: compactCurrencyFormatter,
        cellStyle: {
          fontSize: '.875rem',
          fontWeight: '500'
        }
      },
      {
        field: "volume_today",
        headerName: "Volume",
        minWidth: 140,
        sortable: true,
        filter: "agNumberColumnFilter",
        valueFormatter: compactCurrencyFormatter,
        cellStyle: {
          fontSize: '.875rem',
          fontWeight: '500'
        }
      },
      {
        field: "change_52w_percent",
        headerName: "52W Change %",
        minWidth: 140,
        sortable: true,
        filter: "agNumberColumnFilter",
        valueFormatter: percentageFormatter,
        cellStyle: params => {
          if (params.value === undefined || params.value === null) return {
            fontSize: '.875rem',
            fontWeight: '500'
          };
          const value = parseFloat(params.value);
          return {
            fontSize: '.875rem',
            fontWeight: '600',
            color: value >= 0 ? "#007c32" : "#d91400"
          };
        }
      },
      {
        field: "exchange",
        headerName: "Exchange",
        minWidth: 100,
        sortable: true,
        filter: true,
        cellStyle: {
          fontSize: '.875rem',
          fontWeight: '400',
          color: '#666'
        }
      },
      {
        field: "data_source",
        headerName: "Source",
        minWidth: 100,
        sortable: true,
        filter: true,
        cellStyle: {
          fontSize: '.875rem',
          fontWeight: '400',
          color: '#666'
        }
      }
    ];
  }, []);

  // 기본 컬럼 정의
  const defaultColDef = useMemo(() => ({
    flex: 1,
    filter: true,
    resizable: true,
  }), []);

  // 행 ID 생성 함수
  const getRowId = useCallback(({ data }) => data.ticker, []);

  // 그리드 준비 완료 핸들러
  const onGridReady = useCallback((params) => {
    setGridApi(params.api);
    params.api.sizeColumnsToFit();
  }, []);

  // 데이터 로드 함수 (새로운 API 사용)
  const loadData = useCallback(async () => {
    try {
      const params = {
        type_name: typeName,
        page: currentPage,
        page_size: currentPageSize,
        sort_by: sortBy,
        order: order
      };

      const sanitizedSearch = sanitizeSearchTerm(search);
      if (sanitizedSearch) {
        params.search = sanitizedSearch;
      }

      console.log('🔍 AssetsListTables: Calling API with params:', params);
      console.log('🔍 AssetsListTables: Original search parameter:', search);
      console.log('🔍 AssetsListTables: Sanitized search parameter:', sanitizedSearch);
      console.log('🔍 AssetsListTables: About to call realtimeAPI.getAssetsTable...');
      
      let result;
      try {
        result = await realtimeAPI.getAssetsTable(params);
        console.log('🔍 AssetsListTables: API response:', result);
      } catch (apiError) {
        console.error('🔍 AssetsListTables: API call failed:', apiError);
        if (apiError.message && apiError.message.includes('URI malformed')) {
          console.error('🔍 AssetsListTables: URI malformed error detected. This might be due to invalid characters in the search parameter.');
          console.error('🔍 AssetsListTables: Current search parameter:', search);
          console.error('🔍 AssetsListTables: Current params:', params);
        }
        throw apiError;
      }
      
      setRowData(result.data || []);
      setTotalRows(result.total || 0);
      
      console.log('🔍 AssetsListTables: Data loaded successfully:', {
        dataLength: result.data?.length,
        total: result.total,
        page: result.page,
        pages: result.pages
      });
    } catch (error) {
      console.error('🔍 AssetsListTables: Error loading data:', error);
      console.error('🔍 AssetsListTables: Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      setRowData([]);
      setTotalRows(0);
    }
  }, [typeName, currentPage, currentPageSize, sortBy, order, search]);

  // 데이터 로드 효과
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 로딩 상태 표시
  if (loading) {
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
        <div>Loading assets data...</div>
      </div>
    );
  }

  // 에러 상태 표시
  if (error) {
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
          <strong>Error:</strong> {error.message || 'Failed to load assets data'}
        </div>
      </div>
    );
  }

  console.log('🔍 AssetsListTables: Rendering grid with data length:', rowData?.length);

  return (
    <div style={{ 
      width: '100%', 
      height: `${height}px`,
      ...style
    }}>
      <AgGridReact
        ref={gridRef}
        getRowId={getRowId}
        rowData={rowData}
        columnDefs={colDefs}
        defaultColDef={defaultColDef}
        theme={themeQuartz}
        onGridReady={onGridReady}
        pagination={true}
        paginationPageSize={currentPageSize}
        paginationPageSizeSelector={[25, 50, 100, 200]}
        onPaginationChanged={(event) => {
          const currentPage = event.api.paginationGetCurrentPage() + 1;
          const pageSize = event.api.paginationGetPageSize();
          setCurrentPage(currentPage);
          setCurrentPageSize(pageSize);
        }}
        {...props}
      />
    </div>
  )
}

export default AssetsListTables

