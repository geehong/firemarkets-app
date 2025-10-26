"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SessionContext';
import { useRouter } from 'next/navigation';

const SignInForm: React.FC = () => {
  console.log('📝 [SignInForm] 컴포넌트 렌더링 시작');
  
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const router = useRouter();
  
  console.log('📝 [SignInForm] 초기 상태:', {
    username: credentials.username,
    passwordLength: credentials.password.length,
    isLoading,
    error,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    console.log('📝 [SignInForm] 컴포넌트 마운트됨')
    console.log('📝 [SignInForm] 초기 상태:', { 
      username: credentials.username, 
      isLoading, 
      error,
      timestamp: new Date().toISOString()
    })
  }, [])

  // 상태 변화 추적
  useEffect(() => {
    console.log('📝 [SignInForm] 상태 변화:', {
      username: credentials.username,
      passwordLength: credentials.password.length,
      isLoading,
      hasError: !!error,
      timestamp: new Date().toISOString()
    })
  }, [credentials, isLoading, error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 [SignInForm] 로그인 시도 시작:', credentials);
    setIsLoading(true);
    setError('');

    try {
      console.log('🔐 [SignInForm] login 함수 호출 중...');
      console.log('🔐 [SignInForm] 현재 상태:', { isLoading, error });
      
      await login(credentials);
      
      console.log('🔐 [SignInForm] login 함수 완료');
      console.log('🔐 [SignInForm] 로그인 성공! 홈으로 리다이렉트 중...');
      
      // 로그인 성공 후 잠시 대기 후 홈으로 이동
      setTimeout(() => {
        console.log('🔐 [SignInForm] 리다이렉트 실행');
        console.log('🔐 [SignInForm] 현재 URL:', window.location.href);
        router.push('/');
        console.log('🔐 [SignInForm] 리다이렉트 명령 완료');
      }, 100);
    } catch (err) {
      console.error('🔐 [SignInForm] 로그인 실패:', err);
      console.error('🔐 [SignInForm] 오류 상세:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError('로그인에 실패했습니다. 사용자명과 비밀번호를 확인해주세요.');
    } finally {
      console.log('🔐 [SignInForm] 로딩 상태 해제');
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log('📝 [SignInForm] 입력 변경:', { field: name, value: name === 'password' ? '***' : value });
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  console.log('📝 [SignInForm] JSX 렌더링 시작');
  console.log('📝 [SignInForm] 현재 렌더링 상태:', { isLoading, error, credentials });
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* 로그인 페이지 표시 */}
      <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded text-sm">
        📝 SignInForm 렌더링됨
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            🔐 로그인 화면
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            FireMarkets 계정으로 로그인하세요
          </p>
          <p className="mt-1 text-center text-xs text-green-600">
            ✅ 로그인 폼이 정상적으로 렌더링되었습니다
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                사용자명
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="사용자명"
                value={credentials.username}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="비밀번호"
                value={credentials.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              테스트 계정: <span className="font-mono">admin</span> / <span className="font-mono">password</span>
            </p>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                🚀 로그인 폼이 성공적으로 로드되었습니다!
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignInForm;