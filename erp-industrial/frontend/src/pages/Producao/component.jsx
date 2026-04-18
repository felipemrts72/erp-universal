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

  const [modalRelatorioOpen, setModalRelatorioOpen] = useState(false);
  const [ordemSelecionada, setOrdemSelecionada] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [relatorioForm, setRelatorioForm] = useState({
    funcionario_id: '',
    descricao: '',
    fotos: [],
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

  const loadFuncionarios = async () => {
    try {
      const { data } = await api.get('/funcionarios');
      setFuncionarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setFuncionarios([]);
    }
  };

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
    loadFuncionarios();
  }, []);

  const abrirModalRelatorio = (ordem) => {
    setOrdemSelecionada(ordem);
    setRelatorioForm({
      funcionario_id: '',
      descricao: '',
      fotos: [],
    });
    setModalRelatorioOpen(true);
  };

  const enviarRelatorio = async () => {
    if (!ordemSelecionada?.id) {
      showToast('Ordem não selecionada.', 'error');
      return;
    }

    if (!relatorioForm.funcionario_id) {
      showToast('Selecione o funcionário.', 'error');
      return;
    }

    if (!relatorioForm.descricao.trim()) {
      showToast('Descreva o que está sendo feito.', 'error');
      return;
    }

    if (relatorioForm.fotos.length > 5) {
      showToast('Máximo de 5 fotos.', 'error');
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append('ordem_producao_id', ordemSelecionada.id);
      formData.append('funcionario_id', relatorioForm.funcionario_id);
      formData.append('descricao', relatorioForm.descricao);

      Array.from(relatorioForm.fotos).forEach((file) => {
        formData.append('fotos', file);
      });

      await api.post('/relatorios-producao', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToast('Relatório enviado com sucesso.', 'success');
      fecharModalRelatorio();
    } catch (error) {
      console.error(error);
      showToast(
        error?.response?.data?.message || 'Erro ao enviar relatório.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

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

  const fecharModalRelatorio = () => {
    setModalRelatorioOpen(false);
    setOrdemSelecionada(null);
    setRelatorioForm({
      funcionario_id: '',
      descricao: '',
      fotos: [],
    });
  };

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
                  <button
                    type='button'
                    className='btn btn--secondary'
                    onClick={() => abrirModalRelatorio(ordem)}
                  >
                    Lançar relatório
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

      {modalRelatorioOpen && (
        <div className='producao-page__modal'>
          <div
            className='producao-page__modal-backdrop'
            onClick={fecharModalRelatorio}
          />

          <div className='producao-page__modal-card'>
            <h2 className='producao-page__modal-title'>
              Relatório da OP #{ordemSelecionada?.id}
            </h2>

            <div className='producao-page__form-grid'>
              <label className='producao-page__field'>
                <span>Funcionário</span>
                <select
                  value={relatorioForm.funcionario_id}
                  onChange={(e) =>
                    setRelatorioForm((prev) => ({
                      ...prev,
                      funcionario_id: e.target.value,
                    }))
                  }
                >
                  <option value=''>Selecione</option>
                  {funcionarios.map((funcionario) => (
                    <option key={funcionario.id} value={funcionario.id}>
                      {funcionario.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className='producao-page__field producao-page__field--full'>
                <span>Descrição</span>
                <textarea
                  rows={6}
                  value={relatorioForm.descricao}
                  onChange={(e) =>
                    setRelatorioForm((prev) => ({
                      ...prev,
                      descricao: e.target.value,
                    }))
                  }
                  placeholder='Descreva o que está sendo feito nesta etapa...'
                />
              </label>

              <label className='producao-page__field producao-page__field--full'>
                <span>Fotos (até 5)</span>
                <input
                  type='file'
                  accept='image/*'
                  multiple
                  onChange={(e) =>
                    setRelatorioForm((prev) => ({
                      ...prev,
                      fotos: e.target.files,
                    }))
                  }
                />
                {relatorioForm.fotos?.length ? (
                  <small>
                    {relatorioForm.fotos.length} foto(s) selecionada(s)
                  </small>
                ) : null}
              </label>
            </div>

            <div className='producao-page__modal-actions'>
              <button
                type='button'
                className='btn btn--secondary'
                onClick={fecharModalRelatorio}
              >
                Cancelar
              </button>

              <button
                type='button'
                className='btn btn--primary'
                onClick={enviarRelatorio}
                disabled={saving}
              >
                {saving ? 'Enviando...' : 'Enviar relatório'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
