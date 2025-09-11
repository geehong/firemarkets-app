import React, { useMemo, useState } from 'react'
import { useAssetData } from '../../hooks/useAssetData'
import HistoryTableAgGrid from './HistoryTableAgGrid'

/**
 * OHLCV 데이터 전용 테이블 컴포넌트
 * @param {Object} props
 * @param {number} props.assetId - 자산 ID
 * @param {string} props.interval - 데이터 간격 ('1d', '1W', '1M')
 * @param {boolean} props.showVolume - 거래량 컬럼 표시 여부
 * @param {boolean} props.showChangePercent - 변화율 컬럼 표시 여부
 * @param {Array} props.customColumns - 추가 커스텀 컬럼
 * @param {Object} props.style - 추가 스타일
 * @param {number} props.height - 테이블 높이
 */
const OHLCVTable = ({
  assetId,
  interval = '1d',
  showVolume = true,
  showChangePercent = true,
  customColumns = [],
  style = {},
  height = 600,
  ...props
}) => {
  const [selectedInterval, setSelectedInterval] = useState(interval)
  const [showAll, setShowAll] = useState(false)

  // OHLCV 데이터 로드 - selectedInterval과 showAll 상태에 따라 데이터 양 조절
  const { 
    asset, 
    ohlcvData, 
    loading, 
    error, 
    isSuccess 
  } = useAssetData(assetId, selectedInterval, showAll ? 10000 : 1000) // showAll이 true면 더 많은 데이터

  // (debug logs removed)

  // 기본 컬럼 정의
  const baseColumns = [
    { 
      field: "Date", 
      headerName: "날짜", 
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
      headerName: "가격",
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
      headerName: "변화율",
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
      headerName: "시가", 
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
      headerName: "고가", 
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
      headerName: "저가", 
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
      headerName: "거래량",
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

  // OHLCV 데이터를 AG Grid 형식으로 변환
  const processedData = useMemo(() => {
    if (!ohlcvData || ohlcvData.length === 0) return [];


    const processed = ohlcvData.map((item, index, arr) => {
      // Change_Percent 계산 (이전 날짜 대비)
      let changePercent = null;
      if (index > 0) {
        const prevClose = parseFloat(arr[index - 1].close_price);
        const currentClose = parseFloat(item.close_price);
        if (prevClose !== 0) {
          changePercent = ((currentClose - prevClose) / prevClose) * 100;
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
      };
    }).sort((a, b) => new Date(b.Date) - new Date(a.Date)); // 최신 날짜순 정렬

    return processed;
  }, [ohlcvData]);

  // (apiUrl debug removed)

  // 헤더 컴포넌트
  const HeaderComponent = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      flexWrap: 'wrap',
      gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <h6 style={{ margin: 0, fontWeight: '600', fontSize: '.875rem' }}>
          Historical Data ({selectedInterval.toUpperCase()})
        </h6>
        <button
          onClick={() => {
            setShowAll(!showAll) // 토글 기능
            if (!showAll) {
              setSelectedInterval('1d') // All 버튼 클릭 시 기본 인터벌로 설정
            }
          }}
          style={{
            padding: '5px 15px',
            border: '1px solid #007bff',
            backgroundColor: showAll ? '#0056b3' : '#007bff',
            color: 'white',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '.875rem',
            fontWeight: '400',
          }}
        >
          All
        </button>
        <div style={{ display: 'flex', gap: '5px' }}>
          {['1d', '1w', '1M'].map((interval) => (
            <button
              key={interval}
              onClick={() => {
                setSelectedInterval(interval)
                setShowAll(false) // 인터벌 버튼 클릭 시 All 해제
              }}
              disabled={showAll} // All 버튼이 활성화되면 인터벌 버튼 비활성화
              style={{
                padding: '5px 15px',
                border: '1px solid #007bff',
                backgroundColor: selectedInterval === interval && !showAll ? '#0056b3' : '#007bff',
                color: 'white',
                borderRadius: '4px',
                cursor: showAll ? 'not-allowed' : 'pointer',
                fontSize: '.875rem',
                fontWeight: '400',
                opacity: showAll ? 0.5 : 1,
              }}
            >
              {interval.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <HeaderComponent />
      <HistoryTableAgGrid 
        data={processedData}
        columnDefs={columnDefs}
        loading={loading}
        error={error}
        loadingMessage={`${asset?.name || '자산'} 데이터를 불러오는 중...`}
        errorMessage={`${asset?.name || '자산'} 데이터 로드에 실패했습니다`}
        height={height}
        style={style}
        {...props}
      />
    </div>
  )
}

export default OHLCVTable 