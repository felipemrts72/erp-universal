import { Navigate, Outlet } from 'react-router-dom';

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

export default function AdminRoute() {
  const token = localStorage.getItem('token');
  const user = token ? parseJwt(token) : {};

  if (user?.role !== 'admin') {
    return <Navigate to='/' replace />;
  }

  return <Outlet />;
}
