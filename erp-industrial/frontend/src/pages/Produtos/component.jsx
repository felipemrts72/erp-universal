import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import buscamanual from '../../components/buscamanual';

import './style.css';

export default function Produtos() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ nome: '', preco: '' });
  const [componenteId, setComponenteId] = useState(null);

  const load = async () => {
    const { data } = await api.get('/produtos');
    setItems(Array.isArray(data) ? data : data.items || []);
  };

  useEffect(() => {
    load();
  }, []);

  const createProduto = async (e) => {
    e.preventDefault();
    await api.post('/produtos', { ...form, preco: Number(form.preco) });
    setForm({ nome: '', preco: '' });
    load();
  };

  const addComponente = async (produtoId) => {
    if (!componenteId) return;
    await api.post(`/produtos/${produtoId}/componentes`, { componenteId });
    setComponenteId(null);
  };

  return (
    <>
      <Card title="Cadastrar produto">
        <form className="form-grid" onSubmit={createProduto}>
          <label className="form-control">
            Nome
            <input
              value={form.nome}
              onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
              required
            />
          </label>
          <label className="form-control">
            Preço
            <input
              type="number"
              value={form.preco}
              onChange={(e) =>
                setForm((p) => ({ ...p, preco: e.target.value }))
              }
              required
            />
          </label>
          <button className="btn btn--primary" type="submit">
            Criar
          </button>
        </form>
      </Card>

      <Card title="Adicionar componentes">
        <buscamanual
          endpoint="/produtos/busca"
          label="Buscar componente"
          placeholder="Digite ao menos 3 caracteres"
          onSelect={(id) => setComponenteId(id)}
        />
        <DataTable
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'nome', label: 'Nome' },
            { key: 'preco', label: 'Preço' },
            {
              key: 'acao',
              label: 'Ação',
              render: (_, row) => (
                <button
                  className="btn btn--secondary"
                  onClick={() => addComponente(row.id)}
                >
                  Vincular
                </button>
              ),
            },
          ]}
          rows={items}
        />
      </Card>
    </>
  );
}
