import React, { useState, useEffect } from 'react'
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
  CFormCheck,
  CButton,
  CSpinner,
  CInputGroup,
  CFormInput,
  CFormSelect,
  CCard,
  CCardBody,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSave, cilCheckCircle } from '@coreui/icons'
import { CATEGORY_ICONS, COLUMN_LABELS } from '../../../constants/tickerSettings'
import GenericCollectionSettings from './GenericCollectionSettings'
import TickerActions from './TickerActions'
import { useGlobalTickerData } from '../../../hooks/useGlobalTickerData'
import useAssetTypes from '../../../hooks/useAssetTypes'
import { useTickerMutations } from '../../../hooks/useTickerMutations'

const TickerTable = ({
  assetType = 'Stocks',
  pendingChanges = {},
  onSettingChange,
  onExecute,
  onDelete,
  searchTerm = '',
  onSearchChange,
  isExecuting = false,
  executingTickers = [],
  onExecutePerAsset,
  onBulkSave,
  isBulkUpdatingSettings = false,
  onAssetTypeChange,
}) => {
  // 체크박스 상태를 관리하는 로컬 상태
  const [checkboxStates, setCheckboxStates] = useState({})
  // 데이터 소스 상태를 관리하는 로컬 상태
  const [dataSourceStates, setDataSourceStates] = useState({})
  // 저장 중 상태
  const [isSaving, setIsSaving] = useState(false)
  
  // 티커 데이터 가져오기
  const { tickers, loading: tickersLoading, error: tickersError, refetchTickers } = useGlobalTickerData()
  
  // 자산 타입 데이터 가져오기
  const { assetTypes, loading: assetTypesLoading, error: assetTypesError } = useAssetTypes()
  
  // Mutation 훅 사용
  const { bulkUpdateSettings } = useTickerMutations({
    onSuccess: async () => {
      setIsSaving(false)
      // 로컬 상태 완전 초기화
      setCheckboxStates({})
      setDataSourceStates({})
      console.log('🔍 Local states reset after successful save')
      
      // DB 데이터 새로고침
      try {
        await refetchTickers()
        console.log('🔍 Data refetched after successful save')
      } catch (error) {
        console.error('🔍 Failed to refetch data:', error)
      }
    },
    onError: (error) => {
      setIsSaving(false)
      console.error('Failed to save settings:', error)
    }
  })

  // 자산 타입별로 필터링
  const filteredTickersByType = tickers.filter(ticker => {
    const tickerType = ticker.type_name || 'Stocks'
    return tickerType === assetType
  })
  // 검색어로 필터링
  const filteredTickers = filteredTickersByType.filter(
    (ticker) =>
      ticker.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticker.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // 설정 키 매핑 (changeSummary보다 먼저 정의)
  const getSettingKey = (columnKey) => {
    switch (columnKey) {
      case 'price':
        return 'collect_price'
      case 'stock_info':
      case 'etf_info':
      case 'fund_info':
        return 'collect_assets_info'
      case 'stock_financials':
        return 'collect_financials'
      case 'stock_estimates':
        return 'collect_estimates'
      case 'crypto_data':
        return 'collect_crypto_data'
      case 'technical_indicators':
        return 'collect_technical_indicators'
      default:
        return null
    }
  }

  // 원래 DB 값 가져오기 (로컬 상태 무시) - changeSummary보다 먼저 정의
  const getOriginalSettingValue = (ticker, columnKey) => {
    const settingKey = getSettingKey(columnKey)
    if (!settingKey) return true

    // pendingChanges에서 확인
    if (
      pendingChanges[ticker.asset_id] &&
      pendingChanges[ticker.asset_id][settingKey] !== undefined
    ) {
      return pendingChanges[ticker.asset_id][settingKey]
    }

    // JSON 필드에서 확인
    if (ticker.collection_settings && ticker.collection_settings[settingKey] !== undefined) {
      return ticker.collection_settings[settingKey]
    }

    // 기존 필드에서 확인 (하위 호환성)
    if (ticker[settingKey] !== undefined) {
      return ticker[settingKey]
    }

    // 기본값 반환
    switch (settingKey) {
      case 'collect_price':
      case 'collect_assets_info':
      case 'collect_financials':
      case 'collect_estimates':
      case 'collect_crypto_data':
        return true
      case 'collect_technical_indicators':
        return false
      default:
        return true
    }
  }

  // 변경사항 요약 계산
  const changeSummary = React.useMemo(() => {
    const changes = {
      settings: {},
      dataSources: {}
    }
    
    // 체크박스 변경사항 - 실제 DB 값과 비교
    Object.keys(checkboxStates).forEach(key => {
      const parts = key.split('_')
      
      if (parts.length >= 2) {
        const assetId = parts[0]
        const columnKey = parts.slice(1).join('_')
        
        // 해당 티커 찾기
        const ticker = filteredTickers.find(t => t.asset_id.toString() === assetId)
        if (ticker) {
          const originalValue = getOriginalSettingValue(ticker, columnKey)
          const currentValue = checkboxStates[key]
          
          // 실제로 값이 변경된 경우만 추가
          if (originalValue !== currentValue) {
            const settingKey = getSettingKey(columnKey)
            
            if (settingKey) {
              if (!changes.settings[assetId]) changes.settings[assetId] = {}
              changes.settings[assetId][settingKey] = currentValue
            }
          }
        }
      }
    })
    
    // 데이터 소스 변경사항 - 실제 DB 값과 비교
    Object.keys(dataSourceStates).forEach(key => {
      const assetId = key.replace('_data_source', '')
      
      // 해당 티커 찾기
      const ticker = filteredTickers.find(t => t.asset_id.toString() === assetId)
      if (ticker) {
        const originalValue = ticker.data_source || 'fmp'
        const currentValue = dataSourceStates[key]
        
        // 실제로 값이 변경된 경우만 추가
        if (originalValue !== currentValue) {
          changes.dataSources[assetId] = currentValue
        }
      }
    })
    
    return changes
  }, [checkboxStates, dataSourceStates, filteredTickers])

  // 현재 표시 값 가져오기 (로컬 상태 포함)
  const getSettingValue = (ticker, columnKey) => {
    const checkboxKey = `${ticker.asset_id}_${columnKey}`
    
    // 로컬 상태가 있으면 로컬 상태 사용
    if (checkboxStates[checkboxKey] !== undefined) {
      return checkboxStates[checkboxKey]
    }
    
    // 없으면 원래 DB 값 사용
    return getOriginalSettingValue(ticker, columnKey)
  }

  // 변경사항이 있는지 확인
  const hasChanges = React.useMemo(() => {
    return Object.keys(changeSummary.settings).length > 0 || 
           Object.keys(changeSummary.dataSources).length > 0
  }, [changeSummary])

  // 변경사항 개수 계산
  const changeCount = React.useMemo(() => {
    let count = 0
    Object.values(changeSummary.settings).forEach(settings => {
      count += Object.keys(settings).length
    })
    count += Object.keys(changeSummary.dataSources).length
    return count
  }, [changeSummary])

  // 로딩 상태 표시
  if (tickersLoading) {
    return (
      <div className="text-center p-5">
        <CSpinner size="sm" />
        <div className="mt-2">티커 데이터를 불러오는 중...</div>
      </div>
    )
  }

  // 에러 상태 표시
  if (tickersError) {
    return (
      <div className="text-center p-5 text-danger">
        <div>티커 데이터를 불러오는데 실패했습니다.</div>
        <div className="small">{tickersError.message}</div>
      </div>
    )
  }

  if (filteredTickers.length === 0) {
    return (
      <div className="text-center p-5 text-body-secondary">
        {searchTerm ? '검색 결과가 없습니다.' : '이 카테고리에 해당하는 티커가 없습니다.'}
      </div>
    )
  }

  const getStatusIcon = (ticker) => {
    if (executingTickers.includes(ticker.asset_id)) {
      return <CSpinner size="sm" className="text-primary" />
    }
    if (ticker.is_active !== false) {
      return <span className="text-success">✓</span>
    }
    return <span className="text-secondary">✗</span>
  }

  const getStatusBadge = (ticker) => {
    if (executingTickers.includes(ticker.asset_id)) {
      return <CBadge color="primary">실행중</CBadge>
    }
    if (ticker.is_active !== false) {
      return <CBadge color="success">활성</CBadge>
    }
    return <CBadge color="secondary">비활성</CBadge>
  }

  // 자산 타입별 컬럼 정의
  const getAssetColumns = () => {
    switch (assetType) {
      case 'Stocks':
        return [
          { key: 'price', label: 'Price' },
          { key: 'stock_info', label: 'S-Info' },
          { key: 'stock_financials', label: 'S-Financials' },
          { key: 'stock_estimates', label: 'S-Estimates' },
        ]
      case 'ETFs':
        return [
          { key: 'price', label: 'Price' },
          { key: 'etf_info', label: 'ETF-Info' },
        ]
      case 'Funds':
        return [
          { key: 'price', label: 'Price' },
          { key: 'fund_info', label: 'Fund-Info' },
        ]
      case 'Crypto':
        return [
          { key: 'price', label: 'Price' },
          { key: 'crypto_data', label: 'C-Data' },
          { key: 'technical_indicators', label: 'Tech-Indi' },
        ]
      default:
        return [{ key: 'price', label: 'Price' }]
    }
  }

  const assetColumns = getAssetColumns()

  const handleColumnToggle = (settingKey) => {
    // 전체 선택/해제 로직
    const allChecked = filteredTickers.every(ticker => getSettingValue(ticker, settingKey))
    const newValue = !allChecked

    filteredTickers.forEach(ticker => {
      const checkboxKey = `${ticker.asset_id}_${settingKey}`
      setCheckboxStates(prev => ({
        ...prev,
        [checkboxKey]: newValue
      }))
    })
  }

  const getColumnKeyFromSettingKey = (settingKey) => {
    switch (settingKey) {
      case 'collect_price':
        return 'price'
      case 'collect_assets_info':
        if (assetType === 'Stocks') return 'stock_info'
        if (assetType === 'ETFs') return 'etf_info'
        if (assetType === 'Funds') return 'fund_info'
        return 'stock_info'
      case 'collect_financials':
        return 'stock_financials'
      case 'collect_estimates':
        return 'stock_estimates'
      case 'collect_crypto_data':
        return 'crypto_data'
      case 'collect_technical_indicators':
        return 'technical_indicators'
      default:
        return settingKey
    }
  }

  const handleSettingChange = async (tickerId, columnKey, value) => {
    const checkboxKey = `${tickerId}_${columnKey}`
    setCheckboxStates(prev => ({
      ...prev,
      [checkboxKey]: value
    }))
  }

  const getDataSourceValue = (ticker) => {
    const dataSourceKey = `${ticker.asset_id}_data_source`
    const initialValue = ticker.data_source || 'fmp'
    return dataSourceStates[dataSourceKey] !== undefined ? dataSourceStates[dataSourceKey] : initialValue
  }

  const handleDataSourceChange = (tickerId, newDataSource) => {
    const dataSourceKey = `${tickerId}_data_source`
    setDataSourceStates(prev => ({
      ...prev,
      [dataSourceKey]: newDataSource
    }))
  }

  // 변경사항이 있는지 확인 (시각적 표시용)
  const hasLocalChange = (ticker, columnKey) => {
    const checkboxKey = `${ticker.asset_id}_${columnKey}`
    return checkboxStates[checkboxKey] !== undefined
  }

  const hasDataSourceChange = (ticker) => {
    const dataSourceKey = `${ticker.asset_id}_data_source`
    return dataSourceStates[dataSourceKey] !== undefined
  }

  // 저장 함수
  const handleSaveAll = async () => {
    if (!hasChanges) return
    
    setIsSaving(true)
    
    try {
      const updates = []
      
      // 설정 변경사항 추가
      Object.keys(changeSummary.settings).forEach(assetId => {
        const update = {
          asset_id: parseInt(assetId),
          ...changeSummary.settings[assetId]
        }
        updates.push(update)
      })
      
      // 데이터 소스 변경사항 추가
      Object.keys(changeSummary.dataSources).forEach(assetId => {
        const existingUpdate = updates.find(u => u.asset_id === parseInt(assetId))
        if (existingUpdate) {
          existingUpdate.data_source = changeSummary.dataSources[assetId]
        } else {
          updates.push({
            asset_id: parseInt(assetId),
            data_source: changeSummary.dataSources[assetId]
          })
        }
      })
      
      await bulkUpdateSettings(updates)
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  return (
    <>
      {/* 자산 타입 선택 */}
      <div className="mb-3">
        <label className="form-label">Asset Type:</label>
        <CFormSelect
          value={assetType}
          onChange={(e) => {
            if (onAssetTypeChange) {
              onAssetTypeChange(e.target.value)
            }
          }}
          disabled={assetTypesLoading}
        >
          {!Array.isArray(assetTypes) || assetTypes.length === 0 ? (
            <option value="">Loading asset types...</option>
          ) : (
            assetTypes.map((type) => (
              <option key={type.asset_type_id} value={type.type_name}>
                {type.type_name}
              </option>
            ))
          )}
        </CFormSelect>
      </div>

      {/* 변경사항 요약 및 저장 버튼 */}
      {hasChanges && (
        <CCard className="mb-3 border-warning">
          <CCardBody className="py-2">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <CIcon icon={cilCheckCircle} className="text-warning me-2" />
                <span className="fw-bold text-warning">
                  {changeCount}개 항목이 변경되었습니다
                </span>
              </div>
              <CButton
                color="warning"
                size="sm"
                onClick={handleSaveAll}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <CIcon icon={cilSave} size="sm" className="me-1" />
                    모든 변경사항 저장
                  </>
                )}
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      )}

      {/* 설정 저장 버튼 */}
      {Object.keys(pendingChanges || {}).length > 0 && (
        <div className="mb-3">
          <CButton
            color="warning"
            size="sm"
            onClick={onBulkSave}
            disabled={isBulkUpdatingSettings}
          >
            {isBulkUpdatingSettings ? (
              <>
                <CSpinner size="sm" className="me-2" />
                저장 중...
              </>
            ) : (
              <>
                <CIcon icon={cilSave} size="sm" className="me-1" />
                설정 저장
              </>
            )}
          </CButton>
        </div>
      )}

      {/* 테이블 */}
      <CTable hover responsive align="middle">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>ID</CTableHeaderCell>
            <CTableHeaderCell>Ticker</CTableHeaderCell>
            <CTableHeaderCell>Data Source</CTableHeaderCell>
            {assetColumns.map((column) => (
              <CTableHeaderCell key={column.key} className="text-center">
                <div className="d-flex align-items-center justify-content-center">
                  <CFormCheck
                    checked={filteredTickers.every(ticker => getSettingValue(ticker, column.key))}
                    onChange={() => handleColumnToggle(column.key)}
                    disabled={isExecuting}
                    className="me-2"
                  />
                  {column.label}
                </div>
              </CTableHeaderCell>
            ))}
            <CTableHeaderCell className="text-center">Execute</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {filteredTickers.map((ticker) => (
            <CTableRow key={ticker.asset_id}>
              <CTableDataCell>{ticker.asset_id}</CTableDataCell>
              <CTableDataCell>
                <div className="d-flex align-items-center">
                  {getStatusIcon(ticker)}
                  <strong className="ms-2">{ticker.ticker}</strong>
                  {getStatusBadge(ticker)}
                  {(hasLocalChange(ticker, 'any') || hasDataSourceChange(ticker)) && (
                    <CBadge color="warning" className="ms-2 small">
                      변경됨
                    </CBadge>
                  )}
                </div>
              </CTableDataCell>
              <CTableDataCell>
                <div className="d-flex align-items-center">
                  <CFormSelect
                    value={getDataSourceValue(ticker)}
                    onChange={(e) => handleDataSourceChange(ticker.asset_id, e.target.value)}
                    disabled={isExecuting}
                    size="sm"
                    className={hasDataSourceChange(ticker) ? 'border-warning' : ''}
                  >
                    <option value="alpha_vantage">Alpha Vantage</option>
                    <option value="fmp">FMP</option>
                    <option value="yahoo_finance">Yahoo Finance</option>
                    <option value="bgeometrics">BGeometrics</option>
                    <option value="fred">FRED</option>
                    <option value="binance">Binance</option>
                    <option value="coinbase">Coinbase</option>
                    <option value="coinmarketcap">CoinMarketCap</option>
                  </CFormSelect>
                  {hasDataSourceChange(ticker) && (
                    <CIcon icon={cilCheckCircle} className="text-warning ms-1" size="sm" />
                  )}
                </div>
              </CTableDataCell>
              {assetColumns.map((column) => (
                <CTableDataCell key={column.key} className="text-center">
                  <div className="d-flex justify-content-center align-items-center">
                    <CFormCheck
                      checked={getSettingValue(ticker, column.key)}
                      onChange={(e) => {
                        handleSettingChange(ticker.asset_id, column.key, e.target.checked)
                      }}
                      disabled={isExecuting}
                      className={hasLocalChange(ticker, column.key) ? 'border-warning' : ''}
                    />
                    {hasLocalChange(ticker, column.key) && (
                      <CIcon icon={cilCheckCircle} className="text-warning ms-1" size="sm" />
                    )}
                  </div>
                </CTableDataCell>
              ))}
              <CTableDataCell className="text-center">
                <TickerActions
                  ticker={ticker}
                  onExecute={onExecute}
                  onDelete={onDelete}
                  isExecuting={isExecuting}
                />
              </CTableDataCell>
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>
    </>
  )
}

export default TickerTable
