import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { api } from '../services/api';

export default function EstoquePage() {
  const { data, loading } = useFetch('/estoque');
  const [form, setForm] = useState({ produtoId: '', quantidade: 0, tipoMovimento: 'entrada' });

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/estoque', { ...form, produtoId: Number(form.produtoId), quantidade: Number(form.quantidade) });
    window.location.reload();
  };

  if (loading) return <p>Carregando...</p>;
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="bg-white p-4 rounded shadow flex gap-2">
        <input className="border p-2" placeholder="Produto ID" onChange={(e) => setForm({ ...form, produtoId: e.target.value })} />
        <input className="border p-2" placeholder="Quantidade" onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
        <select className="border p-2" onChange={(e) => setForm({ ...form, tipoMovimento: e.target.value })}>
          <option value="entrada">entrada</option><option value="saida">saida</option><option value="producao">producao</option><option value="ajuste">ajuste</option>
        </select>
        <button className="bg-slate-900 text-white rounded px-3">Registrar</button>
      </form>
      <div className="bg-white rounded shadow p-4">
        {data.map((m) => <div key={m.id}>{m.produto_nome} - {m.quantidade} ({m.tipo_movimento})</div>)}
      </div>
    </div>
  );
}
