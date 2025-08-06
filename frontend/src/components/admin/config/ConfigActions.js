import React from 'react'
import { CButton, CButtonGroup } from '@coreui/react'

const ConfigActions = ({
  onSave,
  onReset,
  onTest,
  onExport,
  onImport,
  isSaving = false,
  isTesting = false,
}) => {
  return (
    <div className="d-flex justify-content-between align-items-center">
      <CButtonGroup>
        <CButton color="primary" onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </CButton>

        <CButton color="secondary" onClick={onReset}>
          Reset to Default
        </CButton>

        <CButton color="info" onClick={onTest} disabled={isTesting}>
          {isTesting ? 'Testing...' : 'Test Connection'}
        </CButton>
      </CButtonGroup>

      <CButtonGroup>
        <CButton color="outline-primary" onClick={onExport}>
          Export Config
        </CButton>

        <CButton color="outline-secondary" onClick={onImport}>
          Import Config
        </CButton>
      </CButtonGroup>
    </div>
  )
}

export default ConfigActions
