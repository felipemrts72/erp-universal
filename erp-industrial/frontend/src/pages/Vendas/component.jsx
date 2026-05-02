import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import BuscaManual from '../../components/BuscaManual';
import ModalSelecao from '../../components/ModalSelecao';
import FormasPagamentoEditor from '../../components/FormasPagamentoEditor';
import {
  createPagamentoItem,
  normalizePagamento,
  validarPagamentos,
} from '../../utils/pagamentos';
import { imagemPublicaParaBase64 } from '../../utils/imagensDocumento';
import {
  gerarHtmlDocumento,
  imprimirDocumento,
} from '../../utils/documentoPrint';
import LoadingModal from '../../components/LoadingModal';
import { useToast } from '../../contexts/ToastContext';
import ActionContextMenu from '../../components/ActionContextMenu/ActionContextMenu';
import ActionMenu from '../../components/ActionMenu/ActionMenu';

import './style.css';

const initialItem = {
  produto_id: null,
  produto_nome: '',
  quantidade: 1,
  preco_unitario: 0,
  desconto_valor: 0,
  desconto_percentual: 0,
};

const initialCliente = {
  clienteNome: '',
  cliente_id: null,
  nome_completo: '',
  telefone: '',
  email: '',
  cpf_cnpj: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: '',
  cep: '',
  tipo_entrega: 'retirada',
  transportadora_id: null,
  transportadora_nome_manual: '',
  observacoes_entrega: '',
  prazo_entrega: '',
  observacoes: '',
  desconto_geral: 0,
  formas_pagamento: [createPagamentoItem()],
};

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  return Number(String(value).replace(',', '.')) || 0;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function formatDateOnly(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

function getStatusLabel(status) {
  const map = {
    aguardando_retirada: 'Aguardando retirada',
    em_fabricacao: 'Em fabricação',
    processo_de_compra: 'Processo de compra',
    producao_e_compra: 'Produção e compra',
  };

  return map[status] || status || '-';
}

function getStatusClass(status) {
  const map = {
    aguardando_retirada: 'vendas-page__badge vendas-page__badge--ready',
    em_fabricacao: 'vendas-page__badge vendas-page__badge--production',
    processo_de_compra: 'vendas-page__badge vendas-page__badge--purchase',
    producao_e_compra: 'vendas-page__badge vendas-page__badge--mixed',
  };

  return map[status] || 'vendas-page__badge';
}

export default function Vendas() {
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  const [modalImpressaoOpen, setModalImpressaoOpen] = useState(false);
  const [documentoParaImprimir, setDocumentoParaImprimir] = useState(null);

  const [listaContextMenuOpen, setListaContextMenuOpen] = useState(false);
  const [listaContextMenuX, setListaContextMenuX] = useState(0);
  const [listaContextMenuY, setListaContextMenuY] = useState(0);
  const [vendaContexto, setVendaContexto] = useState(null);

  const [clienteForm, setClienteForm] = useState(initialCliente);
  const [itemForm, setItemForm] = useState(initialItem);
  const [itens, setItens] = useState([]);

  const [transportadoras, setTransportadoras] = useState([]);
  const [usarTransportadoraManual, setUsarTransportadoraManual] =
    useState(false);

  const [modalClienteOpen, setModalClienteOpen] = useState(false);

  const clienteNaoCadastrado = !clienteForm.cliente_id;

  const load = async () => {
    try {
      setLoading(true);

      const { data } = await api.get('/vendas');
      setItems(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar vendas', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };
  const handleVendaContextMenu = (event, row) => {
    event.preventDefault();
    setVendaContexto(row);
    setListaContextMenuX(event.clientX);
    setListaContextMenuY(event.clientY);
    setListaContextMenuOpen(true);
  };

  const loadTransportadoras = async () => {
    try {
      const { data } = await api.get('/transportadoras?somenteAtivas=true');
      setTransportadoras(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setTransportadoras([]);
      showToast('Erro ao carregar transportadoras', 'error');
    }
  };

  useEffect(() => {
    const fecharMenu = () => {
      setListaContextMenuOpen(false);
    };

    window.addEventListener('click', fecharMenu);
    return () => window.removeEventListener('click', fecharMenu);
  }, []);

  useEffect(() => {
    load();
    loadTransportadoras();
  }, []);

  const totais = useMemo(() => {
    const bruto = itens.reduce((acc, item) => {
      return acc + toNumber(item.quantidade) * toNumber(item.preco_unitario);
    }, 0);

    const descontoItens = itens.reduce((acc, item) => {
      const quantidade = toNumber(item.quantidade);
      const preco = toNumber(item.preco_unitario);
      const subtotal = quantidade * preco;

      const descontoValor = toNumber(item.desconto_valor);
      const descontoPercentual = toNumber(item.desconto_percentual);

      const descontoCalculado =
        descontoValor > 0
          ? descontoValor * quantidade
          : subtotal * (descontoPercentual / 100);

      return acc + descontoCalculado;
    }, 0);

    const descontoGeral = toNumber(clienteForm.desconto_geral);
    const liquido = Math.max(bruto - descontoItens - descontoGeral, 0);

    return {
      itens: itens.length,
      bruto,
      descontoItens,
      descontoGeral,
      liquido,
    };
  }, [itens, clienteForm.desconto_geral]);

  const resetFormulario = () => {
    setClienteForm(initialCliente);
    setItemForm(initialItem);
    setItens([]);
    setUsarTransportadoraManual(false);
  };

  const handleClienteChange = (field, value) => {
    setClienteForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClienteSelect = (id, item) => {
    if (!item) return;

    setClienteForm((prev) => ({
      ...prev,
      cliente_id: id || null,
      clienteNome: item?.nome_fantasia || item?.nome || '',
      nome_completo: item?.nome || '',
      telefone: item?.telefone || '',
      email: item?.email || '',
      cpf_cnpj: item?.cpf_cnpj || '',
      endereco: item?.endereco || '',
      numero: item?.numero || '',
      bairro: item?.bairro || '',
      cidade: item?.cidade || '',
      cep: item?.cep || '',
    }));
  };

  const handleProdutoSelect = (id, item) => {
    if (!item) return;

    setItemForm((prev) => ({
      ...prev,
      produto_id: id,
      produto_nome: item.nome || '',
      preco_unitario: toNumber(item.preco_venda ?? item.preco ?? 0),
    }));
  };

  const adicionarItem = () => {
    if (!itemForm.produto_id) {
      showToast('Selecione um produto', 'error');
      return;
    }

    if (toNumber(itemForm.quantidade) <= 0) {
      showToast('Quantidade inválida', 'error');
      return;
    }

    if (toNumber(itemForm.preco_unitario) < 0) {
      showToast('Preço inválido', 'error');
      return;
    }

    setItens((prev) => [
      ...prev,
      {
        ...itemForm,
        quantidade: toNumber(itemForm.quantidade),
        preco_unitario: toNumber(itemForm.preco_unitario),
        desconto_valor: toNumber(itemForm.desconto_valor),
        desconto_percentual: toNumber(itemForm.desconto_percentual),
      },
    ]);

    setItemForm(initialItem);
  };

  const removerItem = (index) => {
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const criarVenda = async () => {
    if (!clienteForm.clienteNome.trim()) {
      showToast('Informe o nome do cliente', 'error');
      return;
    }

    if (clienteNaoCadastrado) {
      if (!clienteForm.nome_completo.trim()) {
        showToast('Informe o nome completo ou razão social', 'error');
        return;
      }

      if (!clienteForm.telefone.trim()) {
        showToast('Informe o telefone', 'error');
        return;
      }

      if (!clienteForm.email.trim()) {
        showToast('Informe o e-mail', 'error');
        return;
      }

      if (!clienteForm.cpf_cnpj.trim()) {
        showToast('Informe o CPF/CNPJ', 'error');
        return;
      }

      if (!clienteForm.endereco.trim()) {
        showToast('Informe o endereço', 'error');
        return;
      }

      if (!clienteForm.numero.trim()) {
        showToast('Informe o número', 'error');
        return;
      }

      if (!clienteForm.bairro.trim()) {
        showToast('Informe o bairro', 'error');
        return;
      }

      if (!clienteForm.cidade.trim()) {
        showToast('Informe a cidade', 'error');
        return;
      }

      if (!clienteForm.cep.trim()) {
        showToast('Informe o CEP', 'error');
        return;
      }
    }

    if (!clienteForm.tipo_entrega) {
      showToast('Informe o tipo de entrega', 'error');
      return;
    }

    if (
      clienteForm.tipo_entrega === 'transportadora' &&
      !clienteForm.transportadora_id &&
      !clienteForm.transportadora_nome_manual.trim()
    ) {
      showToast(
        'Selecione uma transportadora ou informe uma manualmente',
        'error',
      );
      return;
    }

    if (!itens.length) {
      showToast('Adicione pelo menos um item', 'error');
      return;
    }
    const erroPagamentos = validarPagamentos(
      clienteForm.formas_pagamento || [],
      totais.liquido,
    );

    if (erroPagamentos) {
      showToast(erroPagamentos, 'error');
      return;
    }

    const payload = {
      clienteNome: clienteForm.clienteNome,
      cliente_id: clienteForm.cliente_id || null,
      nome_completo: clienteForm.nome_completo,
      telefone: clienteForm.telefone,
      email: clienteForm.email,
      cpf_cnpj: clienteForm.cpf_cnpj,
      endereco: clienteForm.endereco,
      numero: clienteForm.numero,
      bairro: clienteForm.bairro,
      cidade: clienteForm.cidade,
      cep: clienteForm.cep,
      tipo_entrega: clienteForm.tipo_entrega || 'retirada',
      transportadora_id:
        clienteForm.tipo_entrega === 'transportadora'
          ? clienteForm.transportadora_id || null
          : null,
      transportadora_nome_manual:
        clienteForm.tipo_entrega === 'transportadora'
          ? clienteForm.transportadora_nome_manual || ''
          : '',
      observacoes_entrega: clienteForm.observacoes_entrega || '',
      prazo_entrega: clienteForm.prazo_entrega || '',
      observacoes: clienteForm.observacoes || '',
      desconto_geral: toNumber(clienteForm.desconto_geral),
      formas_pagamento: (clienteForm.formas_pagamento || []).map(
        normalizePagamento,
      ),
      itens: itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: toNumber(item.quantidade),
        preco_unitario: toNumber(item.preco_unitario),
        desconto_valor: toNumber(item.desconto_valor),
        desconto_percentual: toNumber(item.desconto_percentual),
      })),
    };

    try {
      setSaving(true);
      const { data } = await api.post('/vendas', payload);

      showToast('Venda criada com sucesso', 'success');

      const clienteDocumento = await montarClienteDocumento(
        data?.cliente_id || clienteForm.cliente_id,
        data?.cliente_nome || clienteForm.clienteNome,
      );

      setDocumentoParaImprimir({
        tipo: 'venda',
        numero: data?.id || '',
        cliente: clienteDocumento,
        observacoes: clienteForm.observacoes || '',
        formas_pagamento: (clienteForm.formas_pagamento || []).map(
          normalizePagamento,
        ),
        itens: itens.map((item) => {
          const quantidade = toNumber(item.quantidade);
          const preco = toNumber(item.preco_unitario);
          const subtotal = quantidade * preco;

          const descontoValor = toNumber(item.desconto_valor);
          const descontoPercentual = toNumber(item.desconto_percentual);

          const descontoCalculado =
            descontoValor > 0
              ? descontoValor * quantidade
              : subtotal * (descontoPercentual / 100);

          return {
            ...item,
            desconto_label:
              descontoValor > 0
                ? formatMoney(descontoValor)
                : `${descontoPercentual || 0}%`,
            total_liquido: subtotal - descontoCalculado,
          };
        }),
        totais: {
          bruto: totais.bruto,
          descontoItens: totais.descontoItens,
          descontoGeral: totais.descontoGeral,
          liquido: totais.liquido,
        },
      });

      setModalImpressaoOpen(true);

      setModalOpen(false);
      resetFormulario();
      await load();
    } catch (err) {
      console.error(err);

      const errorData = err?.response?.data;

      if (errorData?.code === 'ESTOQUE_INSUFICIENTE') {
        const itensSemEstoque = errorData?.itens_sem_estoque || [];

        const mensagemDetalhada = itensSemEstoque.length
          ? itensSemEstoque
              .map(
                (item) =>
                  `${item.produto_nome}: saldo ${item.saldo_atual}, faltam ${item.faltante}`,
              )
              .join(' | ')
          : errorData?.message;

        showToast(
          mensagemDetalhada || 'Há itens sem estoque suficiente.',
          'warning',
        );

        return;
      }

      showToast(errorData?.message || 'Erro ao criar venda', 'error');
    } finally {
      setSaving(false);
    }
  };

  const montarClienteDocumento = async (cliente_id, fallbackNome = '') => {
    if (!cliente_id) {
      return {
        nome: fallbackNome || '',
        endereco: clienteForm.endereco || '',
        numero: clienteForm.numero || '',
        bairro: clienteForm.bairro || '',
        cidade: clienteForm.cidade || '',
        cep: clienteForm.cep || '',
        telefone: clienteForm.telefone || '',
        email: clienteForm.email || '',
        cpf_cnpj: clienteForm.cpf_cnpj || '',
      };
    }

    try {
      const { data } = await api.get(`/clientes/${cliente_id}`);
      return {
        nome: data.nome_fantasia || data.nome || fallbackNome || '',
        endereco: data.endereco || '',
        numero: data.numero || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        cep: data.cep || '',
        telefone: data.telefone || '',
        email: data.email || '',
        cpf_cnpj: data.cpf_cnpj || '',
      };
    } catch {
      return {
        nome: fallbackNome || '',
        endereco: clienteForm.endereco || '',
        numero: clienteForm.numero || '',
        bairro: clienteForm.bairro || '',
        cidade: clienteForm.cidade || '',
        cep: clienteForm.cep || '',
        telefone: clienteForm.telefone || '',
        email: clienteForm.email || '',
        cpf_cnpj: clienteForm.cpf_cnpj || '',
      };
    }
  };

  const imprimirVendaExistente = async (id) => {
    try {
      setLoading(true);

      const venda = items.find((item) => Number(item.id) === Number(id));

      if (!venda) {
        showToast('Venda não encontrada para impressão', 'error');
        return;
      }

      const clienteDocumento = await montarClienteDocumento(
        venda.cliente_id,
        venda.cliente_nome,
      );

      const itensDocumento = (venda.itens || []).map((item) => {
        const quantidade = toNumber(item.quantidade);
        const preco = toNumber(item.preco_unitario);
        const subtotal = quantidade * preco;

        const descontoValor = toNumber(item.desconto_valor);
        const descontoPercentual = toNumber(item.desconto_percentual);

        const descontoCalculado =
          descontoValor > 0
            ? descontoValor * quantidade
            : subtotal * (descontoPercentual / 100);

        return {
          ...item,
          desconto_label:
            descontoValor > 0
              ? formatMoney(descontoValor)
              : `${descontoPercentual || 0}%`,
          total_liquido: subtotal - descontoCalculado,
        };
      });

      const bruto = itensDocumento.reduce(
        (acc, item) =>
          acc + toNumber(item.quantidade) * toNumber(item.preco_unitario),
        0,
      );

      const descontoItens = itensDocumento.reduce((acc, item) => {
        const quantidade = toNumber(item.quantidade);
        const preco = toNumber(item.preco_unitario);
        const subtotal = quantidade * preco;

        const descontoValor = toNumber(item.desconto_valor);
        const descontoPercentual = toNumber(item.desconto_percentual);

        const descontoCalculado =
          descontoValor > 0
            ? descontoValor * quantidade
            : subtotal * (descontoPercentual / 100);

        return acc + descontoCalculado;
      }, 0);

      const descontoGeral = toNumber(venda.desconto_geral || 0);

      setDocumentoParaImprimir({
        tipo: 'venda',
        numero: venda.id,
        cliente: clienteDocumento,
        observacoes: venda.observacoes || '',
        formas_pagamento: Array.isArray(venda.formas_pagamento)
          ? venda.formas_pagamento.map(normalizePagamento)
          : [],
        itens: itensDocumento,
        totais: {
          bruto,
          descontoItens,
          descontoGeral,
          liquido: Math.max(bruto - descontoItens - descontoGeral, 0),
        },
      });

      setModalImpressaoOpen(true);
    } catch (error) {
      console.error(error);
      showToast('Erro ao preparar impressão da venda', 'error');
    } finally {
      setLoading(false);
    }
  };

  const clonarVenda = async (id) => {
    try {
      setLoading(true);

      const venda = items.find((item) => Number(item.id) === Number(id));

      if (!venda) {
        showToast('Venda não encontrada para clonagem', 'error');
        return;
      }

      setClienteForm({
        ...initialCliente,
        clienteNome: venda.cliente_nome || '',
        cliente_id: venda.cliente_id || null,
        tipo_entrega: venda.tipo_entrega || 'retirada',
        transportadora_id: venda.transportadora_id || null,
        transportadora_nome_manual: venda.transportadora_nome_manual || '',
        observacoes_entrega: venda.observacoes_entrega || '',
        prazo_entrega: venda.prazo_entrega
          ? String(venda.prazo_entrega).slice(0, 10)
          : '',
        observacoes: venda.observacoes || '',
        desconto_geral: venda.desconto_geral || 0,
        formas_pagamento:
          Array.isArray(venda.formas_pagamento) && venda.formas_pagamento.length
            ? venda.formas_pagamento.map((item) => ({
                ...normalizePagamento(item),
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                valor: item.valor,
              }))
            : [createPagamentoItem()],
      });

      setItens(
        (venda.itens || []).map((item) => ({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome || '',
          quantidade: toNumber(item.quantidade),
          preco_unitario: toNumber(item.preco_unitario),
          desconto_valor: toNumber(item.desconto_valor),
          desconto_percentual: toNumber(item.desconto_percentual),
        })),
      );

      setModalOpen(true);
      setListaContextMenuOpen(false);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      showToast(`Venda #${venda.id} carregada para clonagem`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao clonar venda', 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalhesVenda = (id) => {
    const venda = items.find((item) => Number(item.id) === Number(id));

    if (!venda) {
      showToast('Venda não encontrada', 'error');
      return;
    }

    showToast(`Venda #${venda.id} selecionada`, 'success');
  };

  return (
    <>
      {(loading || saving) && <LoadingModal />}

      <Card
        title='Vendas'
        subtitle='Acompanhe somente o que ainda está em aberto.'
      >
        <div className='vendas-page__top-action'>
          <button
            className='btn btn--main vendas-page__new-button'
            type='button'
            onClick={() => {
              resetFormulario();
              setModalOpen(true);
            }}
          >
            Realizar venda
          </button>
        </div>

        <div className='vendas-page__cards'>
          {items.length ? (
            items.map((venda) => {
              const itensVenda = Array.isArray(venda.itens) ? venda.itens : [];
              const totalItens = Number(venda.total_itens || 0);

              return (
                <article
                  key={venda.id}
                  className='vendas-page__sale-card'
                  onContextMenu={(event) =>
                    handleVendaContextMenu(event, venda)
                  }
                >
                  <div className='vendas-page__sale-header'>
                    <div>
                      <h3 className='vendas-page__sale-title'>
                        Venda #{venda.id}
                      </h3>
                      <p className='vendas-page__sale-client'>
                        {venda.cliente_nome || 'Cliente não informado'}
                      </p>
                    </div>

                    <span className={getStatusClass(venda.status_venda)}>
                      {getStatusLabel(venda.status_venda)}
                    </span>
                    <ActionMenu
  onOpen={() => setVendaContexto(venda)}
  actions={[
    {
      key: 'print',
      label: 'Reimprimir venda',
      onClick: () => imprimirVendaExistente(venda.id),
    },
    {
      key: 'clone',
      label: 'Clonar venda',
      onClick: () => clonarVenda(venda.id),
    },
    {
      key: 'details',
      label: 'Ver detalhes',
      onClick: () => abrirDetalhesVenda(venda.id),
    },
  ]}
/>
                  </div>

                  <div className='vendas-page__sale-body'>
                    <div className='vendas-page__meta'>
                      <span className='vendas-page__meta-label'>Criada em</span>
                      <strong>{formatDate(venda.criado_em)}</strong>
                    </div>

                    <div className='vendas-page__meta'>
                      <span className='vendas-page__meta-label'>Itens</span>
                      <strong>{totalItens}</strong>
                    </div>

                    <div className='vendas-page__meta'>
                      <span className='vendas-page__meta-label'>
                        Total bruto
                      </span>
                      <strong>{formatMoney(venda.valor_total || 0)}</strong>
                    </div>

                    <div className='vendas-page__meta'>
                      <span className='vendas-page__meta-label'>
                        Desconto geral
                      </span>
                      <strong>{formatMoney(venda.desconto_geral || 0)}</strong>
                    </div>

                    <div className='vendas-page__meta'>
                      <span className='vendas-page__meta-label'>
                        Total líquido
                      </span>
                      <strong className='vendas-page__summary-total'>
                        Total líquido:{' '}
                        {formatMoney(
                          venda.valor_liquido || venda.valor_total || 0,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className='vendas-page__meta'>
                    <span className='vendas-page__meta-label'>Entrega</span>
                    <strong>
                      {venda.tipo_entrega === 'transportadora'
                        ? 'Transportadora'
                        : 'Retirada'}
                    </strong>
                  </div>

                  {venda.tipo_entrega === 'transportadora' && (
                    <div className='vendas-page__meta'>
                      <span className='vendas-page__meta-label'>
                        Transportadora
                      </span>
                      <strong>
                        {venda.transportadora_nome ||
                          venda.transportadora_nome_manual ||
                          '-'}
                      </strong>
                    </div>
                  )}

                  {!!venda.prazo_entrega && (
                    <div className='vendas-page__meta'>
                      <span className='vendas-page__meta-label'>
                        Prazo de entrega
                      </span>
                      <strong>{formatDateOnly(venda.prazo_entrega)}</strong>
                    </div>
                  )}

                  <div className='vendas-page__sale-items'>
                    {itensVenda.map((item) => (
                      <div
                        key={`${venda.id}-${item.id || item.produto_id}`}
                        className='vendas-page__sale-item'
                      >
                        <span className='vendas-page__sale-item-name'>
                          {item.produto_nome}
                        </span>

                        <span className='vendas-page__sale-item-detail'>
                          {item.quantidade} × {formatMoney(item.preco_unitario)}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })
          ) : (
            <div className='vendas-page__empty'>
              Nenhuma venda aberta encontrada.
            </div>
          )}
        </div>
      </Card>

      {modalOpen && (
        <div className='vendas-page__modal'>
          <div
            className='vendas-page__modal-backdrop'
            onClick={() => setModalOpen(false)}
          />

          <div className='vendas-page__modal-card'>
            <div className='vendas-page__modal-header'>
              <h2 className='vendas-page__modal-title'>Realizar venda</h2>
              <button
                type='button'
                className='vendas-page__modal-close'
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className='vendas-page__form-grid'>
              <div className='vendas-page__field vendas-page__field--full'>
                <span>Cliente</span>

                <div className='orcamentos-page__cliente'>
                  <input
                    value={clienteForm.clienteNome}
                    onChange={(e) =>
                      setClienteForm((prev) => ({
                        ...prev,
                        clienteNome: e.target.value,
                        cliente_id: null,
                        nome_completo: '',
                        telefone: '',
                        email: '',
                        cpf_cnpj: '',
                        endereco: '',
                        numero: '',
                        bairro: '',
                        cidade: '',
                        cep: '',
                      }))
                    }
                    placeholder='Digite o nome do cliente ou use a lupa'
                  />

                  <button
                    type='button'
                    className='btn btn--primary'
                    onClick={() => setModalClienteOpen(true)}
                  >
                    Buscar Clientes 🔍
                  </button>
                </div>
              </div>
            </div>
            {clienteNaoCadastrado ? (
              <div className='vendas-page__form-grid'>
                <label className='vendas-page__field vendas-page__field--full'>
                  <span>Nome completo / Razão social</span>
                  <input
                    value={clienteForm.nome_completo}
                    onChange={(e) =>
                      handleClienteChange('nome_completo', e.target.value)
                    }
                    placeholder='Nome oficial do cliente para cadastro e documentos'
                  />
                </label>
                <label className='vendas-page__field'>
                  <span>Telefone</span>
                  <input
                    value={clienteForm.telefone}
                    onChange={(e) =>
                      handleClienteChange('telefone', e.target.value)
                    }
                  />
                </label>

                <label className='vendas-page__field'>
                  <span>E-mail</span>
                  <input
                    value={clienteForm.email}
                    onChange={(e) =>
                      handleClienteChange('email', e.target.value)
                    }
                  />
                </label>

                <label className='vendas-page__field'>
                  <span>CPF/CNPJ</span>
                  <input
                    value={clienteForm.cpf_cnpj}
                    onChange={(e) =>
                      handleClienteChange('cpf_cnpj', e.target.value)
                    }
                  />
                </label>

                <label className='vendas-page__field vendas-page__field--full'>
                  <span>Endereço</span>
                  <input
                    value={clienteForm.endereco}
                    onChange={(e) =>
                      handleClienteChange('endereco', e.target.value)
                    }
                  />
                </label>

                <label className='vendas-page__field'>
                  <span>Número</span>
                  <input
                    value={clienteForm.numero}
                    onChange={(e) =>
                      handleClienteChange('numero', e.target.value)
                    }
                  />
                </label>

                <label className='vendas-page__field'>
                  <span>Bairro</span>
                  <input
                    value={clienteForm.bairro}
                    onChange={(e) =>
                      handleClienteChange('bairro', e.target.value)
                    }
                  />
                </label>

                <label className='vendas-page__field'>
                  <span>Cidade</span>
                  <input
                    value={clienteForm.cidade}
                    onChange={(e) =>
                      handleClienteChange('cidade', e.target.value)
                    }
                  />
                </label>

                <label className='vendas-page__field'>
                  <span>CEP</span>
                  <input
                    value={clienteForm.cep}
                    onChange={(e) => handleClienteChange('cep', e.target.value)}
                  />
                </label>
              </div>
            ) : (
              <div className='vendas-page__cliente-badge'>
                Cliente cadastrado encontrado. Os dados de cadastro já serão
                usados.
              </div>
            )}

            <div className='vendas-page__item-section'>
              <h3 className='vendas-page__section-title'>Itens da venda</h3>

              <div className='vendas-page__item-form'>
                <div className='vendas-page__field vendas-page__field--product'>
                  <BuscaManual
                    endpoint='/produtos/busca'
                    label='Produto'
                    placeholder='Digite o nome do produto e pressione Enter'
                    extraParams={{ tipos: 'fabricado,revenda,conjunto' }}
                    onSelect={handleProdutoSelect}
                    value={itemForm.produto_nome}
                    onChangeValue={(value) =>
                      setItemForm((prev) => ({
                        ...prev,
                        produto_nome: value,
                        produto_id:
                          value === prev.produto_nome ? prev.produto_id : null,
                      }))
                    }
                  />
                </div>

                <label className='vendas-page__field'>
                  <span>Quantidade</span>
                  <input
                    value={itemForm.quantidade}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        quantidade: e.target.value,
                      }))
                    }
                  />
                </label>

                <label className='vendas-page__field'>
                  <span>Preço unitário</span>
                  <input
                    value={itemForm.preco_unitario}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        preco_unitario: e.target.value,
                      }))
                    }
                  />
                </label>

                <label className='vendas-page__field'>
                  <span>Desc. valor</span>
                  <input
                    value={itemForm.desconto_valor}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        desconto_valor: e.target.value,
                      }))
                    }
                    placeholder='0,00'
                  />
                </label>

                <label className='vendas-page__field'>
                  <span>Desc. %</span>
                  <input
                    value={itemForm.desconto_percentual}
                    onChange={(e) =>
                      setItemForm((prev) => ({
                        ...prev,
                        desconto_percentual: e.target.value,
                      }))
                    }
                    placeholder='0'
                  />
                </label>

                <div className='vendas-page__field vendas-page__field--button'>
                  <button
                    type='button'
                    className='btn btn--secondary'
                    onClick={adicionarItem}
                  >
                    Adicionar item
                  </button>
                </div>
              </div>

              <div className='vendas-page__item-list'>
                {itens.length ? (
                  itens.map((item, index) => {
                    const quantidade = toNumber(item.quantidade);
                    const precoUnitario = toNumber(item.preco_unitario);
                    const subtotal = quantidade * precoUnitario;

                    const descontoValor = toNumber(item.desconto_valor);
                    const descontoPercentual = toNumber(
                      item.desconto_percentual,
                    );

                    const descontoCalculado =
                      descontoValor > 0
                        ? descontoValor * quantidade
                        : subtotal * (descontoPercentual / 100);

                    const totalLiquidoItem = subtotal - descontoCalculado;

                    return (
                      <div
                        key={`${item.produto_id}-${index}`}
                        className='vendas-page__item-card'
                      >
                        <div>
                          <strong>{item.produto_nome}</strong>

                          <p>
                            {quantidade} × {formatMoney(precoUnitario)}
                          </p>

                          <p>Subtotal: {formatMoney(subtotal)}</p>

                          <p>
                            Desconto:{' '}
                            {descontoValor > 0
                              ? formatMoney(descontoValor)
                              : `${descontoPercentual}%`}
                          </p>

                          <p>
                            Total líquido:{' '}
                            <strong>{formatMoney(totalLiquidoItem)}</strong>
                          </p>
                        </div>

                        <button
                          type='button'
                          className='btn btn--secondary'
                          onClick={() => removerItem(index)}
                        >
                          Remover
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className='vendas-page__empty-items'>
                    Nenhum item adicionado.
                  </div>
                )}
              </div>

              <div className='vendas-page__summary'>
                <span>Total de itens: {totais.itens}</span>
                <span>Total bruto: {formatMoney(totais.bruto)}</span>
                <span>
                  Desconto dos itens: {formatMoney(totais.descontoItens)}
                </span>

                <label className='vendas-page__summary-discount'>
                  <span>Desconto geral</span>
                  <input
                    value={clienteForm.desconto_geral}
                    onChange={(e) =>
                      handleClienteChange('desconto_geral', e.target.value)
                    }
                    placeholder='0,00'
                  />
                </label>

                <strong className='vendas-page__summary-total'>
                  Total líquido: {formatMoney(totais.liquido)}
                </strong>
              </div>
            </div>

            <div className='vendas-page__logistica'>
              <h3 className='vendas-page__section-title'>Observações</h3>

              <textarea
                className='orcamento-modal__textarea'
                rows={4}
                maxLength={200}
                value={clienteForm.observacoes || ''}
                onChange={(e) =>
                  handleClienteChange('observacoes', e.target.value)
                }
                placeholder='Digite observações da venda'
              />
            </div>

            <div className='vendas-page__logistica'>
              <FormasPagamentoEditor
                pagamentos={clienteForm.formas_pagamento || []}
                totalLiquido={totais.liquido}
                onChange={(next) =>
                  handleClienteChange('formas_pagamento', next)
                }
                titulo='Formas de pagamento'
              />
            </div>

            <div className='vendas-page__logistica'>
              <h3 className='vendas-page__section-title'>
                Logística da entrega
              </h3>

              <div className='vendas-page__form-grid'>
                <label className='vendas-page__field'>
                  <span>Tipo de entrega</span>
                  <select
                    value={clienteForm.tipo_entrega}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value === 'retirada') {
                        setUsarTransportadoraManual(false);
                      }

                      setClienteForm((prev) => ({
                        ...prev,
                        tipo_entrega: value,
                        transportadora_id:
                          value === 'retirada' ? null : prev.transportadora_id,
                        transportadora_nome_manual:
                          value === 'retirada'
                            ? ''
                            : prev.transportadora_nome_manual,
                      }));
                    }}
                  >
                    <option value='retirada'>Retirada</option>
                    <option value='transportadora'>Transportadora</option>
                  </select>
                </label>

                <label className='vendas-page__field'>
                  <span>Prazo de entrega</span>
                  <input
                    type='date'
                    value={clienteForm.prazo_entrega || ''}
                    onChange={(e) =>
                      handleClienteChange('prazo_entrega', e.target.value)
                    }
                  />
                </label>

                {clienteForm.tipo_entrega === 'transportadora' && (
                  <>
                    <label className='vendas-page__field'>
                      <span>Transportadora</span>
                      <select
                        value={
                          usarTransportadoraManual
                            ? 'outras'
                            : clienteForm.transportadora_id || ''
                        }
                        onChange={(e) => {
                          const value = e.target.value;

                          if (value === 'outras') {
                            setUsarTransportadoraManual(true);
                            setClienteForm((prev) => ({
                              ...prev,
                              transportadora_id: null,
                              transportadora_nome_manual: '',
                            }));
                            return;
                          }

                          setUsarTransportadoraManual(false);
                          setClienteForm((prev) => ({
                            ...prev,
                            transportadora_id: value ? Number(value) : null,
                            transportadora_nome_manual: '',
                          }));
                        }}
                      >
                        <option value=''>Selecione</option>

                        {transportadoras.map((transportadora) => (
                          <option
                            key={transportadora.id}
                            value={transportadora.id}
                          >
                            {transportadora.nome}
                          </option>
                        ))}

                        <option value='outras'>Outras</option>
                      </select>
                    </label>

                    {usarTransportadoraManual && (
                      <label className='vendas-page__field'>
                        <span>Nome da transportadora</span>
                        <input
                          value={clienteForm.transportadora_nome_manual}
                          onChange={(e) =>
                            handleClienteChange(
                              'transportadora_nome_manual',
                              e.target.value,
                            )
                          }
                          placeholder='Digite o nome da transportadora'
                        />
                      </label>
                    )}
                  </>
                )}

                <label className='vendas-page__field vendas-page__field--full'>
                  <span>Observações da entrega</span>
                  <textarea
                    value={clienteForm.observacoes_entrega}
                    onChange={(e) =>
                      handleClienteChange('observacoes_entrega', e.target.value)
                    }
                    placeholder='Ex.: entregar no período da tarde, ligar antes, etc.'
                    rows={3}
                  />
                </label>
              </div>
            </div>

            <div className='vendas-page__modal-actions'>
              <button
                type='button'
                className='btn btn--secondary'
                onClick={() => {
                  resetFormulario();
                  setModalOpen(false);
                }}
              >
                Cancelar
              </button>

              <button
                type='button'
                className='btn btn--main'
                onClick={criarVenda}
              >
                Confirmar venda
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalSelecao
        open={modalClienteOpen}
        title='Pesquisar cliente'
        endpoint='/clientes/busca'
        placeholder='Digite nome, nome fantasia, CPF/CNPJ ou telefone'
        colunas={[
          { key: 'id', label: 'ID' },
          { key: 'nome_fantasia', label: 'Nome fantasia' },
          { key: 'nome', label: 'Nome oficial' },
          { key: 'cpf_cnpj', label: 'CPF/CNPJ' },
        ]}
        onClose={() => setModalClienteOpen(false)}
        onConfirm={(item) => {
          setClienteForm((prev) => ({
            ...prev,
            cliente_id: item.id,
            clienteNome: item.nome_fantasia || item.nome || '',
            nome_completo: item.nome || '',
            telefone: item.telefone || '',
            email: item.email || '',
            cpf_cnpj: item.cpf_cnpj || '',
            endereco: item.endereco || '',
            numero: item.numero || '',
            bairro: item.bairro || '',
            cidade: item.cidade || '',
            cep: item.cep || '',
          }));
          setModalClienteOpen(false);
        }}
        formatarValor={(item) =>
          item.nome_fantasia || item.nome || `#${item.id}`
        }
      />

      {modalImpressaoOpen && (
        <div className='vendas-page__modal'>
          <div
            className='vendas-page__modal-backdrop'
            onClick={() => setModalImpressaoOpen(false)}
          />

          <div className='vendas-page__modal-card'>
            <div className='vendas-page__modal-header'>
              <h2 className='vendas-page__modal-title'>
                Deseja imprimir este documento?
              </h2>
            </div>

            <div className='vendas-page__modal-actions'>
              <button
                type='button'
                className='btn btn--secondary'
                onClick={() => setModalImpressaoOpen(false)}
              >
                Não
              </button>

<button
  className='btn btn--primary'
  type='button'
  onClick={async () => {
    const logoBase64 = await imagemPublicaParaBase64('/logo.png');
    const assinaturaBase64 = await imagemPublicaParaBase64('/assinatura-proprietario.png');

    const html = gerarHtmlDocumento({
      tipo: 'orcamento',
      numero: documentoParaImprimir.numero,
      empresa: {
        nome: 'TORNEADORA UNIVERSAL',
        endereco: 'R Thiago Magalhães Nunes, 1369, Centro',
        cidade: 'Peixoto De Azevedo',
        estado: 'MT',
        telefone: '(66) 999751055',
        email: 'gerente.torneadorauniversal@gmail.com',
        logoUrl: logoBase64,
      },
      cliente: documentoParaImprimir.cliente,
      itens: documentoParaImprimir.itens,
      totais: documentoParaImprimir.totais,
      formas_pagamento: documentoParaImprimir.formas_pagamento,
      observacoes: documentoParaImprimir.observacoes,
      assinaturaProprietarioUrl: assinaturaBase64,
    });

    imprimirDocumento(html);
    setModalImpressaoOpen(false);
  }}
>
  Sim, imprimir
</button>
            </div>
          </div>
        </div>
      )}
      <ActionContextMenu
        open={listaContextMenuOpen}
        x={listaContextMenuX}
        y={listaContextMenuY}
        onClose={() => setListaContextMenuOpen(false)}
        actions={[
          {
            key: 'print',
            label: 'Reimprimir venda',
            visible: !!vendaContexto,
            onClick: () => imprimirVendaExistente(vendaContexto.id),
          },
          {
            key: 'clone',
            label: 'Clonar venda',
            visible: !!vendaContexto,
            onClick: () => clonarVenda(vendaContexto.id),
          },
          {
            key: 'details',
            label: 'Ver detalhes',
            visible: !!vendaContexto,
            onClick: () => abrirDetalhesVenda(vendaContexto.id),
          },
        ]}
      />
    </>
  );
}
