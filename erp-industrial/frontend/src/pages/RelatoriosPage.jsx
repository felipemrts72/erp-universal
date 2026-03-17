import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { api } from '../services/api';
import { SignatureCanvas } from '../components/SignatureCanvas';

export default function RelatoriosPage() {
  const { data, loading } = useFetch('/relatorios-producao');
  const [form, setForm] = useState({ ordemProducaoId: '', nomeFuncionario: '', descricao: '', foto: null, assinatura: '' });

  const enviar = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('ordemProducaoId', form.ordemProducaoId);
    fd.append('nomeFuncionario', form.nomeFuncionario);
    fd.append('descricao', form.descricao);
    if (form.foto) fd.append('foto', form.foto);
    if (form.assinatura) fd.append('assinaturaUrl', form.assinatura);
    await api.post('/relatorios-producao', fd);
    window.location.reload();
  };

  if (loading) return <p>Carregando...</p>;
  return (
    <div className="space-y-4">
      <form onSubmit={enviar} className="bg-white p-4 rounded shadow space-y-2">
        <input className="border p-2 w-full" placeholder="Ordem de produção ID" onChange={(e) => setForm({ ...form, ordemProducaoId: e.target.value })} />
        <input className="border p-2 w-full" placeholder="Funcionário" onChange={(e) => setForm({ ...form, nomeFuncionario: e.target.value })} />
        <textarea className="border p-2 w-full" placeholder="Descrição" onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, foto: e.target.files[0] })} />
        <SignatureCanvas onChange={(value) => setForm({ ...form, assinatura: value })} />
        <button className="bg-slate-900 text-white rounded px-4 py-2">Registrar relatório</button>
      </form>
      <div className="bg-white p-4 rounded shadow">
        {data.map((r) => <div key={r.id}>OP #{r.ordem_producao_id} - {r.nome_funcionario} - {r.descricao}</div>)}
      </div>
    </div>
  );
}
