import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CNav,
  CNavItem,
  CNavLink,
} from '@coreui/react'
import CardTools from '../common/CardTools'
import '../common/CardTools.css'
import HistoryTableAgGrid from './HistoryTableAgGrid'

/**
 * 대시보드용 OHLCV 테이블 컴포넌트 (AG Grid 기반)
 * @param {Object} props
 * @param {Array} props.tabs - 탭 정보 배열
 * @param {number} props.defaultActiveTab - 기본 활성 탭 인덱스
 * @param {string} props.title - 테이블 제목
 * @param {string} props.dateRange - 날짜 범위 ('1y', '6m', '3m', '1m')
 * @param {Function} props.onTabChange - 탭 변경 콜백
 * @param {Function} props.onDataLoad - 데이터 로드 콜백
 * @param {Function} props.onError - 에러 콜백
 * @param {Array} props.customColumns - 추가 커스텀 컬럼
 * @param {boolean} props.showChangePercent - 변화율 컬럼 표시 여부
 * @param {boolean} props.showVolume - 거래량 컬럼 표시 여부
 * @param {Function} props.onRemove - 제거 콜백
 * @param {Function} props.onRefresh - 새로고침 콜백
 * @param {Function} props.onSettings - 설정 콜백
 */
const DashboardTable = ({
  tabs = [
    { asset_id: 1, symbol: 'BTCUSDT', name: 'Bitcoin' },
    { asset_id: 3, symbol: 'GCUSD', name: 'Gold' },
    { asset_id: 4, symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
    { asset_id: 5, symbol: 'MSFT', name: 'Microsoft Corp.' },
  ],
  defaultActiveTab = 0,
  title = 'Asset Data Table',
  dateRange = '1y', // '1y', '6m', '3m', '1m', or custom object with start/end
  onTabChange,
  onDataLoad,
  onError,
  customColumns = [],
  showChangePercent = true,
  showVolume = true,
  onRemove,
  onRefresh,
  onSettings,
}) => {
  const [activeTickerSymbol, setActiveTickerSymbol] = useState(
    tabs[defaultActiveTab]?.symbol || tabs[0]?.symbol,
  )
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Get date range based on parameter
  const getDateRange = () => {
    if (typeof dateRange === 'object' && dateRange.start && dateRange.end) {
      return { start: dateRange.start, end: dateRange.end }
    }

    const today = new Date()
    let startDate = new Date()

    switch (dateRange) {
      case '1y':
        startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
        break
      case '6m':
        startDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
        break
      case '3m':
        startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
        break
      case '1m':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
        break
      default:
        startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    }
  }

  // React Query를 사용하여 데이터 로드
  const { data: tickerOhlcvData = [], isLoading: loadingTableData, error: tableError } = useQuery({
    queryKey: ['dashboard-table-data', activeTickerSymbol, dateRange],
    queryFn: async () => {
      if (!activeTickerSymbol) return []
      
      const { start, end } = getDateRange()
      const fetchResponse = await fetch(
        `/api/v1/ohlcv/${activeTickerSymbol}?data_interval=1d&start_date=${start}&end_date=${end}`,
      )
      if (!fetchResponse.ok) {
        throw new Error(`Failed to fetch data for asset symbol ${activeTickerSymbol}`)
      }
      const jsonResponse = await fetchResponse.json()
      const data = Array.isArray(jsonResponse) ? jsonResponse : jsonResponse.data || []

      // Calculate change_percent and process data for AG Grid
      const processedData = data
        .sort((a, b) => new Date(a.timestamp_utc) - new Date(b.timestamp_utc))
        .map((item, index, arr) => {
          let changePercent = null
          if (index > 0) {
            const prevClose = parseFloat(arr[index - 1].close_price)
            const currentClose = parseFloat(item.close_price)
            if (prevClose !== 0) {
              changePercent = ((currentClose - prevClose) / prevClose) * 100
            }
          }
          return {
            Date: item.timestamp_utc,
            Price: parseFloat(item.close_price) || 0,
            Change_Percent: changePercent,
            Open: parseFloat(item.open_price) || 0,
            High: parseFloat(item.high_price) || 0,
            Low: parseFloat(item.low_price) || 0,
            Volume: parseFloat(item.volume) || 0,
          }
        })
        .sort((a, b) => new Date(b.Date) - new Date(a.Date)) // 최신 날짜순 정렬

      if (onDataLoad) {
        onDataLoad(processedData)
      }
      
      return processedData
    },
    enabled: !!activeTickerSymbol,
    staleTime: 5 * 60 * 1000, // 5분
    cacheTime: 10 * 60 * 1000, // 10분
    refetchOnWindowFocus: false,
    onError: (error) => {
      if (onError) {
        onError(error.message)
      }
    },
  })

  const handleTabClick = (symbol) => {
    setActiveTickerSymbol(symbol)
    if (onTabChange) {
      onTabChange(symbol)
    }
  }

  const handleCollapse = (collapsed) => {
    setIsCollapsed(collapsed)
  }

  const handleRemove = () => {
    if (onRemove) {
      onRemove()
    }
  }

  const handleAction = (action) => {
    switch (action) {
      case 'refresh':
        if (onRefresh) {
          onRefresh()
        }
        break
      case 'settings':
        if (onSettings) {
          onSettings()
        }
        break
      case 'export':
        console.log('Exporting table data')
        break
      case 'fullscreen':
        console.log('Opening table in fullscreen')
        break
      default:
        console.log('Action:', action)
    }
  }

  // 기본 컬럼 정의
  const baseColumns = [
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
      valueFormatter: params => {
        if (params.value === undefined || params.value === null) return "";
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(params.value);
      },
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
    }
  ];

  // 조건부 컬럼 추가
  const conditionalColumns = [];

  if (showChangePercent) {
    conditionalColumns.push({
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
    });
  }

  // OHLC 컬럼들 추가
  const ohlcColumns = [
    { 
      field: "Open", 
      headerName: "Open", 
      minWidth: 120,
      valueFormatter: params => {
        if (params.value === undefined || params.value === null) return "";
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(params.value);
      },
      cellStyle: {
        fontSize: '.875rem',
        fontWeight: '400'
      }
    },
    { 
      field: "High", 
      headerName: "High", 
      minWidth: 120,
      valueFormatter: params => {
        if (params.value === undefined || params.value === null) return "";
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(params.value);
      },
      cellStyle: {
        fontSize: '.875rem',
        fontWeight: '400'
      }
    },
    { 
      field: "Low", 
      headerName: "Low", 
      minWidth: 120,
      valueFormatter: params => {
        if (params.value === undefined || params.value === null) return "";
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(params.value);
      },
      cellStyle: {
        fontSize: '.875rem',
        fontWeight: '400'
      }
    }
  ];

  if (showVolume) {
    conditionalColumns.push({
      field: "Volume",
      headerName: "Volume",
      minWidth: 120,
      valueFormatter: params => {
        if (params.value === undefined || params.value === null) return "";
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          notation: 'compact',
          maximumFractionDigits: 2
        }).format(params.value);
      },
      cellStyle: {
        fontSize: '.875rem',
        fontWeight: '400'
      }
    });
  }

  // 최종 컬럼 정의 - 순서: Date, Price, Change %, Open, High, Low, Volume
  const columnDefs = useMemo(() => {
    return [...baseColumns, ...conditionalColumns, ...ohlcColumns, ...customColumns];
  }, [customColumns, showVolume, showChangePercent]);

  return (
    <CCard className={`mb-4 ${isCollapsed ? 'collapsed' : ''}`}>
      <CCardHeader>
        <div className="card-title">
          <CNav variant="tabs" role="tablist">
            {tabs.map((tab) => (
              <CNavItem key={tab.asset_id}>
                <CNavLink
                  href="#"
                  active={activeTickerSymbol === tab.symbol}
                  onClick={(e) => {
                    e.preventDefault()
                    handleTabClick(tab.symbol)
                  }}
                >
                  {tab.symbol}
                </CNavLink>
              </CNavItem>
            ))}
          </CNav>
        </div>
        <CardTools
          onCollapse={handleCollapse}
          onRemove={handleRemove}
          onAction={handleAction}
          dropdownItems={[
            { label: 'Export CSV', action: 'export' },
            { label: 'Full Screen', action: 'fullscreen' },
            { label: 'Column Settings', action: 'columns' },
          ]}
        />
      </CCardHeader>
      <CCardBody>
        <HistoryTableAgGrid 
          data={tickerOhlcvData}
          columnDefs={columnDefs}
          loading={loadingTableData}
          error={tableError}
          loadingMessage={`${activeTickerSymbol} 데이터를 불러오는 중...`}
          errorMessage={`${activeTickerSymbol} 데이터 로드에 실패했습니다`}
          height={400}
          dataType="ohlcv"
        />
      </CCardBody>
    </CCard>
  )
}

export default DashboardTable
