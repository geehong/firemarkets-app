import React, { useState } from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import TickerTableAgGrid from '../../components/admin/ticker/TickerTableAgGrid'
import { useTickerMutations } from '../../hooks/useTickerMutations'

const Test4 = () => {
  const [selectedAssetType, setSelectedAssetType] = useState('Stocks')

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Test 4 - Ticker Table (AG Grid)</strong>
          </CCardHeader>
          <CCardBody>
            <TickerTableAgGrid 
              assetType={selectedAssetType}
              pendingChanges={{}}
              onSettingChange={() => {}}
              onExecute={() => {}}
              onDelete={() => {}}
              searchTerm=""
              onSearchChange={() => {}}
              isExecuting={false}
              executingTickers={[]}
              onExecutePerAsset={() => {}}
              onBulkSave={() => {}}
              isBulkUpdatingSettings={false}
              height={600}
              onAssetTypeChange={setSelectedAssetType}
              isTabActive={true}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Test4 