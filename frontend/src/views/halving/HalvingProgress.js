import React from 'react';
import { CCard, CCardBody, CCardHeader } from '@coreui/react';
import CardTools from '../../components/common/CardTools';

const HalvingProgress = () => {
  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Halving Progress Tracking</h5>
        <CardTools />
      </CCardHeader>
      <CCardBody>
        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
          <div className="text-center">
            <h4>🚧 Coming Soon</h4>
            <p className="text-muted">Halving Progress Tracking is under development</p>
            <p className="text-muted">비트코인 반감기 진행률 추적 기능이 개발 중입니다</p>
          </div>
        </div>
      </CCardBody>
    </CCard>
  );
};

export default HalvingProgress;
