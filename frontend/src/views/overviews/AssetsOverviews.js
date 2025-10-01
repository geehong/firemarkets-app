import React from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import AssetOverview from '../../components/overviews/AssetOverview'
import AssetsList from '../../components/lists/AssetsList'

/**
 * 자산 개요 메인 뷰 컴포넌트
 * 단순화된 구조로 AssetOverview 컴포넌트를 사용
 */
const AssetsOverviews = () => {
  const { assetId } = useParams()
  const [searchParams] = useSearchParams()
  const typeName = searchParams.get('type_name')

  // type_name이 있는 경우 자산 목록을 표시
  if (typeName && !assetId) {
    return (
      <div className="container-fluid px-0 px-sm-2 px-md-3 px-lg-4 my-2 my-sm-3 my-md-4">
        <div className="row g-2 g-sm-3 g-md-4">
          <div className="col-lg-12">
            <h2>{typeName} Overview</h2>
            <p>Select an asset from the list below to view detailed information.</p>
          </div>
          <div className="col-lg-12">
            <AssetsList />
          </div>
        </div>
      </div>
    )
  }

  // assetId가 있는 경우 개별 자산 상세 정보를 표시
  return (
    <div className="container-fluid px-0 px-sm-2 px-md-3 px-lg-4 my-2 my-sm-3 my-md-4">
      <div className="row g-2 g-sm-3 g-md-4">
        {/* 통합된 자산 개요 컴포넌트 */}
        <div className="col-12">
          <AssetOverview />
        </div>
      </div>
    </div>
  )
}

export default AssetsOverviews
