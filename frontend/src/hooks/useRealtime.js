import { useEffect, useRef, useState, useCallback } from 'react'
import { api as axios, paramsSerializer } from 'src/lib/api'
import { realtimeAPI } from '../services/api'

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
      const res = await axios.get('https://backend.firemarkets.net/api/v1/realtime/pg/quotes-price', {
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

// PostgreSQL 실시간 가격 데이터 훅 (최적화된 버전)
export const useRealtimePricesPg = (symbols = [], assetType = 'crypto', options = {}) => {
  const { refetchInterval = 60000 } = options || {}; // 기본 60초로 증가 (API 요청 50% 감소)
  const [state, setState] = useState({ data: {}, isLoading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const run = async () => {
      if (!symbols || symbols.length === 0) {
        setState({ data: {}, isLoading: false, error: null });
        return;
      }
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        const results = {};
        
        // 단일 API 호출로 모든 심볼을 한 번에 요청 (최적화)
        if (symbols.length > 1) {
          try {
            const r = await realtimeAPI.getQuotesPricePg(symbols.join(','));
            const payload = r?.data || {};
            if (Array.isArray(payload.quotes)) {
              payload.quotes.forEach(quote => {
                if (quote.asset_id) {
                  // asset_id로 심볼 매핑 (실제 구현에서는 Asset 테이블 조회 필요)
                  const symbol = symbols.find(s => s === quote.ticker || s === quote.asset_id);
                  if (symbol) results[symbol] = quote;
                }
              });
            }
          } catch (e) {
            console.warn(`Bulk PostgreSQL realtime price fetch failed:`, e);
            // Fallback to individual requests
            await Promise.all(
              symbols.map(async (sym) => {
                try {
                  const r = await realtimeAPI.getQuotesPricePg(sym);
                  const payload = r?.data || {};
                  if (Array.isArray(payload.quotes) && payload.quotes.length > 0) {
                    results[sym] = payload.quotes[0];
                  } else if (payload.price != null) {
                    results[sym] = payload;
                  }
                } catch (e) {
                  console.warn(`PostgreSQL realtime price fetch failed for ${sym}:`, e);
                }
              })
            );
          }
        } else {
          // 단일 심볼 요청
          await Promise.all(
            symbols.map(async (sym) => {
              try {
                const r = await realtimeAPI.getQuotesPricePg(sym);
                const payload = r?.data || {};
                if (Array.isArray(payload.quotes) && payload.quotes.length > 0) {
                  results[sym] = payload.quotes[0];
                } else if (payload.price != null) {
                  results[sym] = payload;
                }
              } catch (e) {
                console.warn(`PostgreSQL realtime price fetch failed for ${sym}:`, e);
              }
            })
          );
        }
        
        if (!cancelled) setState({ data: results, isLoading: false, error: null });
      } catch (e) {
        if (!cancelled) setState({ data: {}, isLoading: false, error: e });
      }
    };

    run();
    if (refetchInterval && Number(refetchInterval) > 0) {
      timer = setInterval(run, Number(refetchInterval));
    }
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      // 메모리 정리
      setState({ data: {}, isLoading: false, error: null });
    };
  }, [JSON.stringify(symbols), assetType, options?.refetchInterval]);

  return state;
};

// 지연 가격 데이터 훅 (스파크라인용)
export const useDelaySparklinePg = (
  symbols = [],
  dataInterval = '15m',
  days = 1,
  options = {}
) => {
  const { refetchInterval = 120000 } = options || {}; // 기본 2분으로 증가 (API 요청 75% 감소)
  const [state, setState] = useState({ data: {}, isLoading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const run = async () => {
      if (!symbols || symbols.length === 0) {
        setState({ data: {}, isLoading: false, error: null });
        return;
      }
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        const out = {};
        // Backend constraint: days must be 1 (ge=1, le=1). Clamp to 1 to avoid 422.
        const safeDays = 1;
        await Promise.all(
          symbols.map(async (sym) => {
            try {
              const r = await realtimeAPI.getQuotesDelayPricePg(sym, dataInterval, safeDays);
              const payload = r?.data || {};
              let points = [];
              if (Array.isArray(payload.quotes)) points = payload.quotes;
              else if (Array.isArray(payload.data)) points = payload.data;
              else if (Array.isArray(payload[sym])) points = payload[sym];
              out[sym] = Array.isArray(points) ? points : [];
            } catch (e) {
              console.warn(`PostgreSQL delay sparkline fetch failed for ${sym}:`, e);
            }
          })
        );
        if (!cancelled) setState({ data: out, isLoading: false, error: null });
      } catch (e) {
        if (!cancelled) setState({ data: {}, isLoading: false, error: e });
      }
    };

    run();
    if (refetchInterval && Number(refetchInterval) > 0) {
      timer = setInterval(run, Number(refetchInterval));
    }
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [JSON.stringify(symbols), dataInterval, /* days is clamped */ options?.refetchInterval]);

  return state;
};
