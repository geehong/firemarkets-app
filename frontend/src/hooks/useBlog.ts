'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

export const useBlogs = () => {
  return useQuery({
    queryKey: ['blogs'],
    queryFn: async () => {
      console.log('🔍 [useBlogs] Blog API 호출 시작')
      
      try {
        // apiClient를 사용하여 블로그 데이터 가져오기
        const result = await apiClient.getBlogs({
          page: 1,
          page_size: 10,
          status: 'published'
        })
        
        console.log('✅ [useBlogs] Blog API 호출 성공:', result)
        return result
        
      } catch (error) {
        console.error('❌ [useBlogs] Blog API 호출 실패:', error)
        
        // Log more details about the error
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          console.error('🔥 [useBlogs] Network error - 가능한 원인:')
          console.error('  1. CORS 정책 위반')
          console.error('  2. Mixed Content (HTTP/HTTPS 혼용)')
          console.error('  3. 네트워크 연결 문제')
          console.error('  4. 백엔드 서버 다운')
        }
        
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5분 캐싱
    retry: 1, // 재시도 1회만
  })
}