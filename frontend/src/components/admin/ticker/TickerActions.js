import React from 'react'
import { CButton, CButtonGroup, CTooltip } from '@coreui/react'

const TickerActions = ({ ticker, onExecute, onDelete, isExecuting = false }) => {
  return (
    <CButtonGroup role="group" aria-label="Ticker Actions">
      <CTooltip content="이 티커의 데이터 수집을 즉시 실행합니다.">
        <CButton
          color="success"
          variant="outline"
          size="sm"
          onClick={() => onExecute(ticker)}
          disabled={isExecuting}
          aria-label={`${ticker.ticker} 데이터 수집 실행`}
        >
          ▶
        </CButton>
      </CTooltip>
      <CTooltip content="이 티커와 관련된 모든 데이터를 삭제합니다.">
        <CButton
          color="danger"
          variant="outline"
          size="sm"
          onClick={() => onDelete(ticker)}
          disabled={isExecuting}
          aria-label={`${ticker.ticker} 삭제`}
        >
          🗑
        </CButton>
      </CTooltip>
    </CButtonGroup>
  )
}

export default TickerActions
