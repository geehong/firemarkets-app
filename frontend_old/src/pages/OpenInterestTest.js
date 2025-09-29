import React from 'react';
import { CContainer, CRow, CCol } from '@coreui/react';
import OpenInterestChart from '../components/charts/openinterestchart/OpenInterestChart';

const OpenInterestTest = () => {
  return (
    <CContainer fluid>
      <CRow>
        <CCol>
          <h2 className="mb-4">Open Interest Futures Analysis</h2>
          <p className="text-muted mb-4">
            비트코인 선물 시장의 Open Interest 데이터를 분석합니다.
          </p>
        </CCol>
      </CRow>
      
      <CRow>
        <CCol>
          <OpenInterestChart 
            title="Open Interest Futures Analysis"
            height={600}
            chartType="total"
          />
        </CCol>
      </CRow>
      
      <CRow className="mt-4">
        <CCol>
          <OpenInterestChart 
            title="거래소별 Open Interest 분포"
            height={500}
            chartType="exchanges"
          />
        </CCol>
      </CRow>
      
      <CRow className="mt-4">
        <CCol>
          <OpenInterestChart 
            title="레버리지 분석"
            height={500}
            chartType="leverage"
          />
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default OpenInterestTest;












