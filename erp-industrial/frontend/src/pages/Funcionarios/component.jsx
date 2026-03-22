import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import buscamanual from '../../components/buscamanual';

import './style.css';

export default function Funcionarios() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ nome: '', cargo: '' });
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    const { data } = await api.get('/funcionarios');
    setItems(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (selectedId) {
      await api.put(`/funcionarios/${selectedId}`, form);
    } else {
      await api.post('/funcionarios', form);
    }
    setForm({ nome: '', cargo: '' });
    setSelectedId(null);
    load();
  };

  return (
    <>
      <Card title="Cadastro de funcionários">
        <buscamanual
          endpoint="/funcionarios/busca"
          label="Buscar funcionário para edição"
          placeholder="Digite nome ou matrícula"
          onSelect={(id, item) => {
            setSelectedId(id);
            setForm({ nome: item.nome || '', cargo: item.cargo || '' });
          }}
        />
        <div className="form-grid">
          <label className="form-control">
            Nome
            <input
              value={form.nome}
              onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
            />
          </label>
          <label className="form-control">
            Cargo
            <input
              value={form.cargo}
              onChange={(e) =>
                setForm((p) => ({ ...p, cargo: e.target.value }))
              }
            />
          </label>
        </div>
        <div className="page-actions">
          <button className="btn btn--primary" onClick={save}>
            {selectedId ? 'Salvar edição' : 'Criar funcionário'}
          </button>
        </div>
      </Card>
      <Card title="Listagem">
        <DataTable
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'nome', label: 'Nome' },
            { key: 'cargo', label: 'Cargo' },
          ]}
          rows={items}
        />
      </Card>
    </>
  );
}
