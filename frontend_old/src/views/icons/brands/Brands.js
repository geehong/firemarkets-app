import React from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
// 전체 brandSet 대신 필요한 아이콘만 개별 import
import { DocsIcons } from 'src/components'

const toKebabCase = (str) => {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
}

export const getIconsView = (iconset) => {
  return Object.entries(iconset).map(([name, value]) => (
    <CCol className="mb-5" xs={6} sm={4} md={3} xl={2} key={name}>
      <CIcon icon={value} size="xxl" />
      <div>{toKebabCase(name)}</div>
    </CCol>
  ))
}

const CoreUIIcons = () => {
  return (
    <>
      <DocsIcons />
      <CCard className="mb-4">
        <CCardHeader>Brand Icons</CCardHeader>
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

export default CoreUIIcons
