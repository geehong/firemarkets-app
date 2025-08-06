import React from 'react'
import { CFormCheck, CFormInput, CFormSelect, CCard, CCardBody } from '@coreui/react'

const MetricToggle = ({ metric, metricKey, onToggle, onConfigChange }) => {
  const handleToggle = (enabled) => {
    onToggle(metricKey, enabled)
  }

  const handleConfigChange = (field, value) => {
    onConfigChange(metricKey, { ...metric, [field]: value })
  }

  return (
    <CCard className="mb-3">
      <CCardBody>
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-grow-1">
            <CFormCheck
              id={metricKey}
              label={metric.name || metricKey}
              checked={metric.enabled || false}
              onChange={(e) => handleToggle(e.target.checked)}
            />

            {metric.description && (
              <small className="text-muted d-block mt-1">{metric.description}</small>
            )}
          </div>

          {metric.enabled && (
            <div className="ms-3">
              {metric.hasInterval && (
                <CFormSelect
                  size="sm"
                  className="mb-2"
                  value={metric.interval || '1h'}
                  onChange={(e) => handleConfigChange('interval', e.target.value)}
                >
                  <option value="1h">1 Hour</option>
                  <option value="6h">6 Hours</option>
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                </CFormSelect>
              )}

              {metric.hasThreshold && (
                <CFormInput
                  size="sm"
                  type="number"
                  placeholder="Threshold"
                  value={metric.threshold || ''}
                  onChange={(e) => handleConfigChange('threshold', e.target.value)}
                />
              )}
            </div>
          )}
        </div>

        {metric.enabled && metric.lastValue && (
          <div className="mt-2">
            <small className="text-muted">
              Last Value: {metric.lastValue}
              {metric.lastUpdated && (
                <span className="ms-2">({new Date(metric.lastUpdated).toLocaleString()})</span>
              )}
            </small>
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default MetricToggle
