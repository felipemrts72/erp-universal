import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { api } from '../services/api';

export default function ProdutosPage() {
  const { data, loading } = useFetch('/produtos');
  const [form, setForm] = useState({ nome: '', tipo: 'materia_prima', sku: '', estoqueMinimo: 0 });

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/produtos', form);
    window.location.reload();
  };

  if (loading) return <p>Carregando...</p>;
  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="bg-white p-4 rounded shadow grid md:grid-cols-4 gap-2">
        <input className="border p-2" placeholder="Nome" onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <select className="border p-2" onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
          <option value="materia_prima">materia_prima</option>
          <option value="revenda">revenda</option>
          <option value="fabricado">fabricado</option>
          <option value="conjunto">conjunto</option>
        </select>
        <input className="border p-2" placeholder="SKU" onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        <button className="bg-slate-900 text-white rounded px-3">Salvar</button>
      </form>
      <div className="bg-white rounded shadow p-4">
        {data.map((p) => <div key={p.id}>{p.nome} - {p.tipo} - Estoque: {p.estoque_atual}</div>)}
      </div>
    </div>
  );
}
