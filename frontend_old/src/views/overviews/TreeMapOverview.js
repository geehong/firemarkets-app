import React, { useEffect } from 'react'
import PerformanceTreeMap from '../../components/charts/PerformanceTreeMap'

const TreeMapOverview = () => {
  // TreeMap 페이지에서는 CustomBreadcrumb를 숨김
  useEffect(() => {
    const breadcrumbElement = document.querySelector('.container-fluid.px-4.pt-3')
    if (breadcrumbElement) {
      breadcrumbElement.style.display = 'none'
    }

    return () => {
      if (breadcrumbElement) {
        breadcrumbElement.style.display = 'block'
      }
    }
  }, [])

  return (
    <div className="container-lg my-4">
      <PerformanceTreeMap />
    </div>
  )
}

export default TreeMapOverview
