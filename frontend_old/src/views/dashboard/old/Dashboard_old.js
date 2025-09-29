// frontend/src/views/dashboard/Dashboard.js
import React, { useState, useEffect } from 'react' // React 훅 임포트
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CButton,
  CButtonGroup, // <<--- 이 부분을 추가합니다.
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilChartLine } from '@coreui/icons' // 필요한 아이콘만 남김 (예시)

// 필요 없는 로컬 임포트 제거
// import classNames from 'classnames'
// import avatar1 from 'src/assets/images/avatars/1.jpg'
// ... (모든 avatar, WidgetsBrand, WidgetsDropdown, MainChart 임포트 제거)

const Dashboard = () => {
  // 하드코딩된 더미 데이터와 관련된 모든 변수 제거
  // const progressExample = [...]
  // const progressGroupExample1 = [...]
  // const progressGroupExample2 = [...]
  // const progressGroupExample3 = [...]
  // const tableExample = [...]

  // 여기에 대시보드에 표시할 실제 데이터 상태를 정의할 수 있습니다.
  const [summaryData, setSummaryData] = useState(null) // 시장 요약 데이터
  const [topAssets, setTopAssets] = useState([]) // 주요 자산 목록

  useEffect(() => {
    // 여기에 백엔드 API로부터 데이터를 가져오는 로직을 구현합니다.
    // 예시:
    // const fetchDashboardData = async () => {
    //   try {
    //     const summaryResponse = await axios.get('/api/dashboard-summary');
    //     setSummaryData(summaryResponse.data);
    //
    //     const topAssetsResponse = await axios.get('/api/top-assets');
    //     setTopAssets(topAssetsResponse.data.data); // 페이지네이션된 데이터라면 .data.data
    //   } catch (error) {
    //     console.error("대시보드 데이터를 불러오는데 실패했습니다:", error);
    //   }
    // };
    // fetchDashboardData();
  }, [])

  return (
    <>
      {/* 1. 핵심 시장 요약 위젯 섹션 (WidgetsDropdown 대체) */}
      <CRow className="mb-4">
        <CCol xs={12}>
          <CCard>
            <CCardHeader>시장 개요</CCardHeader>
            <CCardBody>
              {/* 여기에 총 시가총액, 24시간 거래량 변화 등 주요 숫자 위젯을 배치 */}
              <p>총 시가총액: {summaryData ? summaryData.totalMarketCap : '로딩 중...'}</p>
              <p>24시간 거래량: {summaryData ? summaryData.dailyVolume : '로딩 중...'}</p>
              {/* 실제 데이터가 들어갈 자리 */}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* 2. 주요 시장 지표 차트 섹션 (MainChart 대체) */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow>
            <CCol sm={5}>
              <h4 id="market-trends" className="card-title mb-0">
                주요 시장 동향
              </h4>
              <div className="small text-body-secondary">기간별 지표 추이</div>
            </CCol>
            <CCol sm={7} className="d-none d-md-block">
              <CButton color="primary" className="float-end">
                <CIcon icon={cilCloudDownload} /> 다운로드
              </CButton>
              {/* 시간 단위 버튼 그룹 (Day, Month, Year) */}
              <CButtonGroup className="float-end me-3">
                {['일', '주', '월', '년'].map((value) => (
                  <CButton
                    color="outline-secondary"
                    key={value}
                    className="mx-0"
                    active={value === '월'} // 초기 선택
                  >
                    {value}
                  </CButton>
                ))}
              </CButtonGroup>
            </CCol>
          </CRow>
          {/* 여기에 전체 시장 시가총액 차트 또는 주요 자산군 수익률 차트가 들어갈 자리 */}
          <div
            style={{
              height: '300px',
              backgroundColor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <p className="text-body-secondary">시장 지표 차트 영역</p>
          </div>
        </CCardBody>
      </CCard>

      {/* 3. 주요 자산 또는 주목할 만한 자산 목록 (Traffic & Sales 테이블 대체) */}
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>주요 자산 목록</CCardHeader>
            <CCardBody>
              <CTable align="middle" className="mb-0 border" hover responsive>
                <CTableHead className="text-nowrap">
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary">티커</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">이름</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">유형</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">현재가</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">변화율 (24h)</CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary">거래량 (24h)</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {/* topAssets 데이터를 매핑하여 여기에 표시 */}
                  {topAssets.length > 0 ? (
                    topAssets.map((item, index) => (
                      <CTableRow key={index}>
                        <CTableDataCell>{item.ticker}</CTableDataCell>
                        <CTableDataCell>{item.name}</CTableDataCell>
                        <CTableDataCell>{item.type_name}</CTableDataCell>
                        <CTableDataCell>데이터 없음</CTableDataCell>{' '}
                        {/* 실제 가격 데이터 연동 필요 */}
                        <CTableDataCell>데이터 없음</CTableDataCell>{' '}
                        {/* 실제 변화율 데이터 연동 필요 */}
                        <CTableDataCell>데이터 없음</CTableDataCell>{' '}
                        {/* 실제 거래량 데이터 연동 필요 */}
                      </CTableRow>
                    ))
                  ) : (
                    <CTableRow>
                      <CTableDataCell colSpan="6" className="text-center">
                        주요 자산 데이터를 불러오는 중...
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>
              {/* React Table을 여기에 통합할 수도 있습니다. */}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Dashboard
