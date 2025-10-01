// All HTTP polling removed. Re-export WebSocket-based hooks for realtime data.
import { useWebSocket, useRealtimePricesWebSocket, useDelaySparklineWebSocket } from './useWebSocket'

// Backward-compatible stub: provide a minimal shape without polling
export const useRealtime = (_symbols = []) => {
  return { prices: {} }
}

// Keep existing names but route to WebSocket implementations
export const useRealtimePricesPg = useRealtimePricesWebSocket
export const useDelaySparklinePg = useDelaySparklineWebSocket
