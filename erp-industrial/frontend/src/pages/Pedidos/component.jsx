import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';

import './style.css';

export default function Pedidos() {
  const [items, setItems] = useState([]);
  const [descricao, setDescricao] = useState('');

  const load = async () => {
    const { data } = await api.get('/pedidos');
    setItems(data || []);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    await api.post('/pedidos', { descricao });
    setDescricao('');
    load();
  };

  return (
    <Card title='Pedidos'>
      <div className='page-actions'>
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder='Descrição do pedido' />
        <button className='btn btn--primary' onClick={create}>Criar pedido</button>
      </div>
      <DataTable columns={[{ key: 'id', label: 'ID' }, { key: 'descricao', label: 'Descrição' }, { key: 'status', label: 'Status' }]} rows={items} />
    </Card>
  );
}
