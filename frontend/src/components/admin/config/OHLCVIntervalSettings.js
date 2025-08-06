import React from 'react'
import { CButton, CFormLabel } from '@coreui/react'

/**
 * OHLCV 간격 설정 컴포넌트
 * @param {Object} props
 * @param {Array} props.configurations - 설정 배열
 * @param {Function} props.updateConfiguration - 설정 업데이트 함수
 * @param {boolean} props.saving - 저장 중 상태
 */
const OHLCVIntervalSettings = ({ configurations, updateConfiguration, saving }) => {
  const enableMultipleIntervals = configurations.find(c => c.config_key === 'ENABLE_MULTIPLE_INTERVALS')?.config_value === 'true'
  const ohlcvInterval = configurations.find(c => c.config_key === 'OHLCV_DATA_INTERVAL')?.config_value || '1d'
  const ohlcvIntervals = configurations.find(c => c.config_key === 'OHLCV_DATA_INTERVALS')?.config_value || '["1d", "1h", "4h"]'
  
  const handleSingleIntervalSelect = (interval) => {
    // 단일 간격 선택 시 다중 간격 비활성화
    updateConfiguration('ENABLE_MULTIPLE_INTERVALS', 'false')
    updateConfiguration('OHLCV_DATA_INTERVAL', interval)
  }
  
  const handleMultipleIntervalsSelect = (intervals) => {
    // 다중 간격 선택 시 단일 간격 비활성화
    updateConfiguration('ENABLE_MULTIPLE_INTERVALS', 'true')
    updateConfiguration('OHLCV_DATA_INTERVALS', intervals)
  }
  
  return (
    <div className="mb-4 p-3 border rounded">
      <h6 className="mb-3">
        <i className="cil-chart me-2"></i>
        OHLCV 간격 설정
      </h6>
      
      {/* 단일 간격 옵션 */}
      <div className="mb-3">
        <CFormLabel className="fw-bold">단일 간격 선택</CFormLabel>
        <div className="d-flex flex-wrap gap-2">
          {['1d', '1h', '4h', '1w', '1m'].map((interval) => (
            <CButton
              key={interval}
              color={!enableMultipleIntervals && ohlcvInterval === interval ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => handleSingleIntervalSelect(interval)}
              disabled={saving}
              className="mb-1"
            >
              {interval === '1d' && '일간 (1d)'}
              {interval === '1h' && '시간 (1h)'}
              {interval === '4h' && '4시간 (4h)'}
              {interval === '1w' && '주간 (1w)'}
              {interval === '1m' && '월간 (1m)'}
            </CButton>
          ))}
        </div>
        {!enableMultipleIntervals && (
          <small className="text-success">
            ✓ 현재 선택: {ohlcvInterval}
          </small>
        )}
      </div>
      
      {/* 다중 간격 옵션 */}
      <div className="mb-3">
        <CFormLabel className="fw-bold">다중 간격 선택</CFormLabel>
        <div className="d-flex flex-wrap gap-2 mb-2">
          {['1d', '1h', '4h', '1w', '1m'].map((interval) => {
            const currentIntervals = enableMultipleIntervals ? JSON.parse(ohlcvIntervals || '[]') : []
            const isSelected = currentIntervals.includes(interval)
            
            return (
              <CButton
                key={interval}
                color={isSelected ? 'success' : 'outline-success'}
                size="sm"
                onClick={() => {
                  const intervals = enableMultipleIntervals ? JSON.parse(ohlcvIntervals || '[]') : []
                  const newIntervals = isSelected 
                    ? intervals.filter(i => i !== interval)
                    : [...intervals, interval]
                  handleMultipleIntervalsSelect(JSON.stringify(newIntervals))
                }}
                disabled={saving}
                className="mb-1"
              >
                {interval === '1d' && '일간 (1d)'}
                {interval === '1h' && '시간 (1h)'}
                {interval === '4h' && '4시간 (4h)'}
                {interval === '1w' && '주간 (1w)'}
                {interval === '1m' && '월간 (1m)'}
              </CButton>
            )
          })}
        </div>
        {enableMultipleIntervals && (
          <div>
            <small className="text-success">
              ✓ 현재 선택: {ohlcvIntervals}
            </small>
            <br />
            <small className="text-muted">
              여러 간격을 선택하면 각각의 데이터를 수집합니다.
            </small>
          </div>
        )}
      </div>
      
      {/* 설명 */}
      <div className="mt-3 p-2 bg-light rounded">
        <small className="text-muted">
          <strong>설명:</strong> 단일 간격과 다중 간격 중 하나만 선택할 수 있습니다.
          <br />
          • <strong>단일 간격:</strong> 하나의 간격으로만 데이터 수집
          <br />
          • <strong>다중 간격:</strong> 여러 간격으로 동시에 데이터 수집
        </small>
      </div>
    </div>
  )
}

export default OHLCVIntervalSettings 