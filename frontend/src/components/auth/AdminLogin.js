import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormInput,
  CFormLabel,
  CButton,
  CAlert,
  CSpinner
} from '@coreui/react';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/admin/manage';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(username, password);
    
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <CCard style={{ width: '400px' }}>
        <CCardHeader>
          <h4 className="mb-0">관리자 로그인</h4>
        </CCardHeader>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            {error && (
              <CAlert color="danger" className="mb-3">
                {error}
              </CAlert>
            )}
            
            <div className="mb-3">
              <CFormLabel htmlFor="username">사용자명</CFormLabel>
              <CFormInput
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="mb-3">
              <CFormLabel htmlFor="password">비밀번호</CFormLabel>
              <CFormInput
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <CButton 
              type="submit" 
              color="primary" 
              className="w-100 mb-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </CButton>

            <CButton 
              type="button" 
              color="secondary" 
              variant="outline"
              className="w-100"
              onClick={handleGoHome}
              disabled={loading}
            >
              홈으로 이동
            </CButton>
          </CForm>
        </CCardBody>
      </CCard>
    </div>
  );
};

export default AdminLogin; 