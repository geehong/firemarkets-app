import { useMemo, useEffect, useState } from 'react';
import { realtimeAPI } from '../services/api';

// Plain React version (no @tanstack/react-query dependency)

export const useRealtimePricesPg = (symbols = [], assetType = 'crypto', options = {}) => {
  const { refetchInterval } = options || {};
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
    };
  }, [JSON.stringify(symbols), assetType, options?.refetchInterval]);

  return state;
};

export const useDelaySparklinePg = (
  symbols = [],
  dataInterval = '15m',
  days = 1,
  options = {}
) => {
  const { refetchInterval = 60000 } = options || {};
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

export const useCryptoPricesPg = (symbols, options = {}) => useRealtimePricesPg(symbols, 'crypto', options);
export const useStockPricesPg = (symbols, options = {}) => useRealtimePricesPg(symbols, 'stock', options);

export default useRealtimePricesPg;
