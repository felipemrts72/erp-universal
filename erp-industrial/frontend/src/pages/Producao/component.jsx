import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';

import './style.css';

export default function Producao() {
  const [ordens, setOrdens] = useState([]);
  const [descricao, setDescricao] = useState('');

  const load = async () => {
    const { data } = await api.get('/producao/ordens');
    setOrdens(data || []);
  };

  useEffect(() => { load(); }, []);

  const criarOrdem = async () => {
    await api.post('/producao/ordens', { descricao });
    setDescricao('');
    load();
  };

  const atualizar = async (id, acao) => {
    await api.post(`/producao/ordens/${id}/${acao}`);
    load();
  };

  return (
    <Card title='Ordens de produção'>
      <div className='page-actions'>
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder='Descrição da ordem' />
        <button className='btn btn--primary' onClick={criarOrdem}>Criar ordem</button>
      </div>
      <DataTable
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'descricao', label: 'Descrição' },
          { key: 'status', label: 'Status' },
          { key: 'acao', label: 'Ações', render: (_, row) => <div className='page-actions'><button className='btn btn--secondary' onClick={() => atualizar(row.id, 'iniciar')}>Iniciar</button><button className='btn btn--primary' onClick={() => atualizar(row.id, 'finalizar')}>Finalizar</button></div> }
        ]}
        rows={ordens}
      />
    </Card>
  );
}
