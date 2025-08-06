import React, { useState, useEffect } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormInput,
  CFormSelect,
  CSpinner,
  CAlert,
  CRow,
  CCol,
} from '@coreui/react'
import { tickerAPI } from '../../../services/tickerAPI'
import { DATA_SOURCES, DATA_SOURCE_LABELS } from '../../../constants/tickerSettings'

const AddTickerModal = ({ visible, onClose, assetTypes, onAdd, isSaving }) => {
  const initialState = {
    ticker: '',
    name: '',
    asset_type_id: '',
    data_source: DATA_SOURCES.FMP, // 기본값 설정
  }
  const [newTicker, setNewTicker] = useState(initialState)
  const [validation, setValidation] = useState({ status: 'idle', message: '' }) // idle, validating, success, error

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!visible) {
      setNewTicker(initialState)
      setValidation({ status: 'idle', message: '' })
    }
  }, [visible])

  // 티커 또는 데이터 소스가 변경되면 유효성 검사 결과 초기화
  useEffect(() => {
    setValidation({ status: 'idle', message: '' })
  }, [newTicker.ticker, newTicker.data_source])

  const handleValidate = async () => {
    if (!newTicker.ticker || !newTicker.data_source) return
    setValidation({ status: 'validating', message: '검증 중...' })
    try {
      const result = await tickerAPI.validateTicker(newTicker.ticker, newTicker.data_source)
      if (result.is_valid) {
        setValidation({ status: 'success', message: result.message })
      } else {
        setValidation({ status: 'error', message: result.message })
      }
    } catch (error) {
      setValidation({ status: 'error', message: '티커 검증 중 오류가 발생했습니다.' })
    }
  }

  const handleAddClick = () => {
    // 부모 컴포넌트로 최종 데이터 전달
    onAdd(newTicker)
  }

  const isAddButtonDisabled =
    isSaving ||
    !newTicker.ticker ||
    !newTicker.name ||
    !newTicker.asset_type_id ||
    validation.status !== 'success'

  return (
    <CModal size="lg" visible={visible} onClose={onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>새 티커 추가</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CRow className="g-3">
          <CCol md={6}>
            <CFormInput
              label="티커 *"
              value={newTicker.ticker}
              onChange={(e) =>
                setNewTicker((prev) => ({ ...prev, ticker: e.target.value.toUpperCase() }))
              }
              placeholder="예: AAPL, BTCUSDT"
            />
          </CCol>
          <CCol md={6}>
            <CFormSelect
              label="자산 타입 *"
              value={newTicker.asset_type_id}
              onChange={(e) => setNewTicker((prev) => ({ ...prev, asset_type_id: e.target.value }))}
            >
              <option value="">선택하세요...</option>
              {assetTypes.map((type) => (
                <option key={type.asset_type_id} value={type.asset_type_id}>
                  {type.type_name}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={12}>
            <CFormInput
              label="이름 *"
              value={newTicker.name}
              onChange={(e) => setNewTicker((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="예: Apple Inc., Bitcoin"
            />
          </CCol>
          <CCol md={6}>
            <CFormSelect
              label="기본 데이터 소스"
              value={newTicker.data_source}
              onChange={(e) => setNewTicker((prev) => ({ ...prev, data_source: e.target.value }))}
            >
              {Object.entries(DATA_SOURCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol md={6} className="d-flex align-items-end">
            <div className="w-100">
              <CButton
                color="info"
                variant="outline"
                onClick={handleValidate}
                disabled={validation.status === 'validating'}
              >
                {validation.status === 'validating' ? <CSpinner size="sm" /> : '티커 유효성 검사'}
              </CButton>
            </div>
          </CCol>
          {validation.status !== 'idle' && (
            <CCol xs={12}>
              <CAlert
                color={validation.status === 'success' ? 'success' : 'danger'}
                className="mt-2 mb-0 py-2"
              >
                {validation.message}
              </CAlert>
            </CCol>
          )}
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose} disabled={isSaving}>
          취소
        </CButton>
        <CButton color="primary" onClick={handleAddClick} disabled={isAddButtonDisabled}>
          {isSaving ? <CSpinner size="sm" /> : '추가'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default AddTickerModal
