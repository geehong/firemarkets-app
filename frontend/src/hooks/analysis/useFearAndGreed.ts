
import { useState, useEffect } from "react";

export function useFearAndGreed() {
  const [fngData, setFngData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFng = async () => {
        try {
            const res = await fetch('https://api.alternative.me/fng/?limit=1');
            const data = await res.json();
            if (data.data && data.data.length > 0) {
                setFngData(data.data[0]);
            }
        } catch (e) {
            console.error("Failed to fetch F&G", e);
        } finally {
            setLoading(false);
        }
    };
    fetchFng();
  }, []);

  return { fngData, loading };
}
