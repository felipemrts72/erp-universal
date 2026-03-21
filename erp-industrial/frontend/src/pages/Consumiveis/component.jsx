import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';

import './style.css';

export default function Consumiveis() {
  const [items, setItems] = useState([]);
  const [relatorio, setRelatorio] = useState([]);
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState('');

  const load = async () => {
    const [l, r] = await Promise.all([api.get('/consumiveis'), api.get('/consumiveis/relatorio-mensal')]);
    setItems(l.data || []);
    setRelatorio(r.data || []);
  };

  useEffect(() => { load(); }, []);

  const registrarSaida = async () => {
    await api.post('/consumiveis/saida', { nome, quantidade: Number(quantidade) });
    setNome('');
    setQuantidade('');
    load();
  };

  return (
    <>
      <Card title='Saída de consumíveis'>
        <div className='page-actions'>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder='Item consumível' />
          <input type='number' value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder='Quantidade' />
          <button className='btn btn--primary' onClick={registrarSaida}>Registrar saída</button>
        </div>
      </Card>
      <Card title='Alertas e listagem'><DataTable columns={[{ key: 'nome', label: 'Item' }, { key: 'saldo', label: 'Saldo' }, { key: 'alerta', label: 'Alerta' }]} rows={items} /></Card>
      <Card title='Relatório mensal'><DataTable columns={[{ key: 'mes', label: 'Mês' }, { key: 'consumo', label: 'Consumo total' }]} rows={relatorio} /></Card>
    </>
  );
}
