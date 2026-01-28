
import { useState, useEffect } from "react";

export function useSpreadAnalysis(
    initialTickerA: string = "BTCUSDT", 
    initialTickerB: string = "ETHUSDT",
    days: number = 7500 // 20.5 years roughly
) {
  const [tickerA, setTickerA] = useState(initialTickerA);
  const [tickerB, setTickerB] = useState(initialTickerB);
  const [spreadData, setSpreadData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpread = async () => {
        try {
            setLoading(true);
            setError(null);
            const url = `/api/v1/analysis/spread?ticker1=${tickerA}&ticker2=${tickerB}&days=${days}`;
            const response = await fetch(url);
            const result = await response.json();
            
            if(result.error) {
                setError(result.error);
                setSpreadData(null);
            } else {
                setSpreadData(result);
            }
        } catch(e) {
            console.error("Failed to fetch spread", e);
            setError("Failed to fetch spread analysis");
        } finally {
            setLoading(false);
        }
    }
    fetchSpread();
  }, [tickerA, tickerB, days]);

  return { spreadData, loading, error, tickerA, setTickerA, tickerB, setTickerB };
}
