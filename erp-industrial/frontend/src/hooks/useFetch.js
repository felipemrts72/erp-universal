import { useEffect, useState } from 'react';
import { api } from '../services/api';

export function useFetch(url) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(url)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading };
}
