import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../../services/api';

function getToken() {
  return localStorage.getItem('token');
}

export default function ProtectedRoute() {
  const location = useLocation();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const token = getToken();

      if (!token) {
        if (active) setStatus('unauthenticated');
        return;
      }

      try {
        await api.get('/auth/me');

        if (active) setStatus('authenticated');
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');

        if (active) setStatus('unauthenticated');
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, []);

  if (status === 'checking') {
    return <div style={{ padding: 24 }}>Verificando autenticação...</div>;
  }

  if (status === 'unauthenticated') {
    return <Navigate to='/login' replace state={{ from: location }} />;
  }

  return <Outlet />;
}
