import React from 'react'
import { CCard, CCardBody, CCardHeader, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
// 전체 flagSet 대신 필요한 아이콘만 개별 import
import { DocsIcons } from 'src/components'

const Flags = () => {
  return (
    <>
      <DocsIcons />
      <CCard className="mb-4">
        <CCardHeader>Flag Icons</CCardHeader>
        <CCardBody>
          <CRow className="text-center">
            {/* 전체 아이콘 세트 대신 필요한 아이콘만 표시 */}
            <div className="text-muted">아이콘 갤러리는 성능 최적화를 위해 제거되었습니다.</div>
          </CRow>
        </CCardBody>
      </CCard>
    </>
  )
}

export default Flags
