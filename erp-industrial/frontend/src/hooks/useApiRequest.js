import { useCallback, useState } from 'react';

export default function useApiRequest(requestFn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError('');
      try {
        return await requestFn(...args);
      } catch (err) {
        setError(err?.response?.data?.message || 'Erro ao processar requisição.');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [requestFn]
  );

  return { execute, loading, error, setError };
}
