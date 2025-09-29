import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tickerAPI } from '../services/tickerAPI'

// 티커 추가 Mutation
export const useAddTicker = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tickerAPI.addTicker,
    onSuccess: (data, variables) => {
      // 티커 목록 캐시 무효화
      queryClient.invalidateQueries(['tickers'])
      queryClient.invalidateQueries(['assets'])

      // 성공 콜백 실행
      if (options.onSuccess) {
        options.onSuccess(data, variables)
      }
    },
    onError: (error, variables) => {
      console.error('❌ Add ticker error:', error)

      // 에러 콜백 실행
      if (options.onError) {
        options.onError(error.message, variables)
      }
    },
  })
}

// 티커 삭제 Mutation
export const useDeleteTicker = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tickerAPI.deleteTicker,
    onSuccess: (data, variables) => {
      // 티커 목록 캐시 무효화
      queryClient.invalidateQueries(['tickers'])
      queryClient.invalidateQueries(['assets'])

      // 성공 콜백 실행
      if (options.onSuccess) {
        options.onSuccess(data, variables)
      }
    },
    onError: (error, variables) => {
      console.error('❌ Delete ticker error:', error)

      // 에러 콜백 실행
      if (options.onError) {
        options.onError(error.message, variables)
      }
    },
  })
}

// 개별 티커 설정 업데이트 Mutation
export const useUpdateTickerSettings = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tickerAPI.updateTickerSettings,
    onSuccess: (data, variables) => {
      // 티커 목록 캐시 무효화
      queryClient.invalidateQueries(['tickers'])
      queryClient.invalidateQueries(['assets'])

      // 성공 콜백 실행
      if (options.onSuccess) {
        options.onSuccess(data, variables)
      }
    },
    onError: (error, variables) => {
      console.error('❌ Update ticker settings error:', error)

      // 에러 콜백 실행
      if (options.onError) {
        options.onError(error.message, variables)
      }
    },
  })
}

// 일괄 티커 설정 업데이트 Mutation
export const useBulkUpdateTickerSettings = (options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: tickerAPI.bulkUpdateTickerSettings,
    onSuccess: (data, variables) => {
      console.log('🔍 Bulk update success, invalidating cache...')
      
      // 캐시 무효화를 더 안전하게 처리
      try {
        // 티커 목록 캐시 무효화 (모든 관련 키)
        queryClient.invalidateQueries(['global-tickers'])
        queryClient.invalidateQueries(['global-asset-types'])
        queryClient.invalidateQueries(['tickers'])
        queryClient.invalidateQueries(['assets'])
        
        console.log('🔍 Cache invalidated successfully')
      } catch (error) {
        console.error('🔍 Cache invalidation error:', error)
      }

      // 성공 콜백 실행
      if (options.onSuccess) {
        options.onSuccess(data, variables)
      }
    },
    onError: (error, variables) => {
      console.error('❌ Bulk update ticker settings error:', error)

      // 에러 콜백 실행
      if (options.onError) {
        options.onError(error.message, variables)
      }
    },
  })
}

// 티커 검증 Mutation
export const useValidateTicker = (options = {}) => {
  return useMutation({
    mutationFn: tickerAPI.validateTicker,
    onSuccess: (data, variables) => {
      // 성공 콜백 실행
      if (options.onSuccess) {
        options.onSuccess(data, variables)
      }
    },
    onError: (error, variables) => {
      console.error('❌ Validate ticker error:', error)

      // 에러 콜백 실행
      if (options.onError) {
        options.onError(error.message, variables)
      }
    },
  })
}

// 통합 Mutation 훅 (TickerManagement에서 사용)
export const useTickerMutations = (options = {}) => {
  const addTickerMutation = useAddTicker(options)
  const deleteTickerMutation = useDeleteTicker(options)
  const updateSettingsMutation = useUpdateTickerSettings(options)
  const bulkUpdateSettingsMutation = useBulkUpdateTickerSettings(options)
  const validateTickerMutation = useValidateTicker(options)

  return {
    // 개별 Mutation들 (Promise 기반)
    addTicker: (data, callbacks) => {
      if (callbacks?.onSuccess) {
        addTickerMutation.mutate(data, { onSuccess: callbacks.onSuccess })
      } else {
        addTickerMutation.mutate(data)
      }
    },
    deleteTicker: (assetId, callbacks) => {
      if (callbacks?.onSuccess) {
        deleteTickerMutation.mutate(assetId, { onSuccess: callbacks.onSuccess })
      } else {
        deleteTickerMutation.mutate(assetId)
      }
    },
    updateSettings: (data, callbacks) => {
      if (callbacks?.onSuccess) {
        updateSettingsMutation.mutate(data, { onSuccess: callbacks.onSuccess })
      } else {
        updateSettingsMutation.mutate(data)
      }
    },
    bulkUpdateSettings: (updates, callbacks) => {
      if (callbacks?.onSuccess) {
        bulkUpdateSettingsMutation.mutate(updates, { onSuccess: callbacks.onSuccess })
      } else {
        bulkUpdateSettingsMutation.mutate(updates)
      }
    },
    validateTicker: (data, callbacks) => {
      if (callbacks?.onSuccess) {
        validateTickerMutation.mutate(data, { onSuccess: callbacks.onSuccess })
      } else {
        validateTickerMutation.mutate(data)
      }
    },

    // Promise 기반 함수들 (즉시 저장용)
    updateTickerSettings: (data) => {
      return new Promise((resolve, reject) => {
        updateSettingsMutation.mutate(data, {
          onSuccess: (result) => resolve(result),
          onError: (error) => reject(error),
        })
      })
    },

    // 로딩 상태들
    isAddingTicker: addTickerMutation.isPending,
    isDeletingTicker: deleteTickerMutation.isPending,
    isUpdatingSettings: updateSettingsMutation.isPending,
    isBulkUpdatingSettings: bulkUpdateSettingsMutation.isPending,
    isValidatingTicker: validateTickerMutation.isPending,

    // 에러 상태들
    addTickerError: addTickerMutation.error,
    deleteTickerError: deleteTickerMutation.error,
    updateSettingsError: updateSettingsMutation.error,
    bulkUpdateSettingsError: bulkUpdateSettingsMutation.error,
    validateTickerError: validateTickerMutation.error,

    // 성공 상태들
    isAddTickerSuccess: addTickerMutation.isSuccess,
    isDeleteTickerSuccess: deleteTickerMutation.isSuccess,
    isUpdateSettingsSuccess: updateSettingsMutation.isSuccess,
    isBulkUpdateSettingsSuccess: bulkUpdateSettingsMutation.isSuccess,
    isValidateTickerSuccess: validateTickerMutation.isSuccess,
  }
}
