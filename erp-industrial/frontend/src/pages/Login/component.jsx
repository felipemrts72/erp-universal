import { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import LoadingModal from '../../components/LoadingModal';
import './style.css';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.senha);
    } catch (err) {
      setError(err?.response?.data?.message || 'Falha no login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <form className="login__card" onSubmit={handleSubmit}>
        <h1 className="login__title">ERP Industrial</h1>
        <p className="login__subtitle">Acesse com seu usuário corporativo.</p>
        <label className="form-control">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
        </label>
        <label className="form-control">
          Senha
          <input
            type="password"
            value={form.senha}
            onChange={(e) => setForm((p) => ({ ...p, senha: e.target.value }))}
            required
          />
        </label>
        {error && <p className="login__error">{error}</p>}
        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        {loading && <LoadingModal />}
      </form>
    </div>
  );
}
