import { useQuery } from '@tanstack/react-query'
import { schedulerAPI } from '../services/api'

// 스케줄러 상태 훅
export const useScheduler = (period = 'day') => {
  return useQuery({
    queryKey: ['scheduler-status', period],
    queryFn: async () => {
      if (period === 'day') {
        const response = await schedulerAPI.getSchedulerStatus()
        return response.data
      } else {
        const response = await schedulerAPI.getSchedulerStatusByPeriod(period)
        return response.data
      }
    },
    staleTime: 30 * 1000, // 30초
    refetchInterval: 30 * 1000, // 30초마다 자동 새로고침
    refetchOnWindowFocus: false,
  })
}

export default useScheduler
