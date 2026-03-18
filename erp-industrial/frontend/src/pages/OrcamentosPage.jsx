import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { api } from '../services/api';

export default function OrcamentosPage() {
  const { data, loading } = useFetch('/orcamentos');
  const [clienteNome, setClienteNome] = useState('');

  const criar = async (e) => {
    e.preventDefault();
    await api.post('/orcamentos', {
      clienteNome,
      itens: [{ produtoId: 1, quantidade: 1, precoUnitario: 100 }]
    });
    window.location.reload();
  };

  if (loading) return <p>Carregando...</p>;
  return (
    <div className="space-y-4">
      <form onSubmit={criar} className="bg-white p-4 rounded shadow flex gap-2">
        <input className="border p-2" placeholder="Cliente" onChange={(e) => setClienteNome(e.target.value)} />
        <button className="bg-slate-900 text-white rounded px-3">Novo orçamento</button>
      </form>
      <div className="bg-white p-4 rounded shadow">
        {data.map((o) => <div key={o.id}>#{o.id} - {o.cliente_nome} - {o.status}</div>)}
      </div>
    </div>
  );
}
