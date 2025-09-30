import React from 'react'
import { CContainer, CRow, CCol } from '@coreui/react'
import CWidgetStatsEWebSocket from '../../components/widgets/CWidgetStatsEWebSocket'

const Test01 = () => {
  return (
    <CContainer fluid>
      <CRow>
        <CCol>
          <h2 className="mb-4">🧪 WebSocket 실시간 데이터 테스트</h2>
          <CWidgetStatsEWebSocket />
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default Test01
