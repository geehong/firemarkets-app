import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * 로그 데이터를 가져오는 훅
 */
export const useLogs = (params = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/v1/logs', { params });
        setData(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [JSON.stringify(params)]);

  return { data, loading, error };
};
