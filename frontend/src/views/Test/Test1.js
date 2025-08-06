import React from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import OHLCVTable from '../../components/tables/OHLCVTable'
import { useAssetData } from '../../hooks/useAssetData'

const Test1 = () => {
  // 디버깅을 위해 직접 훅 사용
  const { 
    asset, 
    ohlcvData, 
    loading, 
    error, 
    isSuccess 
  } = useAssetData(5, '1d', 1000) // MSFT, 기본 인터벌 1d, 기본 limit 1000

  console.log('🔍 Test1 Debug:', {
    assetId: 5,
    asset,
    ohlcvData: ohlcvData?.slice(0, 3), // 처음 3개만 로그
    loading,
    error,
    isSuccess,
    dataLength: ohlcvData?.length
  })

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Test 1 - MSFT OHLCV Table (asset_id=5)</strong>
          </CCardHeader>
          <CCardBody>
            <p>This is Test 1 page with OHLCVTable component showing MSFT historical data.</p>
            
            {/* 디버깅 정보 표시 */}
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              border: '1px solid #dee2e6', 
              borderRadius: '4px', 
              marginBottom: '20px',
              fontSize: '12px'
            }}>
              <strong>Debug Info:</strong><br/>
              Asset: {asset?.name || 'Loading...'}<br/>
              Loading: {loading ? 'Yes' : 'No'}<br/>
              Error: {error ? error.message : 'None'}<br/>
              Data Count: {ohlcvData?.length || 0}<br/>
              Success: {isSuccess ? 'Yes' : 'No'}
            </div>

            {/* OHLCVTable 직접 사용 */}
            <OHLCVTable 
              assetId={5} // MSFT
              showVolume={true}
              showChangePercent={true}
              height={600}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Test1 