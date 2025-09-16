import React from 'react'
import { CFormSwitch, CTooltip } from '@coreui/react'
import { TICKER_SETTING_DEFS } from '../../../constants/tickerSettings'

const GenericCollectionSettings = ({ assetType, settings, onChange, disabled = false }) => {
  const settingDefs = TICKER_SETTING_DEFS[assetType] || []

  const handleSettingChange = (key, value) => {
    if (onChange) {
      onChange(key, value)
    }
  }

  return (
    <div className="d-flex flex-wrap" style={{ gap: '1rem' }}>
      {settingDefs.map((setting) => (
        <CTooltip content={setting.description} key={setting.key}>
          <CFormSwitch
            id={`${assetType}-${setting.key}`}
            label={setting.label}
            checked={settings?.[setting.key] ?? setting.default}
            onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
            disabled={disabled}
            className="small"
          />
        </CTooltip>
      ))}
    </div>
  )
}

export default GenericCollectionSettings
