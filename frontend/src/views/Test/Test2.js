import React, { useMemo } from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import HistoryTableAgGrid from '../../components/tables/HistoryTableAgGrid'
import { useOnChain } from '../../hooks/useOnChain'

const Test2 = () => {
  // 온체인 데이터 로드
  const { 
    metrics, 
    loading, 
    error 
  } = useOnChain()

  // 온체인 데이터를 AG Grid 형식으로 변환
  const processedData = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];

    return metrics.map((metric) => ({
      Date: new Date().toISOString(), // 현재 날짜 (실제로는 메트릭 데이터의 날짜 사용)
      Value: metric.value || 0,
      Metric_Name: metric.metric_name || metric.name || 'Unknown',
      Category: metric.category || 'Unknown',
      Is_Enabled: metric.is_enabled ? 'Yes' : 'No',
      Description: metric.description || ''
    }));
  }, [metrics]);

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Test 2 - OnChain Metrics Table</strong>
          </CCardHeader>
          <CCardBody>
            <p>This is Test 2 page with AG Grid table showing OnChain metrics data.</p>
            <HistoryTableAgGrid 
              data={processedData}
              dataType="onchain"
              loading={loading}
              error={error}
              loadingMessage="Loading OnChain metrics..."
              errorMessage="Failed to load OnChain metrics"
              height={600}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Test2 