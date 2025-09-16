import React, { useState } from 'react'
import { useTreeMapData } from '../../hooks/useTreeMapData'
import TreeMapChart from '../../components/charts/TreeMapChart'
import TreeMapLegend from '../../components/charts/TreeMapLegend'
import CardTools from '../../components/common/CardTools'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CRow,
  CSpinner,
  CAlert,
  CCardTitle,
  CCardSubtitle,
} from '@coreui/react'
import '../../components/common/CardTools.css'

const TreeMapPage = () => {
  const [viewType] = useState('category')
  const [filters] = useState({
    category: 'all',
    country: 'all',
    sector: 'all',
  })
  const [searchTerm] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)

  const { data, loading, error } = useTreeMapData()

  // console.log('TreeMapPage - data length:', data?.length, 'loading:', loading, 'error:', error)

  const handleCardAction = (action) => {
    switch (action) {
      case 'refresh':
        window.location.reload()
        break
      case 'settings':
        // console.log('Settings clicked')
        break
      case 'export':
        // console.log('Export clicked')
        break
      case 'fullscreen':
        const chart = document.querySelector('.highcharts-container')
        if (chart) {
          chart.requestFullscreen?.() ||
            chart.webkitRequestFullscreen?.() ||
            chart.mozRequestFullScreen?.() ||
            chart.msRequestFullscreen?.()
        }
        break
      case 'download-png':
        // Highcharts export functionality
        const highchartsChart = window.Highcharts?.charts?.[0]
        if (highchartsChart) {
          highchartsChart.exportChart()
        }
        break
      case 'download-pdf':
        // Highcharts PDF export
        const chartForPdf = window.Highcharts?.charts?.[0]
        if (chartForPdf) {
          chartForPdf.exportChart({
            type: 'application/pdf',
          })
        }
        break
      default:
        console.log('Action:', action)
    }
  }

  const handleCollapse = (collapsed) => {
    setIsCollapsed(collapsed)
  }

  if (loading) {
    return (
      <CContainer fluid>
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ height: '600px' }}
        >
          <CSpinner />
        </div>
      </CContainer>
    )
  }

  if (error) {
    return (
      <CContainer fluid>
        <CAlert color="danger">Error loading data: {error}</CAlert>
      </CContainer>
    )
  }

  return (
    <CContainer fluid>
      <CRow>
        <CCol xs={12}>
          <CCard className={isCollapsed ? 'collapsed' : ''}>
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <CCardTitle className="mb-1">World Assets TreeMap</CCardTitle>
                <CCardSubtitle className="text-medium-emphasis">
                  Interactive visualization of global financial assets by market capitalization
                </CCardSubtitle>
              </div>
              <CardTools
                showCollapse={true}
                showRemove={false}
                showRefresh={true}
                showExport={true}
                onCollapse={handleCollapse}
                onAction={handleCardAction}
                dropdownItems={[
                  { label: 'Fullscreen', action: 'fullscreen', icon: null },
                  { label: 'Download PNG', action: 'download-png', icon: null },
                  { label: 'Download PDF', action: 'download-pdf', icon: null },
                ]}
              />
            </CCardHeader>
            <div className="p-3">
              <TreeMapLegend data={data} viewType={viewType} />
            </div>
            <CCardBody>
              <TreeMapChart
                data={data}
                viewType={viewType}
                filters={filters}
                searchTerm={searchTerm}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  )
}

export default TreeMapPage
