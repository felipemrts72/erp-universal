import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import BuscaManual from '../../components/BuscaManual';
import Toast from '../../components/Toast';

import './style.css';

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function formatTimeInput(date) {
  return date.toTimeString().slice(0, 5);
}

export default function Estoque() {
  const [items, setItems] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  const [quantidade, setQuantidade] = useState('');
  const [custoUnitario, setCustoUnitario] = useState('');
  const [fornecedor, setFornecedor] = useState('');

  const [movimentos, setMovimentos] = useState([]);

  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(now.getDate() - 3);

  const [startDate, setStartDate] = useState(formatDateInput(threeDaysAgo));
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState(formatDateInput(now));
  const [endTime, setEndTime] = useState(formatTimeInput(now));

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  const showToast = (message, type = 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastOpen(true);

    setTimeout(() => {
      setToastOpen(false);
    }, 3500);
  };

  const load = async () => {
    try {
      const e = await api.get('/estoque');
      setItems(e.data || []);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      setItems([]);
    }

    await loadMovimentos(1);
  };
  const loadMovimentos = async (pageNumber = 1) => {
    try {
      const { data } = await api.get('/estoque/movimentos', {
        params: {
          startDate,
          startTime,
          endDate,
          endTime,
          page: pageNumber,
          limit: 10,
        },
      });

      setMovimentos(data.items || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Erro ao carregar movimentos:', error);
      setMovimentos([]);
      setPage(1);
      setTotalPages(1);

      showToast(
        error?.response?.data?.message || 'Erro ao carregar movimentos.',
        'error',
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const registrarEntrada = async () => {
    if (!produtoSelecionado?.id) {
      showToast('Selecione um produto.', 'error');
      return;
    }

    if (!quantidade || Number(quantidade) <= 0) {
      showToast('Informe uma quantidade válida.', 'error');
      return;
    }

    if (!custoUnitario || Number(custoUnitario) <= 0) {
      showToast('Informe um custo unitário válido.', 'error');
      return;
    }

    if (!fornecedor.trim()) {
      showToast('Informe o fornecedor.', 'error');
      return;
    }

    try {
      await api.post('/estoque/entrada', {
        produtoId: produtoSelecionado.id,
        quantidade: Number(String(quantidade).replace(',', '.')),
        custoUnitario: Number(String(custoUnitario).replace(',', '.')),
        fornecedor,
        usuarioId: 1, // depois você pode puxar do usuário logado
      });

      setQuantidade('');
      setCustoUnitario('');
      setFornecedor('');
      setProdutoSelecionado(null);

      await load();
      showToast('Entrada registrada com sucesso.', 'success');
    } catch (error) {
      console.error(error);
      showToast(
        error?.response?.data?.message ||
          'Erro ao registrar entrada de estoque.',
        'error',
      );
    }
  };

  return (
    <>
      <Toast
        open={toastOpen}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastOpen(false)}
      />
      <Card title='Entrada de estoque'>
        <div className='form-grid'>
          <BuscaManual
            endpoint='/produtos/busca'
            label='Produto'
            placeholder='Buscar produto'
            onSelect={(id, produto) =>
              setProdutoSelecionado({
                id,
                ...produto,
              })
            }
          />

          <label className='form-control'>
            Quantidade
            <input
              type='number'
              min='1'
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </label>

          <label className='form-control'>
            Custo unitário
            <input
              type='number'
              min='0'
              step='0.01'
              value={custoUnitario}
              onChange={(e) => setCustoUnitario(e.target.value)}
            />
          </label>

          <label className='form-control'>
            Fornecedor
            <input
              type='text'
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              placeholder='Ex.: TOR UNIVERSAL'
            />
          </label>
        </div>

        {produtoSelecionado && (
          <div style={{ marginTop: 8 }}>
            Produto selecionado: <strong>{produtoSelecionado.nome}</strong>
          </div>
        )}

        <div className='page-actions'>
          <button className='btn btn--primary' onClick={registrarEntrada}>
            Registrar entrada
          </button>
        </div>
      </Card>
      <Card title='Posição atual'>
        <DataTable
          columns={[
            { key: 'produto', label: 'Produto' },
            { key: 'quantidade_atual', label: 'Saldo' },
            { key: 'status', label: 'Status' },
          ]}
          rows={items}
        />
      </Card>
      <Card title='Filtro de movimentos'>
        <div className='form-grid'>
          <label className='form-control'>
            Data inicial
            <input
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label className='form-control'>
            Hora inicial
            <input
              type='time'
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>

          <label className='form-control'>
            Data final
            <input
              type='date'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>

          <label className='form-control'>
            Hora final
            <input
              type='time'
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>

        <div className='page-actions'>
          <button
            className='btn btn--primary'
            onClick={() => loadMovimentos(1)}
          >
            Filtrar
          </button>
        </div>
      </Card>
      <Card title='Movimentos'>
        <DataTable
          columns={[
            {
              key: 'criado_em',
              label: 'Data / Hora',
              render: (_, row) => {
                if (!row.criado_em) return '-';
                const date = new Date(row.criado_em);
                return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`;
              },
            },
            {
              key: 'produto',
              label: 'Produto',
              render: (_, row) => row.produto || row.nome || '-',
            },
            { key: 'tipo_movimento', label: 'Tipo' },
            { key: 'quantidade', label: 'Qtd.' },
            { key: 'referencia_tipo', label: 'Referência' },
          ]}
          rows={movimentos}
          emptyText='Nenhum movimento encontrado para esse período.'
        />

        <div className='page-actions' style={{ marginTop: 12 }}>
          <button
            className='btn btn--secondary'
            disabled={page <= 1}
            onClick={() => loadMovimentos(page - 1)}
          >
            Anterior
          </button>

          <span>
            Página {page} de {totalPages}
          </span>

          <button
            className='btn btn--secondary'
            disabled={page >= totalPages}
            onClick={() => loadMovimentos(page + 1)}
          >
            Próxima
          </button>
        </div>
      </Card>
    </>
  );
}
