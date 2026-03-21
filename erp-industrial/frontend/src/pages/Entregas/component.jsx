import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';

import './style.css';

export default function Entregas() {
  const [items, setItems] = useState([]);

  const load = async () => {
    const { data } = await api.get('/entregas/pendentes');
    setItems(data || []);
  };

  useEffect(() => { load(); }, []);

  const entregar = async (id) => {
    await api.post(`/entregas/${id}/entregar`);
    load();
  };

  return (
    <Card title='Entregas pendentes'>
      <DataTable
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'cliente', label: 'Cliente' },
          { key: 'status', label: 'Status', render: (_, row) => <StatusBadge status={row.status || 'Pendente'} /> },
          { key: 'acao', label: 'Ação', render: (_, row) => <button className='btn btn--primary' onClick={() => entregar(row.id)}>Marcar entregue</button> }
        ]}
        rows={items}
      />
    </Card>
  );
}
