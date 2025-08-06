import { useQuery } from '@tanstack/react-query'
import { schedulerAPI } from '../services/api'

// 스케줄러 로그 훅
export const useSchedulerLogs = () => {
  return useQuery({
    queryKey: ['scheduler-logs'],
    queryFn: async () => {
      const response = await schedulerAPI.getSchedulerLogs()
      return response.data
    },
    staleTime: 30 * 1000, // 30초
    refetchInterval: 30 * 1000, // 30초마다 자동 새로고침
    refetchOnWindowFocus: false,
  })
}

export default useSchedulerLogs 