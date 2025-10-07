import { useState, useCallback, useEffect } from 'react'
import axios from 'axios'

// Normalize API base: ensure it points to .../api/v1 regardless of env format
const RAW = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const API = RAW
  ? (RAW.endsWith('/api/v1') ? RAW : RAW.endsWith('/api') ? `${RAW}/v1` : `${RAW}/api/v1`)
  : '/api/v1'

// Backwards-compatible hook that supports both grouped and single-key configuration flows
export const useConfigurations = () => {
  const [configurations, setConfigurations] = useState([])
  const [groupedConfigurations, setGroupedConfigurations] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadGroupedConfigurations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await axios.get(`${API}/configurations/grouped`)
      const data = res.data
      // Map array -> keyed object for fast access
      if (Array.isArray(data)) {
        const map = {}
        for (const cfg of data) map[cfg.config_key] = cfg
        setGroupedConfigurations(map)
      } else if (data && typeof data === 'object') {
        setGroupedConfigurations(data)
      } else {
        setGroupedConfigurations({})
      }
    } catch (e) {
      setError(e.message || 'Failed to load grouped configurations')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadConfigurations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await axios.get(`${API}/configurations`)
      setConfigurations(res.data || [])
    } catch (e) {
      setError(e.message || 'Failed to load configurations')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateGroupedConfiguration = useCallback(async (configKey, configValue) => {
    try {
      setSaving(true)
      setError(null)
      const res = await axios.put(`${API}/configurations/grouped/${configKey}`, { config_value: configValue })
      const updated = res.data
      setGroupedConfigurations((prev) => ({
        ...prev,
        [configKey]: updated,
      }))
      return { success: true, message: `Configuration "${configKey}" updated successfully` }
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Failed to update grouped configuration'
      setError(msg)
      return { success: false, message: msg }
    } finally {
      setSaving(false)
    }
  }, [])

  const updateConfiguration = useCallback(async (configKey, newValue) => {
    try {
      setSaving(true)
      setError(null)
      const res = await axios.put(`${API}/configurations/${configKey}`, { config_value: newValue })
      const updated = res.data
      setConfigurations((prev) => prev.map((c) => (c.config_key === configKey ? updated : c)))
      return { success: true, message: `Configuration "${configKey}" updated successfully` }
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Failed to update configuration'
      setError(msg)
      return { success: false, message: msg }
    } finally {
      setSaving(false)
    }
  }, [])

  useEffect(() => { loadGroupedConfigurations() }, [loadGroupedConfigurations])

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
