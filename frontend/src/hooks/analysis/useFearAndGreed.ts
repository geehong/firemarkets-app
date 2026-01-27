
import { useState, useEffect } from "react";

export function useFearAndGreed() {
  const [fngData, setFngData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFng = async () => {
        try {
            // Fetch 60 days to allow for monthly averages etc.
            const res = await fetch('https://api.alternative.me/fng/?limit=60');
            if (!res.ok) {
                throw new Error(`API Error: ${res.status} ${res.statusText}`);
            }
            const data = await res.json();
            if (data.data && data.data.length > 0) {
                setFngData(data.data[0]);
                setHistory(data.data);
            } else {
                console.warn("F&G API returned no data:", data);
            }
        } catch (e) {
            console.error("Failed to fetch F&G:", e);
        } finally {
            setLoading(false);
        }
    };
    fetchFng();
  }, []);

  return { fngData, history, loading };
}
