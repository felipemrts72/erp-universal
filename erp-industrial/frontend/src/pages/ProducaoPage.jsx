import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { api } from '../services/api';

export default function ProducaoPage() {
  const { data, loading } = useFetch('/producao');
  const [form, setForm] = useState({ produtoId: '', quantidade: 1 });

  const criar = async (e) => {
    e.preventDefault();
    await api.post('/producao', { produtoId: Number(form.produtoId), quantidade: Number(form.quantidade) });
    window.location.reload();
  };

  const acao = async (id, tipo) => {
    await api.post(`/producao/${id}/${tipo}`);
    window.location.reload();
  };

  if (loading) return <p>Carregando...</p>;
  return (
    <div className="space-y-4">
      <form onSubmit={criar} className="bg-white p-4 rounded shadow flex gap-2">
        <input className="border p-2" placeholder="Produto ID" onChange={(e) => setForm({ ...form, produtoId: e.target.value })} />
        <input className="border p-2" placeholder="Qtd" onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
        <button className="bg-slate-900 text-white rounded px-3">Criar ordem</button>
      </form>
      <div className="bg-white p-4 rounded shadow space-y-1">
        {data.map((o) => (
          <div key={o.id} className="flex gap-2 items-center">
            <span>OP #{o.id} - {o.produto_nome} - {o.status}</span>
            <button className="text-blue-700" onClick={() => acao(o.id, 'iniciar')}>Iniciar</button>
            <button className="text-green-700" onClick={() => acao(o.id, 'finalizar')}>Finalizar</button>
          </div>
        ))}
      </div>
    </div>
  );
}
