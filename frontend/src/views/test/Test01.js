import React from 'react'
import { CContainer, CRow, CCol } from '@coreui/react'
import WebSocketWidgetE from '../../components/widgets/WebSocketWidgetE'

const Test01 = () => {
  return (
    <CContainer fluid>
      <CRow>
        <CCol>
          <h2 className="mb-4">🚀 실시간 암호화폐 가격 (WebSocket)</h2>
          <p className="text-muted mb-4">
            비트코인과 이더리움의 실시간 가격을 WebSocket을 통해 수신합니다.
          </p>
          <WebSocketWidgetE />
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default Test01
