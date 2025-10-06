// Minimal hooks to satisfy imports and fetch required data
import { useEffect, useState } from 'react'
import axios from 'axios'

export function usePriceData(assetId, { limit = 10000, dataInterval = '1d' } = {}) {
  const [data, setData] = useState(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    axios
      .get(`/api/v1/assets/ohlcv/${assetId}`, { params: { limit, data_interval: dataInterval } })
      .then((res) => {
        if (!active) return
        setData(res.data)
      })
      .catch((e) => active && setError(e))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [assetId, limit, dataInterval])
  return { data, isLoading, error }
}

export function useIntegratedMetrics(assetId, metrics = [], params = {}) {
  const [data, setData] = useState(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function fetchMetric() {
      if (!metrics || metrics.length === 0) {
        setData(null)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const metricId = metrics[0]
        const limit = params.limit ?? 1000
        const res = await axios.get(`/api/v1/onchain/onchain/metrics/${metricId}/data`, {
          params: { limit, format: 'json' },
        })
        if (!active) return
        setData(res.data)
      } catch (e) {
        if (active) setError(e)
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchMetric()
    return () => {
      active = false
    }
  }, [assetId, JSON.stringify(metrics), JSON.stringify(params)])

  return { data, isLoading, error }
}

export function useFourthHalvingStartPrice() {
  const [data, setData] = useState(0)
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  return { data, isLoading, error }
}

export function useHalvingDataClosePrice(periodNumber, startPrice, { enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (!enabled) return
    let active = true
    setLoading(true)
    setError(null)
    axios
      .get(`/api/v1/crypto/crypto/bitcoin/halving-data/${periodNumber}`)
      .then((res) => {
        if (!active) return
        setData(res.data)
      })
      .catch((e) => active && setError(e))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [periodNumber, enabled])
  return { data, isLoading, error }
}
