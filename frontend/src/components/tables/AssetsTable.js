import React, { useMemo } from 'react'
import { useGlobalTickerData } from '../../hooks/useGlobalTickerData'
import HistoryTableAgGrid from './HistoryTableAgGrid'

/**
 * 자산 목록 전용 테이블 컴포넌트
 * @param {Object} props
 * @param {boolean} props.includeOHLCV - OHLCV 데이터가 있는 자산만 포함
 * @param {boolean} props.excludeOHLCV - OHLCV 데이터가 없는 자산만 포함
 * @param {boolean} props.showSettings - 설정 컬럼 표시 여부
 * @param {boolean} props.showMarketCap - 시가총액 컬럼 표시 여부
 * @param {Array} props.customColumns - 추가 커스텀 컬럼
 * @param {Object} props.style - 추가 스타일
 * @param {number} props.height - 테이블 높이
 */
const AssetsTable = ({
  includeOHLCV = false,
  excludeOHLCV = false,
  showSettings = false,
  showMarketCap = true,
  customColumns = [],
  style = {},
  height = 600,
  ...props
}) => {
  // 자산 데이터 로드
  const { 
    tickers, 
    tickersLoading: loading, 
    tickersError: error 
  } = useGlobalTickerData({ 
    includeOHLCV, 
    excludeOHLCV 
  })

  // 기본 컬럼 정의
  const baseColumns = [
    { 
      field: "name", 
      headerName: "이름", 
      minWidth: 200,
      sortable: true,
      filter: true
    },
    {
      field: "type_name",
      headerName: "종류",
      minWidth: 100,
      sortable: true,
      filter: true,
      cellStyle: params => {
        const type = params.value?.toLowerCase();
        if (type === 'stocks') return { color: '#007c32' };
        if (type === 'crypto') return { color: '#f7931a' };
        if (type === 'etfs') return { color: '#1f77b4' };
        return {};
      }
    },
    {
      field: "symbol",
      headerName: "티커",
      minWidth: 100,
      sortable: true,
      filter: true,
      cellStyle: { fontWeight: 'bold' }
    }
  ];

  // 조건부 컬럼 추가
  const conditionalColumns = [];

  if (showMarketCap) {
    conditionalColumns.push({
      field: "market_cap",
      headerName: "시가총액",
      minWidth: 120,
      valueFormatter: params => {
        if (params.value === undefined || params.value === null) return "";
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          notation: 'compact',
          maximumFractionDigits: 2
        }).format(params.value);
      }
    });
  }

  if (showSettings) {
    conditionalColumns.push({
      field: "settings",
      headerName: "설정",
      minWidth: 300,
      sortable: false,
      filter: false,
      valueFormatter: params => {
        if (!params.value) return "";
        try {
          const settings = typeof params.value === 'string' 
            ? JSON.parse(params.value) 
            : params.value;
          
          const settingsList = [];
          if (settings.data_source) settingsList.push(`소스: ${settings.data_source}`);
          if (settings.collect_price) settingsList.push("가격 수집");
          if (settings.collect_onchain) settingsList.push("온체인 수집");
          if (settings.collect_estimates) settingsList.push("예측 수집");
          if (settings.collect_financials) settingsList.push("재무 수집");
          if (settings.collect_assets_info) settingsList.push("자산정보 수집");
          if (settings.collect_technical_indicators) settingsList.push("기술지표 수집");
          
          return settingsList.join(", ");
        } catch (e) {
          return "설정 파싱 오류";
        }
      },
      cellStyle: {
        fontSize: '12px',
        color: '#666'
      }
    });
  }

  // 최종 컬럼 정의
  const columnDefs = useMemo(() => {
    return [...baseColumns, ...conditionalColumns, ...customColumns];
  }, [customColumns, showSettings, showMarketCap]);

  // 데이터 전처리
  const processedData = useMemo(() => {
    if (!tickers || tickers.length === 0) return [];

    return tickers.map(ticker => ({
      ...ticker,
      // settings가 문자열인 경우 파싱
      settings: typeof ticker.settings === 'string' 
        ? JSON.parse(ticker.settings) 
        : ticker.settings
    }));
  }, [tickers]);

  return (
    <HistoryTableAgGrid 
      data={processedData}
      columnDefs={columnDefs}
      loading={loading}
      error={error}
      loadingMessage="자산 데이터를 불러오는 중..."
      errorMessage="자산 데이터 로드에 실패했습니다"
      height={height}
      style={style}
      {...props}
    />
  )
}

export default AssetsTable 