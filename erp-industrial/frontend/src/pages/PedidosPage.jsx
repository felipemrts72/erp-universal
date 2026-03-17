import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { api } from '../services/api';

export default function PedidosPage() {
  const { data, loading } = useFetch('/pedidos');
  const [orcamentoId, setOrcamentoId] = useState('');

  const criar = async (e) => {
    e.preventDefault();
    await api.post('/pedidos', { orcamentoId: Number(orcamentoId) });
    window.location.reload();
  };

  if (loading) return <p>Carregando...</p>;
  return (
    <div className="space-y-4">
      <form onSubmit={criar} className="bg-white p-4 rounded shadow flex gap-2">
        <input className="border p-2" placeholder="Orçamento ID aprovado" onChange={(e) => setOrcamentoId(e.target.value)} />
        <button className="bg-slate-900 text-white rounded px-3">Gerar pedido</button>
      </form>
      <div className="bg-white p-4 rounded shadow">
        {data.map((p) => <div key={p.id}>Pedido #{p.id} - {p.cliente_nome}</div>)}
      </div>
    </div>
  );
}
