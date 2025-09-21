import { useState, useEffect, useCallback } from 'react'

export const useConfigurations = () => {
  const [configurations, setConfigurations] = useState([])
  const [groupedConfigurations, setGroupedConfigurations] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // 그룹화된 설정 로드
  const loadGroupedConfigurations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/v1/configurations/grouped')
      if (!response.ok) {
        throw new Error('Failed to load grouped configurations')
      }
      const data = await response.json()
      
      // 그룹화된 설정들을 config_key로 매핑
      const groupedMap = {}
      data.forEach(config => {
        groupedMap[config.config_key] = config
      })
      setGroupedConfigurations(groupedMap)
    } catch (error) {
      setError(error.message)
      console.error('Error loading grouped configurations:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 개별 설정 로드 (레거시)
  const loadConfigurations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/v1/configurations')
      if (!response.ok) {
        throw new Error('Failed to load configurations')
      }
      const data = await response.json()
      setConfigurations(data)
    } catch (error) {
      setError(error.message)
      console.error('Error loading configurations:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 그룹화된 설정 업데이트
  const updateGroupedConfiguration = useCallback(async (configKey, configValue) => {
    try {
      setSaving(true)
      setError(null)
      const response = await fetch(`/api/v1/configurations/grouped/${configKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config_value: configValue,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to update grouped configuration')
      }

      const updatedConfig = await response.json()
      setGroupedConfigurations((prev) => ({
        ...prev,
        [configKey]: updatedConfig,
      }))

      return { success: true, message: `Configuration "${configKey}" updated successfully` }
    } catch (error) {
      setError(error.message)
      console.error('Error updating grouped configuration:', error)
      return { success: false, message: error.message }
    } finally {
      setSaving(false)
    }
  }, [])

  // 개별 설정 업데이트 (레거시)
  const updateConfiguration = useCallback(async (configKey, newValue) => {
    try {
      setSaving(true)
      setError(null)
      const response = await fetch(
        `/api/v1/configurations/${configKey}?config_value=${encodeURIComponent(newValue)}`,
        { method: 'PUT' },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to update configuration')
      }

      const updatedConfig = await response.json()
      setConfigurations((prev) =>
        prev.map((config) => (config.config_key === configKey ? updatedConfig : config)),
      )

      return { success: true, message: `Configuration "${configKey}" updated successfully` }
    } catch (error) {
      setError(error.message)
      console.error('Error updating configuration:', error)
      return { success: false, message: error.message }
    } finally {
      setSaving(false)
    }
  }, [])

  // 초기 로드
  useEffect(() => {
    loadGroupedConfigurations()
  }, [loadGroupedConfigurations])

  return {
    configurations,
    groupedConfigurations,
    loading,
    saving,
    error,
    loadConfigurations,
    loadGroupedConfigurations,
    updateConfiguration,
    updateGroupedConfiguration,
  }
}
