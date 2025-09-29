import { useEffect, useRef, useState, useCallback } from 'react'
import { api as axios, paramsSerializer } from 'src/lib/api'

export const useRealtime = (symbols = []) => {
  const [prices, setPrices] = useState({})
  const timerRef = useRef(null)

  const fetchOne = async (symbol) => {
    const s = (typeof symbol === 'string' ? symbol : String(symbol)).trim()
    // Guard against comma-joined inputs slipping through
    if (!s || s.includes(',')) {
      console.warn('[useRealtime] Skipping invalid symbol:', symbol)
      return { symbol: s, payload: null, error: new Error('invalid symbol') }
    }
    try {
      const res = await axios.get('/realtime/pg/quotes-price', {
        params: { asset_identifier: s },
        paramsSerializer,
      })
      return { symbol: s, payload: res.data }
    } catch (e) {
      return { symbol: s, payload: null, error: e }
    }
  }

  const poll = useCallback(async () => {
    // Normalize symbols: accept array or comma-joined string
    const list = Array.isArray(symbols)
      ? symbols
      : (typeof symbols === 'string' ? symbols.split(',') : [symbols])

    // Expand any comma-containing entries, trim, filter empties, dedupe
    const expanded = []
    for (const item of list || []) {
      const raw = (typeof item === 'string' ? item : String(item)).trim()
      if (!raw) continue
      if (raw.includes(',')) {
        for (const part of raw.split(',')) {
          const p = part.trim()
          if (p) expanded.push(p)
        }
      } else {
        expanded.push(raw)
      }
    }

    const cleaned = Array.from(new Set(expanded))

    if (!cleaned.length) {
      if (Array.isArray(list) && list.length) console.warn('[useRealtime] No valid symbols after normalization:', list)
      return
    }

    const results = await Promise.all(cleaned.map(fetchOne))
    const next = {}
    for (const r of results) {
      if (r?.payload) next[r.symbol] = r.payload
    }
    setPrices(next)
  }, [symbols])

  useEffect(() => {
    poll()
    timerRef.current = setInterval(poll, 5000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [poll])

  return { prices }
}
