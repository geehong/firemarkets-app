'use client'
import React from 'react'
import OHLCVTable from './OHLCVTable'

/**
 * HistoryTable - 기존 인터페이스를 유지하면서 OHLCVTable을 사용하는 래퍼 컴포넌트
 * @param {Object} props
 * @param {Object} props.asset - 자산 정보
 * @param {Array} props.historyData - 히스토리 데이터 (사용하지 않음, OHLCVTable에서 자동 로드)
 */
const HistoryTable = ({ asset, historyData }) => {
  // assetId 추출 - 여러 가능한 필드 확인
  const assetId = asset?.asset_id || asset?.id || asset?.assetId || null

  console.log('🔍 HistoryTable Debug:', {
    asset,
    assetId,
    assetIdFromAsset: asset?.asset_id,
    assetIdFromId: asset?.id,
    assetIdFromAssetId: asset?.assetId
  })

  if (!assetId) {
    console.log('🔍 HistoryTable: No assetId found, showing error');
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div
          style={{
            padding: '15px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            color: '#6c757d',
            fontSize: '.875rem',
            fontWeight: 400,
          }}
        >
          Asset ID not found. Cannot load historical data.
          <br />
          <small>Asset object: {JSON.stringify(asset, null, 2)}</small>
        </div>
      </div>
    )
  }

  console.log('🔍 HistoryTable: Passing assetId to OHLCVTable:', assetId);

  return (
    <OHLCVTable 
      assetId={assetId}
      showVolume={true}
      showChangePercent={true}
      height={500}
    />
  )
}

export default HistoryTable
