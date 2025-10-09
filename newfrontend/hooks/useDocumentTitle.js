"use client"

import { useEffect } from 'react'

/**
 * 페이지 제목을 동적으로 설정하는 커스텀 훅
 * @param {string} title - 설정할 제목
 * @param {string} suffix - 제목 뒤에 붙일 접미사 (기본값: " | FireMarkets")
 */
const useDocumentTitle = (title, suffix = ' | FireMarkets') => {
  useEffect(() => {
    const previousTitle = document.title
    
    if (title) {
      document.title = `${title}${suffix}`
    }
    
    // 컴포넌트 언마운트 시 이전 제목으로 복원
    return () => {
      document.title = previousTitle
    }
  }, [title, suffix])
}

export default useDocumentTitle
