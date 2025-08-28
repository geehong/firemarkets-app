import React, { useState } from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import TickerTableReactTable from '../../components/admin/ticker/temp/TickerTableReactTable'

const Test5 = () => {
  const [selectedAssetType, setSelectedAssetType] = useState('Stocks')

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Test 5 - Ticker Table</strong>
          </CCardHeader>
          <CCardBody>
            <TickerTableReactTable 
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
              onAssetTypeChange={setSelectedAssetType}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Test5 