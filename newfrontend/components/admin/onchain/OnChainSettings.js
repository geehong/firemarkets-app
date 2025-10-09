import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCardTitle,
  CButton,
  CSpinner,
  CAlert,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormCheck,
  CRow,
  CCol,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSettings, cilSave, cilReload, cilCheck, cilX } from '@coreui/icons'
import { useConfigurations } from '../../../hooks/useConfigurations'

const OnChainSettings = () => {
  const {
    groupedConfigurations,
    loading,
    saving,
    error,
    loadGroupedConfigurations,
    updateGroupedConfiguration,
  } = useConfigurations()
  
  const [success, setSuccess] = useState(null)
  const [localApiSettings, setApiSettings] = useState(null)
  const [localMetricsToggles, setMetricsToggles] = useState(null)
  
  // 그룹화된 설정에서 필요한 데이터 추출
  const gc = groupedConfigurations || {}
  const apiSettings = localApiSettings ?? gc['onchain_api_settings']
  const metricsToggles = localMetricsToggles ?? gc['onchain_metrics_toggles']

  // 모든 설정 로드
  const loadSettings = async () => {
    await loadGroupedConfigurations()
    setApiSettings(null)
    setMetricsToggles(null)
  }

  // API 설정 저장
  const saveApiSettings = async () => {
    if (!apiSettings) return

    setSuccess(null)
    const result = await updateGroupedConfiguration('onchain_api_settings', apiSettings.config_value)
    
    if (result.success) {
      setSuccess('API settings saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  // 모든 설정 저장 (API Settings + Metrics Toggles)
  const saveAllSettings = async () => {
    console.log('🔥 Save All Settings 버튼 클릭됨!')
    setSuccess(null)

    try {
      // API Settings 저장
      if (apiSettings) {
        console.log('Saving API settings...')
        const apiResult = await updateGroupedConfiguration('onchain_api_settings', apiSettings.config_value)
        if (!apiResult.success) {
          throw new Error(apiResult.message)
        }
        console.log('✅ API settings saved')
      }

      // Metrics Toggles 저장
      if (metricsToggles) {
        console.log('Saving metrics toggles...')
        const metricsResult = await updateGroupedConfiguration('onchain_metrics_toggles', metricsToggles.config_value)
        if (!metricsResult.success) {
          throw new Error(metricsResult.message)
        }
        console.log('✅ Metrics toggles saved')
      }

      setSuccess('All settings saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
    }
  }


  // API 설정 값 변경
  const handleApiSettingChange = (key, field, value) => {
    setApiSettings(prev => ({
      ...prev,
      config_value: {
        ...prev.config_value,
        [key]: {
          ...prev.config_value[key],
          [field]: value,
        },
      },
    }))
  }

  // 메트릭 토글 변경
  const handleMetricToggleChange = (key, field, value) => {
    console.log('Metric toggle change:', { key, field, value })
    setMetricsToggles(prev => {
      const newState = {
        ...prev,
        config_value: {
          ...prev.config_value,
          [key]: {
            ...prev.config_value[key],
            [field]: value,
          },
        },
      }
      console.log('New metrics state:', newState.config_value[key])
      return newState
    })
  }

  // 입력 필드 렌더링
  const renderInputField = (key, item, onChange) => {
    const { value, type, description, is_sensitive } = item

    switch (type) {
      case 'boolean':
        return (
          <CFormCheck
            id={key}
            checked={value}
            onChange={(e) => onChange(key, 'value', e.target.checked)}
            label={description}
          />
        )
      case 'int':
        return (
          <CFormInput
            type="number"
            value={value}
            onChange={(e) => onChange(key, 'value', parseInt(e.target.value) || 0)}
            placeholder={description}
          />
        )
      case 'string':
        return (
          <CFormInput
            type={is_sensitive ? 'password' : 'text'}
            value={value}
            onChange={(e) => onChange(key, 'value', e.target.value)}
            placeholder={description}
          />
        )
      default:
        return (
          <CFormInput
            type="text"
            value={value}
            onChange={(e) => onChange(key, 'value', e.target.value)}
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
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
        <CSpinner />
        <span className="ms-2">Loading on-chain settings...</span>
      </div>
    )
  }

  return (
    <div className="p-3">
      {error && (
        <CAlert color="danger" className="mb-3">
          <CIcon icon={cilX} className="me-2" />
          {error}
        </CAlert>
      )}

      {success && (
        <CAlert color="success" className="mb-3">
          <CIcon icon={cilCheck} className="me-2" />
          {success}
        </CAlert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">On-Chain Settings</h5>
        <div>
          <CButton color="success" onClick={saveAllSettings} disabled={saving} className="me-2">
            <CIcon icon={cilSave} className="me-1" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </CButton>
          <CButton color="secondary" onClick={loadSettings} disabled={loading}>
            <CIcon icon={cilReload} className="me-1" />
            Reload
          </CButton>
        </div>
      </div>

      <CRow>
        {/* API Settings */}
        <CCol xs={12} md={6} className="mb-4">
          <CCard>
            <CCardHeader>
              <CCardTitle className="d-flex align-items-center">
                <CIcon icon={cilSettings} className="me-2" />
                API Settings
              </CCardTitle>
            </CCardHeader>
            <CCardBody>
              {apiSettings && apiSettings.config_value ? (
                <CForm>
                  {Object.entries(apiSettings.config_value).map(([key, item]) => (
                    <div key={key} className="mb-3">
                      <CFormLabel htmlFor={key}>
                        <strong>{key}</strong>
                        {item.is_sensitive && (
                          <CBadge color="warning" className="ms-2">Sensitive</CBadge>
                        )}
                      </CFormLabel>
                      {renderInputField(key, item, handleApiSettingChange)}
                      {item.description && (
                        <div className="text-muted small mt-1">{item.description}</div>
                      )}
                    </div>
                  ))}
                </CForm>
              ) : (
                <div className="text-muted">No API settings available</div>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* Metrics Toggles */}
        <CCol xs={12} md={6} className="mb-4">
          <CCard>
            <CCardHeader>
              <CCardTitle className="d-flex align-items-center">
                <CIcon icon={cilSettings} className="me-2" />
                Metrics Toggles
              </CCardTitle>
            </CCardHeader>
            <CCardBody>
              {metricsToggles && metricsToggles.config_value ? (
                <CForm>
                  {Object.entries(metricsToggles.config_value).map(([key, item]) => (
                    <div key={key} className="mb-3">
                      <CFormLabel htmlFor={key}>
                        <strong>{key}</strong>
                        <CBadge 
                          color={item.value ? 'success' : 'secondary'} 
                          className="ms-2"
                        >
                          {item.value ? 'Enabled' : 'Disabled'}
                        </CBadge>
                      </CFormLabel>
                      {renderInputField(key, item, handleMetricToggleChange)}
                      {item.description && (
                        <div className="text-muted small mt-1">{item.description}</div>
                      )}
                    </div>
                  ))}
                </CForm>
              ) : (
                <div className="text-muted">No metrics toggles available</div>
              )}
            </CCardBody>
          </CCard>
        </CCol>

      </CRow>
    </div>
  )
}

export default OnChainSettings
