import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import Toast from '../../components/Toast';

import './style.css';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function formatDateOnly(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

function getTipoEntregaLabel(row) {
  return row.tipo === 'transportadora' ? 'Transportadora' : 'Retirada';
}

function getTransportadoraLabel(row) {
  if (row.tipo !== 'transportadora') return 'Retirada';
  return row.transportadora_nome || row.transportadora_nome_manual || '-';
}

export default function Entregas() {
  const [items, setItems] = useState([]);
  const [filtro, setFiltro] = useState('pendentes');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: '',
    type: 'error',
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [entregaSelecionada, setEntregaSelecionada] = useState(null);

  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [documentoRecebedor, setDocumentoRecebedor] = useState('');
  const [placaVeiculo, setPlacaVeiculo] = useState('');
  const [codigoRastreio, setCodigoRastreio] = useState('');
  const [observacoesSaida, setObservacoesSaida] = useState('');
  const [fotoSaidaBase64, setFotoSaidaBase64] = useState('');
  const [assinaturaBase64, setAssinaturaBase64] = useState('');

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

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
    const timer = setTimeout(closeToast, 3500);
    return () => clearTimeout(timer);
  }, [toast.open]);

  const endpoint =
    filtro === 'hoje' ? '/entregas/saidas-hoje' : '/entregas/pendentes';

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(endpoint);
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setItems([]);
      showToast(
        error?.response?.data?.message || 'Erro ao carregar entregas.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filtro]);

  const resetModal = () => {
    setEntregaSelecionada(null);
    setNomeRecebedor('');
    setDocumentoRecebedor('');
    setPlacaVeiculo('');
    setCodigoRastreio('');
    setObservacoesSaida('');
    setFotoSaidaBase64('');
    setAssinaturaBase64('');
    setModalOpen(false);
  };

  const abrirModalEntrega = (row) => {
    setEntregaSelecionada(row);
    setNomeRecebedor('');
    setDocumentoRecebedor('');
    setPlacaVeiculo('');
    setCodigoRastreio('');
    setObservacoesSaida('');
    setFotoSaidaBase64('');
    setAssinaturaBase64('');
    setModalOpen(true);

    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#111827';
    }, 50);
  };

  const iniciarDesenho = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(
      (event.clientX || event.touches?.[0]?.clientX) - rect.left,
      (event.clientY || event.touches?.[0]?.clientY) - rect.top,
    );
  };

  const desenhar = (event) => {
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');

    ctx.lineTo(
      (event.clientX || event.touches?.[0]?.clientX) - rect.left,
      (event.clientY || event.touches?.[0]?.clientY) - rect.top,
    );
    ctx.stroke();
  };

  const finalizarDesenho = () => {
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (!canvas) return;

    setAssinaturaBase64(canvas.toDataURL('image/png'));
  };

  const limparAssinatura = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setAssinaturaBase64('');
  };

  const handleFotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFotoSaidaBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const concluirEntrega = async () => {
    if (!entregaSelecionada) return;

    const nomeRecebedorLimpo = String(nomeRecebedor || '').trim();

    if (!nomeRecebedorLimpo) {
      showToast('Informe quem retirou a mercadoria.', 'error');
      return;
    }

    if (!assinaturaBase64) {
      showToast('Faça a assinatura antes de concluir.', 'error');
      return;
    }

    const payload = {
      tipo: entregaSelecionada.tipo || 'retirada',
      nome_recebedor: nomeRecebedorLimpo,
      documento_recebedor: documentoRecebedor || '',
      placa_veiculo: placaVeiculo || '',
      codigo_rastreio: codigoRastreio || '',
      observacoes_saida: observacoesSaida || '',
      foto_saida_url: fotoSaidaBase64 || null,
      assinatura_saida_url: assinaturaBase64,
    };

    try {
      setSaving(true);

      await api.patch(
        `/entregas/${entregaSelecionada.venda_id}/entregar`,
        payload,
      );

      showToast('Saída registrada com sucesso.', 'success');
      resetModal();
      await load();
    } catch (error) {
      console.error(error);
      showToast(
        error?.response?.data?.message || 'Erro ao concluir entrega.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />

      <Card
        title='Entregas'
        subtitle='Controle de saídas da empresa e coletas por transportadora.'
      >
        <div className='entregas-page__top'>
          <div className='entregas-page__filters'>
            <button
              className={`btn ${filtro === 'pendentes' ? 'btn--primary' : 'btn--secondary'}`}
              type='button'
              onClick={() => setFiltro('pendentes')}
            >
              Pendentes
            </button>

            <button
              className={`btn ${filtro === 'hoje' ? 'btn--primary' : 'btn--secondary'}`}
              type='button'
              onClick={() => setFiltro('hoje')}
            >
              Saídas de hoje
            </button>
          </div>
        </div>

        <div className='entregas-page__cards'>
          {items.length ? (
            items.map((row) => (
              <article
                key={row.venda_id || row.id}
                className='entregas-page__card'
                onClick={() => abrirModalEntrega(row)}
              >
                <div className='entregas-page__card-header'>
                  <div>
                    <h3 className='entregas-page__title'>Entrega #{row.id}</h3>
                    <p className='entregas-page__subtitle'>
                      Venda {row.venda_id ? `#${row.venda_id}` : '-'}
                    </p>
                  </div>

                  <StatusBadge status={row.status || 'pendente'} />
                </div>

                <div className='entregas-page__meta-grid'>
                  <div className='entregas-page__meta'>
                    <span className='entregas-page__meta-label'>Cliente</span>
                    <strong>{row.cliente_nome || '-'}</strong>
                  </div>

                  <div className='entregas-page__meta'>
                    <span className='entregas-page__meta-label'>
                      Qtd. total
                    </span>
                    <strong>{row.quantidade_total || '-'}</strong>
                  </div>

                  <div className='entregas-page__meta'>
                    <span className='entregas-page__meta-label'>Tipo</span>
                    <strong>{getTipoEntregaLabel(row)}</strong>
                  </div>

                  <div className='entregas-page__meta'>
                    <span className='entregas-page__meta-label'>
                      Transportadora
                    </span>
                    <strong>{getTransportadoraLabel(row)}</strong>
                  </div>

                  <div className='entregas-page__meta'>
                    <span className='entregas-page__meta-label'>
                      Prazo combinado
                    </span>
                    <strong>{formatDateOnly(row.prazo_entrega)}</strong>
                  </div>

                  <div className='entregas-page__meta'>
                    <span className='entregas-page__meta-label'>
                      {filtro === 'hoje' ? 'Saiu em' : 'Criado em'}
                    </span>
                    <strong>
                      {formatDate(
                        filtro === 'hoje'
                          ? row.retirado_em || row.entregue_em
                          : row.criado_em,
                      )}
                    </strong>
                  </div>
                </div>

                {filtro === 'pendentes' && (
                  <div className='entregas-page__actions'>
                    <button
                      className='btn btn--primary'
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirModalEntrega(row);
                      }}
                      disabled={loading || saving}
                    >
                      Registrar saída
                    </button>
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className='entregas-page__empty'>
              Nenhum registro encontrado para este filtro.
            </div>
          )}
        </div>
      </Card>

      {modalOpen && entregaSelecionada && (
        <div className='entregas-modal'>
          <div className='entregas-modal__backdrop' onClick={resetModal} />

          <div className='entregas-modal__card'>
            <div className='entregas-modal__header'>
              <h2 className='entregas-modal__title'>Registrar saída</h2>
              <button
                type='button'
                className='entregas-modal__close'
                onClick={resetModal}
              >
                ×
              </button>
            </div>

            <div className='entregas-modal__summary'>
              <div>
                <strong>Venda:</strong> #{entregaSelecionada.venda_id || '-'}
              </div>
              <div>
                <strong>Cliente:</strong>{' '}
                {entregaSelecionada.cliente_nome || '-'}
              </div>
              <div>
                <strong>Tipo:</strong> {getTipoEntregaLabel(entregaSelecionada)}
              </div>
              <div>
                <strong>Transportadora:</strong>{' '}
                {getTransportadoraLabel(entregaSelecionada)}
              </div>
              <div>
                <strong>Prazo combinado:</strong>{' '}
                {formatDateOnly(entregaSelecionada.prazo_entrega)}
              </div>
              <div>
                <strong>Qtd. total:</strong>{' '}
                {entregaSelecionada.quantidade_total || '-'}
              </div>
            </div>

            <div className='entregas-modal__items-box'>
              <span className='entregas-modal__items-title'>
                Itens a enviar
              </span>

              {Array.isArray(entregaSelecionada.itens) &&
              entregaSelecionada.itens.length ? (
                <div className='entregas-modal__items-list'>
                  {entregaSelecionada.itens.map((item, index) => (
                    <div
                      key={`${item.produto_nome}-${index}`}
                      className='entregas-modal__item-row'
                    >
                      <span className='entregas-modal__item-name'>
                        {item.produto_nome}
                      </span>
                      <span className='entregas-modal__item-qty'>
                        {Number(item.quantidade).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>-</p>
              )}
            </div>

            <div className='entregas-modal__form'>
              <label className='entregas-modal__field'>
                <span>Nome de quem retirou / recebeu</span>
                <input
                  value={nomeRecebedor}
                  onChange={(e) => setNomeRecebedor(e.target.value)}
                />
              </label>

              <label className='entregas-modal__field'>
                <span>Documento</span>
                <input
                  value={documentoRecebedor}
                  onChange={(e) => setDocumentoRecebedor(e.target.value)}
                />
              </label>

              <label className='entregas-modal__field'>
                <span>Placa do veículo</span>
                <input
                  value={placaVeiculo}
                  onChange={(e) => setPlacaVeiculo(e.target.value)}
                />
              </label>

              {entregaSelecionada.tipo === 'transportadora' && (
                <label className='entregas-modal__field'>
                  <span>Código de rastreio</span>
                  <input
                    value={codigoRastreio}
                    onChange={(e) => setCodigoRastreio(e.target.value)}
                  />
                </label>
              )}

              <label className='entregas-modal__field entregas-modal__field--full'>
                <span>Observações da saída</span>
                <textarea
                  rows={3}
                  value={observacoesSaida}
                  onChange={(e) => setObservacoesSaida(e.target.value)}
                />
              </label>

              <label className='entregas-modal__field entregas-modal__field--full'>
                <span>Foto da saída</span>
                <input
                  type='file'
                  accept='image/*'
                  capture='environment'
                  onChange={handleFotoChange}
                />
              </label>

              <div className='entregas-modal__field entregas-modal__field--full'>
                <span>Assinatura</span>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={180}
                  className='entregas-modal__signature'
                  onMouseDown={iniciarDesenho}
                  onMouseMove={desenhar}
                  onMouseUp={finalizarDesenho}
                  onMouseLeave={finalizarDesenho}
                  onTouchStart={iniciarDesenho}
                  onTouchMove={desenhar}
                  onTouchEnd={finalizarDesenho}
                />
                <button
                  type='button'
                  className='btn btn--secondary'
                  onClick={limparAssinatura}
                >
                  Limpar assinatura
                </button>
              </div>
            </div>

            <div className='entregas-modal__actions'>
              <button
                type='button'
                className='btn btn--secondary'
                onClick={resetModal}
              >
                Cancelar
              </button>

              <button
                type='button'
                className='btn btn--primary'
                onClick={concluirEntrega}
                disabled={saving}
              >
                {saving ? 'Salvando...' : 'Concluir saída'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
