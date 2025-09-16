import React from 'react'
import { CAlert, CButton } from '@coreui/react'

export const AdminAlert = ({ alert, onDismiss }) => {
  if (!alert) return null

  return (
    <CAlert color={alert.type} dismissible onClose={onDismiss} className="mb-3">
      <div className="d-flex justify-content-between align-items-start">
        <div className="flex-grow-1">{alert.message}</div>
        {alert.action && (
          <CButton
            color={alert.action.color || 'primary'}
            size="sm"
            onClick={alert.action.onClick}
            className="ms-3"
          >
            {alert.action.label}
          </CButton>
        )}
      </div>
    </CAlert>
  )
}
