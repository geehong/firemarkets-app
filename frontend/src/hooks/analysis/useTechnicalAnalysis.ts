
import { useState, useEffect } from "react";

export interface MADataPoint {
  date: string;
  close: number;
  [key: string]: number | string; // Allow SMA_XX keys
}

export interface TechnicalAnalysisData {
  ticker: string;
  periods: number[];
  data: MADataPoint[];
  error?: string;
}

export function useMovingAverages(ticker: string = "BTCUSDT") {
  const [data, setData] = useState<TechnicalAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default periods matching the chart config
  const periods = "10,20,40,50,111,200,365,700";

  useEffect(() => {
    const fetchMAs = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = `/api/v1/analysis/technical/ma?ticker=${ticker}&periods=${periods}&days=10000`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.error) {
            setError(result.error);
        } else {
            setData(result);
        }
      } catch (e) {
        setError("Failed to fetch moving averages");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    if (ticker) {
        fetchMAs();
    }
  }, [ticker, periods]);

  return { data, loading, error };
}
