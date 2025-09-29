import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardTitle,
  CButton,
  CButtonGroup,
  CFormSwitch,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CAlert,
  CSpinner,
  CBadge,
  CProgress,
  CRow,
  CCol,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilDataTransferDown,
  cilMediaPlay,
  cilMediaStop,
  cilSettings,
  cilClock,
  cilCheckCircle,
  cilXCircle,
} from '@coreui/icons'

const WorldAssetsCollectionSettings = () => {
  const [isCollecting, setIsCollecting] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [collectionInterval, setCollectionInterval] = useState(6)
  const [lastCollection, setLastCollection] = useState(null)
  const [nextCollection, setNextCollection] = useState(null)
  const [collectionStatus, setCollectionStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState({
    totalAssets: 0,
    matchedAssets: 0,
    unmatchedAssets: 0,
    showAddTickerModal: false,
  })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // 설정 로드
  useEffect(() => {
    loadSettings()
    loadCollectionStatus()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/v1/configurations?category=world_assets')
      if (response.ok) {
        const configs = await response.json()
        configs.forEach((config) => {
          if (config.config_key === 'WORLD_ASSETS_COLLECTION_ENABLED') {
            setIsScheduled(config.config_value === 'true')
          } else if (config.config_key === 'WORLD_ASSETS_COLLECTION_INTERVAL_HOURS') {
            setCollectionInterval(parseInt(config.config_value) || 6)
          }
        })
      }
    } catch (error) {
      console.error('설정 로드 실패:', error)
    }
  }

  const loadCollectionStatus = async () => {
    try {
      const response = await fetch('/api/v1/world-assets/collection-status')
      if (response.ok) {
        const status = await response.json()
        setLastCollection(status.last_collection)
        setNextCollection(status.next_collection)
        setCollectionStatus(status.status)
        setStats(status.stats || {})
      }
    } catch (error) {
      console.error('수집 상태 로드 실패:', error)
    }
  }

  const handleManualCollection = async () => {
    setIsCollecting(true)
    setError(null)
    setSuccess(null)
    setProgress(0)

    try {
      const response = await fetch('/api/v1/world-assets/collect-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        setSuccess('데이터 수집이 완료되었습니다.')
        setStats(result.data || {})
        if (result.data?.show_add_ticker_modal) {
          setSuccess(
            '데이터 수집 완료. 매칭되지 않은 자산이 있습니다. 티커 등록 모달을 확인하세요.',
          )
        }
        loadCollectionStatus()
      } else {
        const errorData = await response.json()
        setError(errorData.detail || '데이터 수집 중 오류가 발생했습니다.')
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsCollecting(false)
    }
  }

  const handleToggleScheduled = async (enabled) => {
    try {
      const response = await fetch(
        `/api/v1/configurations/WORLD_ASSETS_COLLECTION_ENABLED?config_value=${enabled}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          // body: JSON.stringify({ config_value: enabled.toString() }), // body 제거
        },
      )

      if (response.ok) {
        setIsScheduled(enabled)
        setSuccess(`자동 수집이 ${enabled ? '활성화' : '비활성화'}되었습니다.`)
      } else {
        setError('설정 변경에 실패했습니다.')
      }
    } catch (error) {
      setError('설정 변경 중 오류가 발생했습니다.')
    }
  }

  const handleIntervalChange = async (interval) => {
    try {
      const response = await fetch(
        `/api/v1/configurations/WORLD_ASSETS_COLLECTION_INTERVAL_HOURS?config_value=${interval}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      if (response.ok) {
        setCollectionInterval(interval)
        setSuccess(`수집 간격이 ${interval}시간으로 변경되었습니다.`)
      } else {
        setError('간격 설정 변경에 실패했습니다.')
      }
    } catch (error) {
      setError('간격 설정 변경 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadge = () => {
    switch (collectionStatus) {
      case 'running':
        return <CBadge color="primary">실행중</CBadge>
      case 'completed':
        return <CBadge color="success">완료</CBadge>
      case 'failed':
        return <CBadge color="danger">실패</CBadge>
      default:
        return <CBadge color="secondary">대기중</CBadge>
    }
  }

  const getStatusIcon = () => {
    switch (collectionStatus) {
      case 'running':
        return <CSpinner size="sm" className="text-primary" />
      case 'completed':
        return <CIcon icon={cilCheckCircle} className="text-success" />
      case 'failed':
        return <CIcon icon={cilXCircle} className="text-danger" />
      default:
        return <CIcon icon={cilClock} className="text-secondary" />
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <CCardTitle>
          <CIcon icon={cilDataTransferDown} className="me-2" />
          World Assets Ranking 수집 설정
        </CCardTitle>
      </CCardHeader>
      <CCardBody>
        {/* 알림 */}
        {error && (
          <CAlert color="danger" dismissible onClose={() => setError(null)}>
            {error}
          </CAlert>
        )}
        {success && (
          <CAlert color="success" dismissible onClose={() => setSuccess(null)}>
            {success}
          </CAlert>
        )}

        <CRow>
          <CCol md={6}>
            {/* 수동 수집 */}
            <div className="mb-4">
              <h5>수동 수집</h5>
              <CButton
                color="primary"
                onClick={handleManualCollection}
                disabled={isCollecting}
                className="me-2"
              >
                {isCollecting ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    수집중...
                  </>
                ) : (
                  <>
                    <CIcon icon={cilMediaPlay} className="me-2" />
                    수집 시작
                  </>
                )}
              </CButton>
            </div>

            {/* 자동 수집 설정 */}
            <div className="mb-4">
              <h5>자동 수집 설정</h5>
              <div className="mb-3">
                <CFormSwitch
                  id="scheduledCollection"
                  label="자동 수집 활성화"
                  checked={isScheduled}
                  onChange={(e) => handleToggleScheduled(e.target.checked)}
                />
              </div>
              <div className="mb-3">
                <CFormLabel htmlFor="collectionInterval">수집 간격 (시간)</CFormLabel>
                <CFormSelect
                  id="collectionInterval"
                  value={collectionInterval}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value))}
                  disabled={!isScheduled}
                >
                  <option value={1}>1시간</option>
                  <option value={3}>3시간</option>
                  <option value={6}>6시간</option>
                  <option value={12}>12시간</option>
                  <option value={24}>24시간</option>
                </CFormSelect>
              </div>
            </div>
          </CCol>

          <CCol md={6}>
            {/* 수집 상태 */}
            <div className="mb-4">
              <h5>수집 상태</h5>
              <div className="d-flex align-items-center mb-2">
                {getStatusIcon()}
                <span className="ms-2">상태: {getStatusBadge()}</span>
              </div>
              {lastCollection && (
                <div className="mb-2">
                  <small className="text-muted">
                    마지막 수집: {new Date(lastCollection).toLocaleString()}
                  </small>
                </div>
              )}
              {nextCollection && isScheduled && (
                <div className="mb-2">
                  <small className="text-muted">
                    다음 수집: {new Date(nextCollection).toLocaleString()}
                  </small>
                </div>
              )}
            </div>

            {/* 수집 통계 */}
            <div className="mb-4">
              <h5>수집 통계</h5>
              <div className="row text-center">
                <div className="col-4">
                  <h6 className="text-primary">{stats.totalAssets || 0}</h6>
                  <small className="text-muted">전체 자산</small>
                </div>
                <div className="col-4">
                  <h6 className="text-success">{stats.matchedAssets || 0}</h6>
                  <small className="text-muted">매칭됨</small>
                </div>
                <div className="col-4">
                  <h6 className="text-warning">{stats.unmatchedAssets || 0}</h6>
                  <small className="text-muted">매칭 안됨</small>
                </div>
              </div>
            </div>

            {/* 진행률 */}
            {isCollecting && (
              <div className="mb-4">
                <h5>수집 진행률</h5>
                <CProgress value={progress} className="mb-2" />
                <small className="text-muted">{progress}% 완료</small>
              </div>
            )}
          </CCol>
        </CRow>

        {/* 설명 */}
        <div className="mt-4">
          <h6>World Assets Ranking 수집 기능</h6>
          <ul className="text-muted small">
            <li>글로벌 자산 순위 데이터를 자동으로 수집합니다</li>
            <li>수집된 자산을 기존 assets 테이블과 매칭합니다</li>
            <li>매칭되지 않은 자산은 별도로 관리됩니다</li>
            <li>수집 간격은 1시간~24시간으로 설정 가능합니다</li>
          </ul>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default WorldAssetsCollectionSettings
