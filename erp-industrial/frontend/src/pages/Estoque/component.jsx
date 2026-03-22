import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import buscamanual from '../../components/buscamanual';

import './style.css';

export default function Estoque() {
  const [items, setItems] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [produtoId, setProdutoId] = useState(null);
  const [quantidade, setQuantidade] = useState('');

  const load = async () => {
    const [e, m] = await Promise.all([
      api.get('/estoque'),
      api.get('/estoque/movimentos'),
    ]);
    setItems(e.data || []);
    setMovimentos(m.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const lancar = async (tipo) => {
    await api.post('/estoque/ajuste', {
      produtoId,
      quantidade: Number(quantidade),
      tipo,
    });
    setQuantidade('');
    load();
  };

  return (
    <>
      <Card title="Entrada e ajuste de estoque">
        <div className="form-grid">
          <buscamanual
            endpoint="/estoque/busca"
            label="Produto"
            placeholder="Buscar produto"
            onSelect={(id) => setProdutoId(id)}
          />
          <label className="form-control">
            Quantidade
            <input
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </label>
        </div>
        <div className="page-actions">
          <button
            className="btn btn--primary"
            onClick={() => lancar('entrada')}
          >
            Registrar entrada
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => lancar('ajuste')}
          >
            Ajustar estoque
          </button>
        </div>
      </Card>
      <Card title="Posição atual">
        <DataTable
          columns={[
            { key: 'produto', label: 'Produto' },
            { key: 'saldo', label: 'Saldo' },
          ]}
          rows={items}
        />
      </Card>
      <Card title="Movimentos">
        <DataTable
          columns={[
            { key: 'data', label: 'Data' },
            { key: 'produto', label: 'Produto' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'quantidade', label: 'Qtd.' },
          ]}
          rows={movimentos}
        />
      </Card>
    </>
  );
}
