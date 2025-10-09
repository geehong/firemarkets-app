import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardTitle,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CButton,
  CAlert,
  CSpinner,
  CRow,
  CCol,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSave, cilReload, cilSettings } from '@coreui/icons'
import { useConfigurations } from '../../../hooks/useConfigurations'

const RealtimeWebSocketSettings = () => {
  const {
    groupedConfigurations,
    loading,
    saving,
    error,
    loadGroupedConfigurations,
    updateGroupedConfiguration,
  } = useConfigurations()
  
  const [success, setSuccess] = useState(null)
  const [localRealtimeSettings, setLocalRealtimeSettings] = useState(null)
  const [localWebSocketConfig, setLocalWebSocketConfig] = useState(null)
  
  // 그룹화된 설정에서 필요한 데이터 추출 (방어적 기본값)
  const gc = groupedConfigurations || {}
  const realtimeSettings = localRealtimeSettings ?? gc['realtime_settings']
  const websocketConfig = localWebSocketConfig ?? gc['websocket_config']

  // 설정 로드
  const loadSettings = async () => {
    await loadGroupedConfigurations()
    // 로컬 상태 초기화
    setLocalRealtimeSettings(null)
    setLocalWebSocketConfig(null)
  }

  // 실시간 설정 저장
  const saveRealtimeSettings = async () => {
    if (!realtimeSettings) return

    setSuccess(null)
    const result = await updateGroupedConfiguration('realtime_settings', realtimeSettings.config_value)
    
    if (result.success) {
      setSuccess('실시간 설정이 성공적으로 저장되었습니다.')
      setTimeout(() => setSuccess(null), 3000)
      // 로컬 상태 초기화
      setLocalRealtimeSettings(null)
    }
  }

  // 웹소켓 설정 저장
  const saveWebSocketConfig = async () => {
    if (!websocketConfig) return

    setSuccess(null)
    const result = await updateGroupedConfiguration('websocket_config', websocketConfig.config_value)
    
    if (result.success) {
      setSuccess('웹소켓 설정이 성공적으로 저장되었습니다.')
      setTimeout(() => setSuccess(null), 3000)
      // 로컬 상태 초기화
      setLocalWebSocketConfig(null)
    }
  }

  // 실시간 설정값 변경
  const handleRealtimeValueChange = (key, newValue) => {
    setLocalRealtimeSettings(prev => ({
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

  // 웹소켓 설정값 변경
  const handleWebSocketValueChange = (key, newValue) => {
    setLocalWebSocketConfig(prev => ({
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
      // Realtime Settings
      'REALTIME_PROCESSING_INTERVAL_SECONDS': 'RealTime Data Processing',
      'REALTIME_BATCH_SIZE': 'RealTime Batch Size',
      'REALTIME_QUOTE_RETENTION_HOURS': 'RealTime Quote Retention',
      'REALTIME_STREAM_BLOCK_MS': 'RealTime Stream Block',
      'REALTIME_DISPLAY_INTERVAL_SECONDS': 'RealTime Display Interval',
      'REALTIME_DATA_FRESHNESS_THRESHOLD_SECONDS': 'RealTime Data Freshness',
      
      // WebSocket Config
      'WEBSOCKET_TIME_WINDOW_MINUTES': 'WebSocket Time Window',
      'WEBSOCKET_CONSUMER_GROUP_PREFIX': 'WebSocket Consumer Group',
      'WEBSOCKET_RECONNECT_DELAY_SECONDS': 'WebSocket Reconnect Delay',
      'WEBSOCKET_HEALTH_CHECK_INTERVAL_SECONDS': 'WebSocket Health Check',
      'WEBSOCKET_CONSUMER_INTERVAL_SECONDS': 'WebSocket Consumer Interval',
      'WEBSOCKET_FINNHUB_ENABLED': 'Finnhub WebSocket',
      'WEBSOCKET_BINANCE_ENABLED': 'Binance WebSocket',
      'WEBSOCKET_ALPACA_ENABLED': 'Alpaca WebSocket',
      'WEBSOCKET_TIINGO_ENABLED': 'Tiingo WebSocket',
      'WEBSOCKET_TWELVEDATA_ENABLED': 'TwelveData WebSocket',
      'WEBSOCKET_SWISSQUOTE_ENABLED': 'Swissquote WebSocket',
      'WEBSOCKET_COINBASE_ENABLED': 'Coinbase WebSocket'
    }
    return keyMap[key] || key
  }

  // 입력 필드 렌더링
  const renderInputField = (key, item, onChangeHandler) => {
    const { value, type, description, is_sensitive } = item

    switch (type) {
      case 'boolean':
        return (
          <CFormSelect
            value={value ? 'true' : 'false'}
            onChange={(e) => onChangeHandler(key, e.target.value === 'true')}
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </CFormSelect>
        )
      case 'int':
        return (
          <CFormInput
            type="number"
            value={value}
            onChange={(e) => onChangeHandler(key, parseInt(e.target.value) || 0)}
            placeholder={description}
          />
        )
      case 'float':
        return (
          <CFormInput
            type="number"
            step="0.1"
            value={value}
            onChange={(e) => onChangeHandler(key, parseFloat(e.target.value) || 0)}
            placeholder={description}
          />
        )
      case 'json':
        return (
          <CFormInput
            as="textarea"
            rows={8}
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsedValue = JSON.parse(e.target.value)
                onChangeHandler(key, parsedValue)
              } catch (err) {
                // JSON 파싱 에러 시 무시
              }
            }}
            placeholder="Enter JSON configuration"
            style={{ 
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: '1.4'
            }}
          />
        )
      default:
        return (
          <CFormInput
            type="text"
            value={value}
            onChange={(e) => onChangeHandler(key, e.target.value)}
            placeholder={description}
          />
        )
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-4">
        <CSpinner size="sm" />
        <div className="mt-2">설정을 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <CAlert color="danger">
        <strong>오류:</strong> {error}
        <div className="mt-2">
          <CButton color="primary" size="sm" onClick={loadSettings}>
            <CIcon icon={cilReload} className="me-1" />
            다시 시도
          </CButton>
        </div>
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

      {/* 실시간 설정 */}
      {realtimeSettings && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0">Realtime Settings</h5>
            <div>
              <CButton 
                color="primary" 
                onClick={saveRealtimeSettings}
                disabled={saving}
                className="me-2"
              >
                <CIcon icon={cilSave} className="me-1" />
                {saving ? '저장 중...' : '실시간 설정 저장'}
              </CButton>
              <CButton 
                color="secondary" 
                onClick={loadSettings}
                disabled={loading}
              >
                <CIcon icon={cilReload} className="me-1" />
                새로고침
              </CButton>
            </div>
          </div>

          <CRow>
            {Object.entries((realtimeSettings && realtimeSettings.config_value) || {}).map(([key, item]) => (
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
                    
                    <CFormLabel htmlFor={`realtime-input-${key}`}>Value:</CFormLabel>
                    {renderInputField(key, item, handleRealtimeValueChange)}
                    
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
        </>
      )}

      {/* 웹소켓 설정 */}
      {websocketConfig && (
        <>
          <hr className="my-4" />
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0">WebSocket Configuration</h5>
            <div>
              <CButton 
                color="success" 
                onClick={saveWebSocketConfig}
                disabled={saving}
                className="me-2"
              >
                <CIcon icon={cilSave} className="me-1" />
                {saving ? '저장 중...' : '웹소켓 설정 저장'}
              </CButton>
            </div>
          </div>

          <CRow>
            {Object.entries((websocketConfig && websocketConfig.config_value) || {}).map(([key, item]) => (
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
                    
                    <CFormLabel htmlFor={`websocket-input-${key}`}>Value:</CFormLabel>
                    {renderInputField(key, item, handleWebSocketValueChange)}
                    
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
        </>
      )}
    </div>
  )
}

export default RealtimeWebSocketSettings
