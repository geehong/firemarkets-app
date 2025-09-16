import React from 'react';
import { CContainer, CRow, CCol } from '@coreui/react';
import OpenInterestChart from '../../components/charts/openinterestchart/OpenInterestChart';

const OpenInterest = () => {
  return (
    <CContainer fluid>
      <CRow>
        <CCol>
          <h2 className="mb-4">Open Interest Futures Analysis</h2>
          <p className="text-muted mb-4">
            비트코인 선물 시장의 Open Interest 데이터를 분석합니다. 
            총 Open Interest, 거래소별 분포, 레버리지 분석을 확인할 수 있습니다.
          </p>
        </CCol>
      </CRow>

      {/* Open Interest Chart */}
      <CRow>
        <CCol>
          <OpenInterestChart 
            title="Open Interest Futures Analysis"
            height={600}
          />
        </CCol>
      </CRow>

      {/* 추가 정보 섹션 */}
      <CRow className="mt-4">
        <CCol>
          <div className="card">
            <div className="card-header">
              <h5>Open Interest 분석 정보</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <h6>총 Open Interest</h6>
                  <p className="text-muted">
                    모든 거래소의 Open Interest 합계를 보여줍니다. 
                    시장의 전반적인 레버리지 수준을 파악할 수 있습니다.
                  </p>
                </div>
                <div className="col-md-4">
                  <h6>거래소별 분포</h6>
                  <p className="text-muted">
                    각 거래소별 Open Interest 분포를 스택 영역 차트로 표시합니다. 
                    시장 집중도와 거래소별 점유율을 확인할 수 있습니다.
                  </p>
                </div>
                <div className="col-md-4">
                  <h6>레버리지 분석</h6>
                  <p className="text-muted">
                    Open Interest와 시가총액의 비율을 계산하여 레버리지 수준을 분석합니다. 
                    높은 레버리지는 시장 위험을 나타낼 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default OpenInterest;
