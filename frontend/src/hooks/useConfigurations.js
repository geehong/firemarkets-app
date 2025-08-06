import { useState, useEffect, useCallback } from 'react'

export const useConfigurations = () => {
  const [configurations, setConfigurations] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // 설정 로드
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

  // 설정 업데이트
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

  // 카테고리별 설정 적용
  const applyCategoryChanges = useCallback(async (category) => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/v1/configurations?category=${category}`)
      if (!response.ok) {
        throw new Error('Failed to reload configurations')
      }

      const categoryConfigs = await response.json()
      setConfigurations((prev) => {
        const updated = [...prev]
        categoryConfigs.forEach((catConfig) => {
          const index = updated.findIndex((c) => c.config_key === catConfig.config_key)
          if (index !== -1) {
            updated[index] = catConfig
          }
        })
        return updated
      })

      return { success: true, message: `${category} category settings applied successfully` }
    } catch (error) {
      setError(error.message)
      console.error('Error applying category changes:', error)
      return { success: false, message: error.message }
    } finally {
      setSaving(false)
    }
  }, [])

  // 설정값들을 카테고리별로 그룹화
  const groupedConfigurations = configurations.reduce((acc, config) => {
    const category = config.category || 'general'
    if (category === 'onchain_metrics') {
      return acc // 온체인 메트릭은 별도 탭에서 관리
    }
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(config)
    return acc
  }, {})

  // 초기 로드
  useEffect(() => {
    loadConfigurations()
  }, [loadConfigurations])

  return {
    configurations,
    groupedConfigurations,
    loading,
    saving,
    error,
    loadConfigurations,
    updateConfiguration,
    applyCategoryChanges,
  }
}
