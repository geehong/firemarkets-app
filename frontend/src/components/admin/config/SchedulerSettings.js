import React, { useState, useEffect } from 'react'
import {
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormSwitch,
  CInputGroup,
  CInputGroupText,
  CButton,
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCardTitle,
  CAlert,
  CSpinner,
  CRow,
  CCol,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSettings, cilSave, cilReload } from '@coreui/icons'
import { useConfigurations } from '../../../hooks/useConfigurations'

const SchedulerSettings = () => {
  const {
    groupedConfigurations,
    loading,
    saving,
    error,
    loadGroupedConfigurations,
    updateGroupedConfiguration,
  } = useConfigurations()
  
  const [success, setSuccess] = useState(null)
  const [localSchedulerConfig, setSchedulerConfig] = useState(null)
  const [localSchedulerConfigAdvanced, setSchedulerConfigAdvanced] = useState(null)
  
  // 그룹화된 설정에서 필요한 데이터 추출
  const gc = groupedConfigurations || {}
  const schedulerConfig = localSchedulerConfig ?? gc['scheduler_settings']
  const schedulerConfigAdvanced = localSchedulerConfigAdvanced ?? gc['SCHEDULER_CONFIG']

  // 설정 로드
  const loadSchedulerConfig = async () => {
    await loadGroupedConfigurations()
    setSchedulerConfig(null)
    setSchedulerConfigAdvanced(null)
  }

  // 기본 스케줄러 설정 저장
  const saveSchedulerConfig = async () => {
    if (!schedulerConfig) return

    setSuccess(null)
    const result = await updateGroupedConfiguration('scheduler_settings', schedulerConfig.config_value)
    
    if (result.success) {
      setSuccess('기본 스케줄러 설정이 성공적으로 저장되었습니다.')
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  // 고급 스케줄러 설정 저장
  const saveSchedulerConfigAdvanced = async () => {
    if (!schedulerConfigAdvanced) return

    setSuccess(null)
    const result = await updateGroupedConfiguration('SCHEDULER_CONFIG', schedulerConfigAdvanced.config_value)
    
    if (result.success) {
      setSuccess('고급 스케줄러 설정이 성공적으로 저장되었습니다.')
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  // 기본 스케줄러 설정값 변경
  const handleValueChange = (key, newValue) => {
    setSchedulerConfig(prev => ({
      ...prev,
      config_value: {
        ...prev.config_value,
        [key]: {
          ...prev.config_value[key],
          value: newValue
        }
      }
    }))
  }

  // 고급 스케줄러 설정값 변경
  const handleAdvancedValueChange = (key, newValue) => {
    setSchedulerConfigAdvanced(prev => ({
      ...prev,
      config_value: {
        ...prev.config_value,
        [key]: {
          ...prev.config_value[key],
          value: newValue
        }
      }
    }))
  }

  // 설정 키를 보기 좋게 변환하는 함수
  const formatKeyName = (key) => {
    const keyMap = {
      // Scheduler Settings
      'DATA_COLLECTION_INTERVAL_MINUTES': 'Data Collection Interval',
      'OHLCV_DATA_INTERVAL': 'OHLCV Data Interval',
      'OHLCV_DATA_INTERVALS': 'OHLCV Data Intervals',
      'ENABLE_MULTIPLE_INTERVALS': 'Enable Multiple Intervals',
      'HISTORICAL_DATA_DAYS_PER_RUN': 'Historical Data Days Per Run',
      'MAX_HISTORICAL_DAYS': 'Max Historical Days',
      'ENABLE_HISTORICAL_BACKFILL': 'Enable Historical Backfill',
      'BATCH_PROCESSING_RETRY_ATTEMPTS': 'Batch Processing Retry Attempts',
      'API_REQUEST_TIMEOUT_SECONDS': 'API Request Timeout',
      'ENABLE_IMMEDIATE_EXECUTION': 'Enable Immediate Execution',
      'DATA_COLLECTION_INTERVAL_DAILY': 'Data Collection Interval Daily'
    }
    return keyMap[key] || key
  }

  // 입력 필드 렌더링
  const renderInputField = (key, item) => {
    const { value, type, description, is_sensitive } = item

    const handleChange = (e) => {
      let newValue = e.target.value
      
      // 타입별 값 변환
      if (type === 'int') {
        newValue = parseInt(newValue) || 0
      } else if (type === 'float') {
        newValue = parseFloat(newValue) || 0.0
      } else if (type === 'boolean') {
        newValue = e.target.checked
      }
      
      handleValueChange(key, newValue)
    }

    switch (type) {
      case 'boolean':
        return (
          <CFormSwitch
            id={`switch-${key}`}
            checked={value}
            onChange={handleChange}
            disabled={saving}
          />
        )

      case 'int':
        return (
          <CFormInput
            type="number"
            value={value || ''}
            onChange={handleChange}
            disabled={saving}
            placeholder="숫자를 입력하세요"
          />
        )

      case 'float':
        return (
          <CFormInput
            type="number"
            step="0.01"
            value={value || ''}
            onChange={handleChange}
            disabled={saving}
            placeholder="소수점 숫자를 입력하세요"
          />
        )

      case 'string':
        return (
          <CFormInput
            type="text"
            value={value || ''}
            onChange={handleChange}
            disabled={saving}
            placeholder="값을 입력하세요"
          />
        )

      case 'json':
        return (
          <CFormInput
            type="text"
            value={Array.isArray(value) ? value.join(', ') : JSON.stringify(value)}
            onChange={(e) => {
              try {
                const newValue = e.target.value.includes(',') 
                  ? e.target.value.split(',').map(v => v.trim())
                  : JSON.parse(e.target.value)
                handleValueChange(key, newValue)
              } catch {
                // JSON 파싱 실패시 문자열로 저장
                handleValueChange(key, e.target.value)
              }
            }}
            disabled={saving}
            placeholder="JSON 또는 쉼표로 구분된 값"
          />
        )

      default:
        return (
          <CFormInput
            type="text"
            value={value || ''}
            onChange={handleChange}
            disabled={saving}
            placeholder="값을 입력하세요"
          />
        )
    }
  }

  useEffect(() => {
    loadSchedulerConfig()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-4">
        <CSpinner size="sm" />
        <div className="mt-2">스케줄러 설정을 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <CAlert color="danger">
        <strong>오류:</strong> {error?.message || String(error)}
        <div className="mt-2">
          <CButton color="primary" size="sm" onClick={loadSchedulerConfig}>
            <CIcon icon={cilReload} className="me-1" />
            다시 시도
          </CButton>
        </div>
      </CAlert>
    )
  }

  if (!schedulerConfig) {
    return (
      <CAlert color="warning">
        <strong>경고:</strong> 스케줄러 설정을 찾을 수 없습니다.
      </CAlert>
    )
  }

  return (
    <div>
      {success && (
        <CAlert color="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </CAlert>
      )}
      
      {error && (
        <CAlert color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">Scheduler Settings</h5>
        <div>
          <CButton 
            color="primary" 
            onClick={saveSchedulerConfig}
            disabled={saving}
            className="me-2"
          >
            <CIcon icon={cilSave} className="me-1" />
            {saving ? '저장 중...' : '설정 저장'}
          </CButton>
          <CButton 
            color="secondary" 
            onClick={loadSchedulerConfig}
            disabled={loading}
          >
            <CIcon icon={cilReload} className="me-1" />
            새로고침
          </CButton>
        </div>
      </div>

      <CRow>
        {Object.entries(schedulerConfig.config_value)
          .filter(([key, item]) => key !== 'OHLCV_DATA_INTERVAL') // OHLCV_DATA_INTERVAL 필드 숨김
          .map(([key, item]) => (
          <CCol xs={12} md={6} key={key} className="mb-4">
            <CCard>
              <CCardHeader>
                  <CCardTitle className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{formatKeyName(key)}</strong>
                      <CBadge color="info" className="ms-2">
                        {item.type}
                      </CBadge>
                    </div>
                    <CBadge color={item.is_active ? 'success' : 'danger'}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </CBadge>
                  </CCardTitle>
              </CCardHeader>
              <CCardBody>
                {item.description && (
                  <p className="text-muted small mb-3">{item.description}</p>
                )}
                
                <CFormLabel htmlFor={`input-${key}`}>Value:</CFormLabel>
                {renderInputField(key, item)}
                
                {item.is_sensitive && (
                  <small className="text-warning d-block mt-2">
                    <CIcon icon={cilSettings} className="me-1" />
                    Sensitive Configuration
                  </small>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>

      {/* 고급 스케줄러 설정 */}
      {schedulerConfigAdvanced && (
        <>
          <hr className="my-4" />
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0">Advanced Scheduler Configuration</h5>
            <div>
              <CButton 
                color="success" 
                onClick={saveSchedulerConfigAdvanced}
                disabled={saving}
                className="me-2"
              >
                <CIcon icon={cilSave} className="me-1" />
                {saving ? '저장 중...' : '고급 설정 저장'}
              </CButton>
            </div>
          </div>

          <CRow>
            <CCol xs={12}>
              <CCard>
                <CCardHeader>
                  <CCardTitle className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>SCHEDULER_CONFIG</strong>
                      <CBadge color="info" className="ms-2">
                        json
                      </CBadge>
                    </div>
                    <CBadge color="success">
                      Active
                    </CBadge>
                  </CCardTitle>
                </CCardHeader>
                <CCardBody>
                  <p className="text-muted small mb-3">
                    Scheduler configuration with timezone and schedule definitions
                  </p>
                  
                  <CFormLabel htmlFor="scheduler-config-json">Configuration JSON:</CFormLabel>
                  <CFormInput
                    as="textarea"
                    rows={30}
                    value={JSON.stringify(schedulerConfigAdvanced.config_value, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsedValue = JSON.parse(e.target.value)
                        // 전체 config_value를 업데이트
                        setSchedulerConfigAdvanced(prev => ({
                          ...prev,
                          config_value: parsedValue
                        }))
                      } catch (err) {
                        // JSON 파싱 에러 시 무시
                      }
                    }}
                    placeholder="Enter complete JSON configuration"
                    style={{ 
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      lineHeight: '1.4',
                      minHeight: '350px',
                      maxHeight: '350px',
                      whiteSpace: 'pre'
                    }}
                  />
                  
                  <small className="text-info d-block mt-2">
                    <CIcon icon={cilSettings} className="me-1" />
                    Edit the complete JSON configuration above
                  </small>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        </>
      )}
    </div>
  )
}

export default SchedulerSettings
