import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Autocomplete from '../../components/Autocomplete';

import './style.css';

export default function Orcamentos() {
  const [items, setItems] = useState([]);
  const [cliente, setCliente] = useState('');
  const [buscaId, setBuscaId] = useState(null);

  const load = async () => {
    const { data } = await api.get('/orcamentos');
    setItems(data || []);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    await api.post('/orcamentos', { cliente });
    setCliente('');
    load();
  };

  const decide = async (id, acao) => {
    await api.post(`/orcamentos/${id}/${acao}`);
    load();
  };

  return (
    <>
      <Card title='Criar orçamento'>
        <div className='page-actions'>
          <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder='Nome do cliente' />
          <button className='btn btn--primary' onClick={create}>Criar</button>
        </div>
        <Autocomplete endpoint='/orcamentos/busca' label='Busca rápida' placeholder='Digite para buscar orçamento' onSelect={(id) => setBuscaId(id)} />
        {buscaId && <p>Orçamento selecionado: #{buscaId}</p>}
      </Card>
      <Card title='Lista de orçamentos'>
        <DataTable columns={[{ key: 'id', label: 'ID' }, { key: 'cliente', label: 'Cliente' }, { key: 'status', label: 'Status', render: (_, row) => <StatusBadge status={row.status} /> }, { key: 'acao', label: 'Ações', render: (_, row) => <div className='page-actions'><button className='btn btn--primary' onClick={() => decide(row.id, 'aprovar')}>Aprovar</button><button className='btn btn--secondary' onClick={() => decide(row.id, 'rejeitar')}>Rejeitar</button></div> }]} rows={items} />
      </Card>
    </>
  );
}
