import React, { useState } from 'react'
import {
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CFormSwitch,
  CInputGroup,
  CInputGroupText,
  CButton,
  CBadge,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
} from '@coreui/react'

const ConfigForm = ({ configurations, onConfigChange, saving = false }) => {
  const [showSensitiveValues, setShowSensitiveValues] = useState({})

  // 설정값들을 카테고리별로 그룹화
  const groupedConfigurations = configurations.reduce((acc, config) => {
    const category = config.category || 'general'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(config)
    return acc
  }, {})

  // 민감한 값 표시/숨김 토글
  const toggleSensitiveValue = (configKey) => {
    setShowSensitiveValues((prev) => ({
      ...prev,
      [configKey]: !prev[configKey],
    }))
  }

  // 입력 필드 렌더링
  const renderInputField = (config) => {
    const { config_key, config_value, data_type, is_sensitive, description } = config

    const handleValueChange = (e) => {
      const newValue = e.target.value
      onConfigChange(config_key, newValue)
    }

    const handleSwitchChange = (e) => {
      const newValue = e.target.checked ? 'true' : 'false'
      onConfigChange(config_key, newValue)
    }

    switch (data_type) {
      case 'boolean':
        return (
          <CFormSwitch
            id={`switch-${config_key}`}
            checked={config_value === 'true'}
            onChange={handleSwitchChange}
            disabled={saving}
          />
        )

      case 'int':
        return (
          <CFormInput
            type="number"
            value={config_value || ''}
            onChange={handleValueChange}
            disabled={saving}
            placeholder="숫자를 입력하세요"
          />
        )

      case 'float':
        return (
          <CFormInput
            type="number"
            step="0.01"
            value={config_value || ''}
            onChange={handleValueChange}
            disabled={saving}
            placeholder="소수점 숫자를 입력하세요"
          />
        )

      default: // string
        if (is_sensitive) {
          return (
            <CInputGroup>
              <CFormInput
                type={showSensitiveValues[config_key] ? 'text' : 'password'}
                value={config_value || ''}
                onChange={handleValueChange}
                disabled={saving}
                placeholder="민감한 정보"
              />
              <CInputGroupText>
                <CButton
                  color="link"
                  size="sm"
                  onClick={() => toggleSensitiveValue(config_key)}
                  disabled={saving}
                >
                  {showSensitiveValues[config_key] ? '숨김' : '표시'}
                </CButton>
              </CInputGroupText>
            </CInputGroup>
          )
        }

        return (
          <CFormInput
            type="text"
            value={config_value || ''}
            onChange={handleValueChange}
            disabled={saving}
            placeholder="값을 입력하세요"
          />
        )
    }
  }

  // 카테고리별 설정 카드 렌더링
  const renderCategoryCard = (category, configs) => {
    const categoryNames = {
      api_keys: 'API Keys',
      api: 'API Settings',
      scheduler: 'Scheduler',
      features: 'Features',
      limits: 'Limits',
      database: 'Database',
      logging: 'Logging',
      general: 'General Settings',
    }

    const categoryName = categoryNames[category] || category

    return (
      <CCol xs={12} key={category}>
        <CCard className="mb-4">
          <CCardHeader>
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <h5 className="mb-0 me-2">{categoryName}</h5>
                <CBadge color="info" className="me-2">
                  {configs.length}개
                </CBadge>
              </div>
            </div>
          </CCardHeader>
          <CCardBody>
            {configs.map((config) => (
              <div key={config.config_key} className="mb-3 p-3 border rounded">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <strong>{config.config_key}</strong>
                    {config.description && (
                      <div className="text-muted small mt-1">{config.description}</div>
                    )}
                  </div>
                  <div className="text-end">
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">Type: {config.data_type}</small>
                      <small
                        className={`ms-2 ${config.is_active ? 'text-success' : 'text-danger'}`}
                      >
                        {config.is_active ? 'Active' : 'Inactive'}
                      </small>
                    </div>
                    {/* 스케줄러 재시작이 필요한 설정 표시 */}
                    {[
                      'DATA_COLLECTION_INTERVAL_MINUTES',
                      'ENABLE_AUTO_SEEDING_AND_COLLECTION',
                      'BGEO_UPDATE_INTERVAL_HOURS',
                    ].includes(config.config_key) && (
                      <small className="text-warning d-block mt-1">
                        ⚠️ Scheduler restart required
                      </small>
                    )}
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1 me-2">{renderInputField(config)}</div>
                </div>
              </div>
            ))}
          </CCardBody>
        </CCard>
      </CCol>
    )
  }

  if (!configurations || configurations.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted">설정을 불러오는 중...</p>
      </div>
    )
  }

  return (
    <CRow>
      {Object.entries(groupedConfigurations).map(([category, configs]) =>
        renderCategoryCard(category, configs),
      )}
    </CRow>
  )
}

export default ConfigForm
