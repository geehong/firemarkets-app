import React from 'react';
import { CCard, CCardBody, CCardHeader, CSpinner, CAlert } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilArrowTop, cilArrowBottom } from '@coreui/icons';
import useRealtimePrices from '../../hooks/useRealtimePrices';
import CardTools from '../common/CardTools';
import '../common/CardTools.css';

const RealtimePriceWidget = ({
  title = 'Real Time Prices',
  symbols = [],
  assetType = 'crypto',
  limit = 8,
  showProgress = true,
  colorPattern = ['primary', 'info'],
  onDataLoad,
  onError,
  className = '',
  isCollapsible = true,
  isRemovable = false,
}) => {
  const { data: prices, isLoading, isError, error } = useRealtimePrices(symbols, assetType);

  // 가격 포맷팅 함수
  const formatPrice = (price) => {
    if (!price) return 'N/A';
    
    if (assetType === 'crypto') {
      // 암호화폐는 소수점 2자리까지 표시
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
    } else {
      // 주식은 소수점 2자리까지 표시
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
    }
  };

  // 변화율 계산 (이전 가격과 비교)
  const getChangeIndicator = (symbol) => {
    // 실제 구현에서는 이전 가격 데이터가 필요하지만, 
    // 현재는 단순히 랜덤하게 표시 (실제로는 API에서 변화율을 받아와야 함)
    const change = Math.random() * 10 - 5; // -5% ~ +5% 랜덤
    return {
      value: change,
      isPositive: change > 0,
      icon: change > 0 ? cilArrowTop : cilArrowBottom,
      color: change > 0 ? 'success' : 'danger'
    };
  };

  // 데이터 로드 콜백
  React.useEffect(() => {
    if (prices && onDataLoad) {
      onDataLoad(prices);
    }
  }, [prices, onDataLoad]);

  // 에러 콜백
  React.useEffect(() => {
    if (isError && onError) {
      onError(error);
    }
  }, [isError, error, onError]);

  return (
    <CCard className={`mb-4 ${className}`}>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">{title}</h5>
          <small className="text-muted">
            {assetType === 'crypto' ? 'Binance' : 'Yahoo Finance'} • 
            {assetType === 'crypto' ? '10초' : '5분'}마다 업데이트
          </small>
        </div>
        {(isCollapsible || isRemovable) && (
          <CardTools
            isCollapsible={isCollapsible}
            isRemovable={isRemovable}
          />
        )}
      </CCardHeader>
      <CCardBody>
        {isLoading && (
          <div className="text-center py-4">
            <CSpinner size="sm" />
            <div className="mt-2 text-muted">실시간 가격을 불러오는 중...</div>
          </div>
        )}

        {isError && (
          <CAlert color="danger">
            <strong>오류 발생:</strong> {error?.message || '실시간 가격을 불러올 수 없습니다.'}
          </CAlert>
        )}

        {prices && Object.keys(prices).length > 0 && (
          <div className="row g-3">
            {symbols.slice(0, limit).map((symbol, index) => {
              const price = prices[symbol.toUpperCase()];
              const change = getChangeIndicator(symbol);
              
              return (
                <div key={symbol} className="col-12 col-sm-6 col-md-4 col-lg-3">
                  <div className="d-flex justify-content-between align-items-center p-3 border rounded">
                    <div>
                      <div className="fw-bold">{symbol.toUpperCase()}</div>
                      <div className="text-muted small">
                        {assetType === 'crypto' ? 'Cryptocurrency' : 'Stock'}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold">
                        {formatPrice(price)}
                      </div>
                      {change && (
                        <div className={`small d-flex align-items-center justify-content-end ${change.isPositive ? 'text-success' : 'text-danger'}`}>
                          <CIcon icon={change.icon} size="sm" className="me-1" />
                          {change.isPositive ? '+' : ''}{change.value.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {prices && Object.keys(prices).length === 0 && !isLoading && (
          <div className="text-center py-4 text-muted">
            가격 데이터가 없습니다.
          </div>
        )}
      </CCardBody>
    </CCard>
  );
};

export default RealtimePriceWidget;
