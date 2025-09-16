import React, { Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useSelector } from 'react-redux'
import { CSpinner, useColorModes } from '@coreui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './scss/style.scss'

// We use those styles to show code examples, you should remove them in your application.
import './scss/examples.scss'

// AG Grid CSS - 새로운 Theming API 사용으로 제거
// import 'ag-grid-community/styles/ag-grid.css'
// import 'ag-grid-community/styles/ag-theme-alpine.css'

// React Query 설정 - 성능 최적화 강화
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 60 * 1000, // 1시간으로 증가 (캐시 유지 시간)
      gcTime: 2 * 60 * 60 * 1000, // 2시간 (cacheTime 대신 gcTime 사용)
      retry: 0, // 재시도 비활성화 (빠른 실패)
      retryDelay: 500, // 재시도 지연 최소화
      refetchOnWindowFocus: false, // 윈도우 포커스 시 재요청 비활성화
      refetchOnMount: false, // 마운트 시 재요청 비활성화 (캐시 우선)
      refetchOnReconnect: false, // 재연결 시 재요청 비활성화
      networkMode: 'online', // 온라인 모드만
      suspense: false, // Suspense 비활성화로 초기 로딩 속도 향상
      enabled: true, // 쿼리 활성화
    },
    mutations: {
      retry: 0, // 뮤테이션 재시도 비활성화
      retryDelay: 500, // 뮤테이션 재시도 지연
    },
  },
})

// Containers
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))

// Pages
const Login = React.lazy(() => import('./views/pages/login/Login'))
const Register = React.lazy(() => import('./views/pages/register/Register'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))
const AdminLogin = React.lazy(() => import('./components/auth/AdminLogin'))
const OpenInterestTest = React.lazy(() => import('./pages/OpenInterestTest'))

const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const storedTheme = useSelector((state) => state.theme)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.href.split('?')[1])
    const theme = urlParams.get('theme') && urlParams.get('theme').match(/^[A-Za-z0-9\s]+/)[0]
    if (theme) {
      setColorMode(theme)
    }

    if (isColorModeSet()) {
      return
    }

    setColorMode(storedTheme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
        <Suspense
          fallback={
            <div className="pt-3 text-center">
              <CSpinner color="primary" variant="grow" />
            </div>
          }
        >
          <Routes>
            <Route exact path="/login" name="Login Page" element={<Login />} />
            <Route exact path="/admin/login" name="Admin Login Page" element={<AdminLogin />} />
            <Route exact path="/register" name="Register Page" element={<Register />} />
            <Route exact path="/404" name="Page 404" element={<Page404 />} />
            <Route exact path="/500" name="Page 500" element={<Page500 />} />
            <Route exact path="/open-interest-test" name="Open Interest Test" element={<OpenInterestTest />} />
            <Route path="*" name="Home" element={<DefaultLayout />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
