import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CSpinner,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilWarning } from '@coreui/icons'

const DeleteTickerModal = ({ visible, onClose, ticker, onConfirmDelete, isDeleting }) => {
  if (!ticker) return null

  return (
    <CModal visible={visible} onClose={onClose}>
      <CModalHeader>
        <CModalTitle>
          <CIcon icon={cilWarning} className="text-danger me-2" />
          티커 삭제 확인
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p>
          <strong>
            {ticker.name} ({ticker.ticker})
          </strong>{' '}
          티커를 정말로 삭제하시겠습니까?
        </p>
        <CAlert color="danger">
          이 작업은 되돌릴 수 없으며, 관련된 모든 데이터(가격, 재무, 온체인 등)가 영구적으로
          삭제됩니다.
        </CAlert>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose} disabled={isDeleting}>
          취소
        </CButton>
        <CButton color="danger" onClick={onConfirmDelete} disabled={isDeleting}>
          {isDeleting ? <CSpinner size="sm" /> : '삭제'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default DeleteTickerModal
