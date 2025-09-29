import React from 'react'
import { CCard, CCardHeader, CCardBody, CCardTitle } from '@coreui/react'

const ConfigSection = ({ title, children, icon }) => {
  return (
    <CCard className="mb-4">
      <CCardHeader>
        <CCardTitle className="d-flex align-items-center">
          {icon && <span className="me-2">{icon}</span>}
          {title}
        </CCardTitle>
      </CCardHeader>
      <CCardBody>{children}</CCardBody>
    </CCard>
  )
}

export default ConfigSection
