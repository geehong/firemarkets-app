
import { useState, useEffect } from "react";

export interface CorrelationData {
    tickers: string[];
    matrix: Record<string, Record<string, number>>;
    heatmap_data: any[];
    error?: string;
}

export function useCorrelation(defaultTickers: string = "BTCUSDT,ETHUSDT,SPY,QQQ,GLD", days: number = 90) {
  const [data, setData] = useState<CorrelationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const url = `/api/v1/analysis/correlation?tickers=${defaultTickers}&days=${days}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.error) {
            setError(result.error);
        } else {
            setData(result);
        }
      } catch (e) {
        setError("Failed to fetch correlation data");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [defaultTickers, days]);

  return { data, loading, error };
}
