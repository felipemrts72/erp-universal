import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import LoadingModal from '../../components/LoadingModal';
import Toast from '../../components/Toast';

import './style.css';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function getStatusLabel(status) {
  const map = {
    pendente: 'Pendente',
    em_producao: 'Em produção',
    finalizado: 'Finalizado',
  };

  return map[status] || status || '-';
}

function getStatusClass(status) {
  const map = {
    pendente: 'producao-page__badge producao-page__badge--pending',
    em_producao: 'producao-page__badge producao-page__badge--progress',
    finalizado: 'producao-page__badge producao-page__badge--done',
  };

  return map[status] || 'producao-page__badge';
}

export default function Producao() {
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filtro, setFiltro] = useState('todas');
  const [busca, setBusca] = useState('');

  const [toast, setToast] = useState({
    open: false,
    message: '',
    type: 'error',
  });

  const showToast = (message, type = 'error') => {
    setToast({
      open: true,
      message,
      type,
    });
  };

  const closeToast = () => {
    setToast((prev) => ({
      ...prev,
      open: false,
    }));
  };

  useEffect(() => {
    if (!toast.open) return;

    const timer = setTimeout(() => {
      closeToast();
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast.open]);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/producao');
      setOrdens(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setOrdens([]);
      showToast(
        error?.response?.data?.message || 'Erro ao carregar produção.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const iniciarOrdem = async (ordemId) => {
    try {
      setSaving(true);
      await api.post('/producao/iniciar', { ordemId });
      showToast('Ordem iniciada com sucesso.', 'success');
      await load();
    } catch (error) {
      console.error(error);
      showToast(
        error?.response?.data?.message || 'Erro ao iniciar ordem.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const finalizarOrdem = async (ordemId) => {
    try {
      setSaving(true);
      await api.post('/producao/finalizar', { ordemId });
      showToast('Ordem finalizada com sucesso.', 'success');
      await load();
    } catch (error) {
      console.error(error);
      showToast(
        error?.response?.data?.message || 'Erro ao finalizar ordem.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const ordensFiltradas = useMemo(() => {
    return ordens.filter((ordem) => {
      const atendeFiltro = filtro === 'todas' ? true : ordem.status === filtro;

      const texto =
        `${ordem.id} ${ordem.produto_nome || ''} ${ordem.cliente_nome || ''} ${ordem.venda_id || ''}`.toLowerCase();
      const atendeBusca = texto.includes(busca.toLowerCase());

      return atendeFiltro && atendeBusca;
    });
  }, [ordens, filtro, busca]);

  return (
    <>
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />

      {(loading || saving) && <LoadingModal />}

      <Card
        title='Produção'
        subtitle='Acompanhe ordens ligadas às vendas e finalize o que estiver pronto.'
      >
        <div className='producao-page__topbar'>
          <div className='producao-page__filters'>
            <button
              type='button'
              className={`btn ${filtro === 'todas' ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setFiltro('todas')}
            >
              Todas
            </button>

            <button
              type='button'
              className={`btn ${filtro === 'pendente' ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setFiltro('pendente')}
            >
              Pendentes
            </button>

            <button
              type='button'
              className={`btn ${filtro === 'em_producao' ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setFiltro('em_producao')}
            >
              Em produção
            </button>

            <button
              type='button'
              className={`btn ${filtro === 'finalizado' ? 'btn--primary' : 'btn--secondary'}`}
              onClick={() => setFiltro('finalizado')}
            >
              Finalizadas
            </button>
          </div>

          <input
            className='producao-page__search'
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder='Buscar por OP, venda, cliente ou produto'
          />
        </div>

        <div className='producao-page__cards'>
          {ordensFiltradas.length ? (
            ordensFiltradas.map((ordem) => (
              <article key={ordem.id} className='producao-page__card'>
                <div className='producao-page__card-header'>
                  <div>
                    <h3 className='producao-page__title'>OP #{ordem.id}</h3>
                    <p className='producao-page__subtitle'>
                      {ordem.produto_nome || 'Produto não informado'}
                    </p>
                  </div>

                  <span className={getStatusClass(ordem.status)}>
                    {getStatusLabel(ordem.status)}
                  </span>
                </div>

                <div className='producao-page__meta-grid'>
                  <div className='producao-page__meta'>
                    <span className='producao-page__meta-label'>Venda</span>
                    <strong>
                      {ordem.venda_id ? `#${ordem.venda_id}` : '-'}
                    </strong>
                  </div>

                  <div className='producao-page__meta'>
                    <span className='producao-page__meta-label'>Cliente</span>
                    <strong>{ordem.cliente_nome || '-'}</strong>
                  </div>

                  <div className='producao-page__meta'>
                    <span className='producao-page__meta-label'>
                      Quantidade
                    </span>
                    <strong>{ordem.quantidade}</strong>
                  </div>

                  <div className='producao-page__meta'>
                    <span className='producao-page__meta-label'>Criada em</span>
                    <strong>{formatDate(ordem.criado_em)}</strong>
                  </div>
                </div>

                <div className='producao-page__actions'>
                  {ordem.status === 'pendente' && (
                    <button
                      type='button'
                      className='btn btn--secondary'
                      onClick={() => iniciarOrdem(ordem.id)}
                      disabled={saving}
                    >
                      Iniciar
                    </button>
                  )}

                  {ordem.status === 'em_producao' && (
                    <button
                      type='button'
                      className='btn btn--primary'
                      onClick={() => finalizarOrdem(ordem.id)}
                      disabled={saving}
                    >
                      Finalizar
                    </button>
                  )}

                  <button type='button' className='btn btn--secondary' disabled>
                    Relatórios
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className='producao-page__empty'>
              Nenhuma ordem encontrada para este filtro.
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
