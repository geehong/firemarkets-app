import { useEffect, useState } from 'react'
import axios from 'axios'

const API = '/api/v1'

export const useTreeMapData = (params = {}) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        // Use available widgets endpoint as a placeholder data source
        const res = await axios.get(`${API}/widgets/ticker-summary`, { params: { tickers: 'BTCUSDT,ETHUSDT,SPY,MSFT' } })
        const items = res.data?.data || []
        // Map to treemap-like structure
        const mapped = items.map((it) => ({
          name: it.ticker,
          value: typeof it.current_price === 'number' ? it.current_price : 0,
          change: typeof it.change_percent_7m === 'number' ? it.change_percent_7m : 0,
        }))
        setData(mapped)
      } catch (e) {
        setError(e?.message || 'failed')
        setData([])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  return { data, loading, error }
}

export const usePerformanceTreeMapDataFromTreeMap = (params = {}) => useTreeMapData(params)
