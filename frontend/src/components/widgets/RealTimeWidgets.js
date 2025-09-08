import React from 'react'
import { CRow, CCol, CWidgetStatsE } from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import { realtimeAPI } from 'src/services/api'

/**
 * RealTimeWidgets
 * - Left: title (ticker) and value (current price)
 * - Right: 30-day sparkline line chart
 * - Data source: /api/v1/realtime/table (backend enriches with sparkline_data)
 */
const RealTimeWidgets = ({ tickers = [], responsive = { sm: 6, md: 4, xl: 3 } }) => {
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [priceMap, setPriceMap] = React.useState({})

  const fetchTickerItem = async (ticker) => {
    try {
      // Fetch assets table filtered by ticker (page_size 1)
      const { data } = await realtimeAPI.getAssetsTable({ search: ticker, page: 1, page_size: 1 })
      const row = data?.data?.[0]
      if (!row) return null

      const sparkline = Array.isArray(row.sparkline_30d) ? row.sparkline_30d : []
      return {
        id: ticker,
        title: row.ticker || ticker,
        // Prefer realtime priceMap; fallback to row.price
        value:
          priceMap[ticker] != null
            ? `$${Number(priceMap[ticker]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : (row.price != null
                ? `$${Number(row.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : 'N/A'),
        chartData: sparkline,
      }
    } catch (_e) {
      return {
        id: ticker,
        title: ticker,
        value: 'N/A',
        chartData: [],
      }
    }
  }

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!tickers || tickers.length === 0) {
        setItems([])
        return
      }
      setLoading(true)
      try {
        // Split tickers for crypto/stock and build query symbols
        const cryptoSymbols = tickers
          .filter((t) => /USDT$/i.test(t) || ['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'DOT', 'DOGE', 'XRP'].includes(t.toUpperCase()))
          .map((t) => t.toUpperCase().endsWith('USDT') ? t.toUpperCase().replace(/USDT$/i, '') : t.toUpperCase())

        const stockSymbols = tickers
          .filter((t) => !/USDT$/i.test(t))
          .map((t) => t.toUpperCase())

        // Fetch realtime prices in parallel
        const [cryptoRes, stockRes] = await Promise.all([
          cryptoSymbols.length ? realtimeAPI.getCryptoPrices(cryptoSymbols) : Promise.resolve({ data: { prices: {} } }),
          stockSymbols.length ? realtimeAPI.getStockPrices(stockSymbols) : Promise.resolve({ data: { prices: {} } }),
        ])

        // Normalize into a single map keyed by original tickers used in widgets
        const newPriceMap = {}
        const cryptoPrices = cryptoRes?.data?.prices || {}
        const stockPrices = stockRes?.data?.prices || {}

        tickers.forEach((t) => {
          const upper = t.toUpperCase()
          if (upper.endsWith('USDT')) {
            const base = upper.replace(/USDT$/i, '')
            if (cryptoPrices[base] != null) newPriceMap[upper] = cryptoPrices[base]
          } else {
            if (stockPrices[upper] != null) newPriceMap[upper] = stockPrices[upper]
            if (cryptoPrices[upper] != null) newPriceMap[upper] = cryptoPrices[upper]
          }
        })

        if (!mounted) return
        setPriceMap(newPriceMap)

        const results = await Promise.all(tickers.map(fetchTickerItem))
        if (!mounted) return
        setItems(results.filter(Boolean))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [tickers])

  const makeChart = (values) => {
    const dataPoints = Array.isArray(values) ? values.slice(-30) : []
    return (
      <CChartLine
        className="mx-auto"
        style={{ height: '40px', width: '120px' }}
        data={{
          labels: dataPoints.map((_, idx) => String(idx + 1)),
          datasets: [
            {
              data: dataPoints,
              borderColor: 'rgba(255,255,255,.8)',
              backgroundColor: 'rgba(255,255,255,.15)',
              pointRadius: 0,
              tension: 0.25,
              fill: true,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
          elements: { line: { borderWidth: 2 } },
        }}
      />
    )
  }

  return (
    <CRow className="mb-4">
      {items.map((it) => (
        <CCol key={it.id} sm={responsive.sm} md={responsive.md} xl={responsive.xl}>
          <CWidgetStatsE
            className="mb-3"
            title={it.title}
            value={loading ? 'Loading...' : it.value}
            chart={makeChart(it.chartData)}
          />
        </CCol>
      ))}
    </CRow>
  )
}

export default RealTimeWidgets


