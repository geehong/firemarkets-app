import { useQuery } from '@tanstack/react-query'
import { schedulerAPI } from '../services/api'

export const useSchedulerLogs = () => {
  return useQuery({
    queryKey: ['scheduler-logs'],
    queryFn: async () => {
      const response = await schedulerAPI.getSchedulerLogs()
      return response.data
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: false,
  })
}

export default useSchedulerLogs


