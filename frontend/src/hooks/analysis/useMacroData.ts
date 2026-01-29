
import { useState, useEffect } from "react";

export function useMacroData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // type=all includes treasury, indicators, yield_spread
        const response = await fetch(`/api/v2/fred/indicators?type=all`);
        const result = await response.json();
        setData(result);
      } catch (e) {
        console.error("Failed to fetch macro data", e);
        setError("Failed to fetch macro data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return { data, loading, error };
}
