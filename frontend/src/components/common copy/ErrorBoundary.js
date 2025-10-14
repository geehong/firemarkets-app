import React from 'react'
import { CAlert, CButton } from '@coreui/react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // 다음 렌더링에서 폴백 UI가 보이도록 상태를 업데이트합니다.
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // 에러 로깅 서비스에 에러를 기록할 수 있습니다.
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // 폴백 UI를 렌더링합니다.
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <CAlert color="danger" className="w-100">
            <h4>차트 로딩 중 오류가 발생했습니다</h4>
            <p>차트를 불러오는 중 문제가 발생했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.</p>
            <div className="d-flex gap-2">
              <CButton color="primary" onClick={this.handleReload}>
                페이지 새로고침
              </CButton>
              <CButton 
                color="secondary" 
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              >
                다시 시도
              </CButton>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-3">
                <summary>개발자 정보 (클릭하여 확장)</summary>
                <pre className="mt-2 small">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </CAlert>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
