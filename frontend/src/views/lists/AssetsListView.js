import React from 'react'
import { CContainer, CRow, CCol } from '@coreui/react'
import AssetsList from '../../components/lists/AssetsList'

const AssetsListView = () => {
  return (
    <CContainer fluid>
      <CRow>
        <CCol>
          <AssetsList />
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default AssetsListView
