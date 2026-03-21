import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function useAuth() {
  const navigate = useNavigate();

  const isAuthenticated = () => Boolean(localStorage.getItem('token'));

  const login = async (email, senha) => {
    const { data } = await api.post('/login', { email, senha });
    localStorage.setItem('token', data.token);
    navigate('/');
  };

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return { isAuthenticated, login, logout };
}
