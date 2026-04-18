import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import BuscaManual from '../../components/BuscaManual';
import LoadingModal from '../../components/LoadingModal';
import OrcamentoFinalizarModal from '../../components/OrcamentoFinalizarModal';
import ModalSelecao from '../../components/ModalSelecao';
import {
  gerarHtmlDocumento,
  imprimirDocumento,
} from '../../utils/documentoPrint';
import ObservacoesModal from '../../components/ObservacoesModal';
import {
  createPagamentoItem,
  normalizePagamento,
} from '../../utils/pagamentos';
import OrcamentoItemContextMenu from '../../components/OrcamentoItemContextMenu';
//import OrcamentoListaContextMenu from '../../components/OrcamentoListaContextMenu/OrcamentoListaContextMenu';
import ActionContextMenu from '../../components/ActionContextMenu/ActionContextMenu';
import OrcamentoItemEditarModal from '../../components/OrcamentoItemEditarModal';
import { useToast } from '../../contexts/ToastContext';

import './style.css';

const initialItem = {
  produto_id: null,
  produto_nome: '',
  quantidade: 1,
  preco_unitario: 0,
  desconto_valor: 0,
  desconto_percentual: 0,
  nome_customizado: '',
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

export default function Orcamentos() {
  const { showToast } = useToast();
  const [orcamentos, setOrcamentos] = useState([]);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteId, setClienteId] = useState(null);
  const [buscaId, setBuscaId] = useState(null);
  const [descontoGeral, setDescontoGeral] = useState(0);

  const [itemForm, setItemForm] = useState(initialItem);
  const [itens, setItens] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [observacoes, setObservacoes] = useState('');
  const [pagamentos, setPagamentos] = useState([createPagamentoItem()]);
  const [modalObservacoesOpen, setModalObservacoesOpen] = useState(false);

  const [modalImpressaoOpen, setModalImpressaoOpen] = useState(false);
  const [documentoParaImprimir, setDocumentoParaImprimir] = useState(null);

  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuX, setContextMenuX] = useState(0);
  const [contextMenuY, setContextMenuY] = useState(0);
  const [itemContexto, setItemContexto] = useState(null);

  const [listaContextMenuOpen, setListaContextMenuOpen] = useState(false);
  const [listaContextMenuX, setListaContextMenuX] = useState(0);
  const [listaContextMenuY, setListaContextMenuY] = useState(0);
  const [orcamentoContexto, setOrcamentoContexto] = useState(null);

  const [itemEditando, setItemEditando] = useState(null);
  const [modalEditarItemOpen, setModalEditarItemOpen] = useState(false);

  const [modoFormulario, setModoFormulario] = useState('novo');
  const [orcamentoEditandoId, setOrcamentoEditandoId] = useState(null);

  const [modalClienteOpen, setModalClienteOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/orcamentos');
      setOrcamentos(Array.isArray(data) ? data : data?.items || []);
    } catch (err) {
      console.error(err);
      showToast('Error ao carregar orçamentos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const [modalAprovacaoOpen, setModalAprovacaoOpen] = useState(false);
  const [orcamentoAprovando, setOrcamentoAprovando] = useState(null);

  const [aprovacaoForm, setAprovacaoForm] = useState({
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
  });

  const [transportadoras, setTransportadoras] = useState([]);
  const [usarTransportadoraManual, setUsarTransportadoraManual] =
    useState(false);

  useEffect(() => {
    load();
    loadTransportadoras();
  }, []);

  const loadTransportadoras = async () => {
    try {
      const { data } = await api.get('/transportadoras?somenteAtivas=true');
      setTransportadoras(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar transportadoras', 'error');
      setTransportadoras([]);
    }
  };

  const abrirModalAprovacao = async (row) => {
    try {
      setLoading(true);

      const { data } = await api.get(`/orcamentos/${row.id}`);

      setOrcamentoAprovando(data);

      setAprovacaoForm({
        nome_completo: data.nome || '',
        telefone: data.telefone || '',
        email: data.email || '',
        cpf_cnpj: data.cpf_cnpj || '',
        endereco: data.endereco || '',
        numero: data.numero || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        cep: data.cep || '',
        tipo_entrega: 'retirada',
        transportadora_id: null,
        transportadora_nome_manual: '',
        observacoes_entrega: '',
        prazo_entrega: '',
      });

      setModalAprovacaoOpen(true);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar dados do orçamento', 'error');
    } finally {
      setLoading(false);
    }

    setUsarTransportadoraManual(false);
  };

  const confirmarAprovacao = async () => {
    if (!orcamentoAprovando) return;

    try {
      setLoading(true);

      await api.post(
        `/orcamentos/${orcamentoAprovando.id}/aprovar`,
        aprovacaoForm,
      );

      fecharModalAprovacao();
      await load();

      showToast('Orçamento aprovado e venda gerada com sucesso', 'success');
    } catch (err) {
      console.error(err);
      showToast(
        err?.response?.data?.message || 'Erro ao aprovar orçamento',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  const totais = useMemo(() => {
    const bruto = itens.reduce(
      (acc, item) =>
        acc + toNumber(item.quantidade) * toNumber(item.preco_unitario),
      0,
    );

    const descontoItens = itens.reduce((acc, item) => {
      const quantidade = toNumber(item.quantidade);
      const precoUnitario = toNumber(item.preco_unitario);
      const subtotal = quantidade * precoUnitario;

      const descontoValorUnitario = toNumber(item.desconto_valor);
      const descontoPercentual = toNumber(item.desconto_percentual);

      const descontoCalculado =
        descontoValorUnitario > 0
          ? descontoValorUnitario * quantidade
          : subtotal * (descontoPercentual / 100);

      return acc + descontoCalculado;
    }, 0);

    const liquido = Math.max(
      bruto - descontoItens - toNumber(descontoGeral),
      0,
    );

    return {
      bruto,
      descontoItens,
      itens: itens.length,
      liquido,
    };
  }, [itens, descontoGeral]);

  const handleProdutoSelect = (id, item) => {
    console.log('handleProdutoSelect -> antes', item);

    if (item?.tipo === 'consumivel') {
      showToast('Consumíveis não podem ser adicionados ao orçamento', 'error');
      return;
    }

    setItemForm((prev) => {
      const proximo = {
        ...prev,
        produto_id: id,
        produto_nome: item?.nome || '',
        nome_customizado: item?.nome || '',
        preco_unitario: toNumber(item?.preco_venda ?? item?.preco ?? 0),
      };
      console.log('handleProdutoSelect -> depois', proximo);
      return proximo;
    });
  };

  const handleOrcamentoContextMenu = (event, row) => {
    event.preventDefault();

    setOrcamentoContexto(row);
    setListaContextMenuX(event.clientX);
    setListaContextMenuY(event.clientY);
    setListaContextMenuOpen(true);
  };

  const handleItemChange = (field, value) => {
    setItemForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const adicionarItem = () => {
    console.log('adicionarItem -> itemForm atual', itemForm);
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

  const limparFormulario = () => {
    setClienteNome('');
    setClienteId(null);
    setItens([]);
    setItemForm(initialItem);
    setDescontoGeral(0);
    setBuscaId(null);
    setModoFormulario('novo');
    setOrcamentoEditandoId(null);
    setModalClienteOpen(false);
    setObservacoes('');
    setPagamentos([createPagamentoItem()]);
    setModalObservacoesOpen(false);
  };

  const abrirModalSalvar = () => {
    if (!clienteNome.trim()) {
      showToast('Informe o nome do cliente', 'error');
      return;
    }

    if (!itens.length) {
      showToast('Adicione pelo menos um item ao orçamento', 'error');
      return;
    }

    setModalOpen(true);
  };

  const confirmarSalvarOrcamento = async ({
    descontoGeral: descontoModal,
    observacoes: observacoesModal,
    pagamentos: pagamentosModal,
  }) => {
    const payload = {
      clienteNome,
      cliente_id: clienteId || null,
      desconto_geral: toNumber(descontoModal),
      observacoes: observacoesModal || '',
      formas_pagamento: (pagamentosModal || []).map(normalizePagamento),
      itens: itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: toNumber(item.quantidade),
        preco_unitario: toNumber(item.preco_unitario),
        desconto_valor: toNumber(item.desconto_valor),
        desconto_percentual: toNumber(item.desconto_percentual),
        nome_customizado:
          item.nome_customizado && item.nome_customizado !== item.produto_nome
            ? item.nome_customizado
            : undefined,
      })),
    };

    try {
      setSaving(true);

      let orcamentoSalvo;

      if (modoFormulario === 'edicao' && orcamentoEditandoId) {
        const { data } = await api.patch(
          `/orcamentos/${orcamentoEditandoId}`,
          payload,
        );
        orcamentoSalvo = data;
      } else {
        const { data } = await api.post('/orcamentos', payload);
        orcamentoSalvo = data;
      }

      const clienteDocumento = await montarClienteDocumento(
        orcamentoSalvo?.cliente_id || clienteId,
        orcamentoSalvo?.cliente_nome || clienteNome,
      );

      setDocumentoParaImprimir({
        tipo: 'orcamento',
        numero: orcamentoSalvo?.id || orcamentoEditandoId || '',
        cliente: clienteDocumento,
        observacoes: observacoesModal || '',
        formas_pagamento: (pagamentosModal || []).map(normalizePagamento),
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
          descontoGeral: toNumber(descontoModal),
          liquido: Math.max(
            totais.bruto - totais.descontoItens - toNumber(descontoModal),
            0,
          ),
        },
      });

      setModalImpressaoOpen(true);
      setDescontoGeral(descontoModal);
      showToast(
        modoFormulario === 'edicao'
          ? 'Orçamento atualizado com sucesso'
          : 'Orçamento salvo com sucesso',
        'success',
      );
      setModoFormulario('novo');
      setOrcamentoEditandoId(null);
      setModalOpen(false);
      setObservacoes(observacoesModal || '');
      setPagamentos((pagamentosModal || []).map(normalizePagamento));
      limparFormulario();
      await load();
    } catch (err) {
      console.error(err);
      showToast(
        err?.response?.data?.message || 'Erro ao salvar orçamento',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const decide = async (id, status) => {
    try {
      setLoading(true);
      await api.patch(`/orcamentos/${id}/status`, { status });
      await load();
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar orçamento', 'error');
    } finally {
      setLoading(false);
    }
  };

  const rowsItens = itens.map((item, index) => {
    const quantidade = toNumber(item.quantidade);
    const precoUnitario = toNumber(item.preco_unitario);
    const subtotal = quantidade * precoUnitario;

    const descontoValorInformado = toNumber(item.desconto_valor);
    const descontoPercentual = toNumber(item.desconto_percentual);

    const descontoCalculado =
      descontoValorInformado > 0
        ? descontoValorInformado * quantidade
        : subtotal * (descontoPercentual / 100);

    const liquido = subtotal - descontoCalculado;

    return {
      id: `${item.produto_id}-${index}`,
      codigo: item.produto_id,
      descricao: item.nome_customizado || item.produto_nome,
      quantidade: item.quantidade,
      valor_unitario: formatMoney(item.preco_unitario),
      desconto:
        descontoValorInformado > 0
          ? formatMoney(descontoValorInformado)
          : `${descontoPercentual || 0}%`,
      total_liquido: formatMoney(liquido),
      acoes: index,
    };
  });

  const rowsOrcamentos = buscaId
    ? orcamentos.filter((item) => String(item.id) === String(buscaId))
    : orcamentos;

  const handleItemContextMenu = (event, row) => {
    event.preventDefault();

    setItemContexto(row);
    setContextMenuX(event.clientX);
    setContextMenuY(event.clientY);
    setContextMenuOpen(true);
  };

  useEffect(() => {
    const fecharMenu = () => {
      setContextMenuOpen(false);
      setListaContextMenuOpen(false);
    };

    window.addEventListener('click', fecharMenu);
    return () => window.removeEventListener('click', fecharMenu);
  }, []);

  const abrirModalEditarItem = () => {
    if (!itemContexto) return;

    const itemOriginal = itens[itemContexto.acoes];
    if (!itemOriginal) return;

    setItemEditando({
      ...itemOriginal,
      indice: itemContexto.acoes,
    });

    setModalEditarItemOpen(true);
  };

  const salvarEdicaoItem = (itemAtualizado) => {
    setItens((prev) =>
      prev.map((item, index) =>
        index === itemEditando.indice
          ? {
              ...item,
              quantidade: itemAtualizado.quantidade,
              preco_unitario: itemAtualizado.preco_unitario,
              desconto_valor: itemAtualizado.desconto_valor,
              desconto_percentual: itemAtualizado.desconto_percentual,
              nome_customizado: itemAtualizado.nome_customizado,
            }
          : item,
      ),
    );

    setModalEditarItemOpen(false);
    setItemEditando(null);
  };

  const removerItemPorContexto = () => {
    if (!itemContexto) return;
    removerItem(itemContexto.acoes);
  };

  const carregarOrcamentoNoFormulario = async (id, modo = 'edicao') => {
    try {
      setLoading(true);

      const { data } = await api.get(`/orcamentos/${id}`);

      setClienteNome(data.cliente_nome || '');
      setClienteId(data.cliente_id || null);
      setDescontoGeral(toNumber(data.desconto_geral || 0));
      setObservacoes(data.observacoes || '');
      setPagamentos(
        Array.isArray(data.formas_pagamento) && data.formas_pagamento.length
          ? data.formas_pagamento.map((item) => ({
              ...normalizePagamento(item),
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              valor: item.valor,
            }))
          : [createPagamentoItem()],
      );

      setItens(
        (data.itens || []).map((item) => ({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome || `Produto ${item.produto_id}`,
          quantidade: toNumber(item.quantidade),
          preco_unitario: toNumber(item.preco_unitario),
          desconto_valor: toNumber(item.desconto_valor),
          desconto_percentual: toNumber(item.desconto_percentual),
          nome_customizado: item.nome_customizado || item.produto_nome || '',
        })),
      );

      if (modo === 'edicao') {
        setModoFormulario('edicao');
        setOrcamentoEditandoId(data.id);
        showToast(`Orçamento #${data.id} carregado para edição`, 'success');
      } else {
        setModoFormulario('clone');
        setOrcamentoEditandoId(null);
        showToast(`Orçamento #${data.id} carregado para clonagem`, 'success');
      }

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar orçamento', 'error');
    } finally {
      setLoading(false);
    }
  };

  const editarOrcamento = async (id) => {
    await carregarOrcamentoNoFormulario(id, 'edicao');
  };

  const clonarOrcamento = async (id) => {
    await carregarOrcamentoNoFormulario(id, 'clone');
  };

  const imprimirOrcamentoExistente = async (id) => {
    try {
      setLoading(true);

      const { data } = await api.get(`/orcamentos/${id}`);

      const itensDocumento = (data.itens || []).map((item) => {
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
      const clienteDocumento = await montarClienteDocumento(
        data.cliente_id,
        data.cliente_nome,
      );

      setDocumentoParaImprimir({
        tipo: 'orcamento',
        numero: data.id,
        cliente: clienteDocumento,
        observacoes: data.observacoes || '',
        formas_pagamento: Array.isArray(data.formas_pagamento)
          ? data.formas_pagamento.map(normalizePagamento)
          : [],
        itens: itensDocumento,
        totais: {
          bruto,
          descontoItens,
          descontoGeral: toNumber(data.desconto_geral || 0),
          liquido: Math.max(
            bruto - descontoItens - toNumber(data.desconto_geral || 0),
            0,
          ),
        },
      });

      setModalImpressaoOpen(true);
    } catch (err) {
      console.error(err);
      showToast('Erro ao preparar impressão do orçamento', 'error');
    } finally {
      setLoading(false);
    }
  };

  const montarClienteDocumento = async (cliente_id, fallbackNome = '') => {
    if (!cliente_id) {
      return {
        nome: fallbackNome || '',
        endereco: '',
        numero: '',
        bairro: '',
        cidade: '',
        cep: '',
        telefone: '',
        email: '',
        cpf_cnpj: '',
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
    } catch (error) {
      console.error('Erro ao buscar cliente para impressão:', error);

      return {
        nome: fallbackNome || '',
        endereco: '',
        numero: '',
        bairro: '',
        cidade: '',
        cep: '',
        telefone: '',
        email: '',
        cpf_cnpj: '',
      };
    }
  };

  const fecharModalAprovacao = () => {
    setModalAprovacaoOpen(false);
    setOrcamentoAprovando(null);
    setUsarTransportadoraManual(false);
    setAprovacaoForm({
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
    });
  };
  return (
    <>
      {(loading || saving) && <LoadingModal />}

      <Card title='Pré-venda | Orçamento'>
        <div className='orcamentos-page'>
          {modoFormulario === 'edicao' && (
            <div className='orcamentos-page__modo orcamentos-page__modo--warning'>
              Editando orçamento #{orcamentoEditandoId}
            </div>
          )}

          {modoFormulario === 'clone' && (
            <div className='orcamentos-page__modo orcamentos-page__modo--info'>
              Clonando orçamento como novo
            </div>
          )}
          <div className='orcamentos-page__top'>
            <div className='orcamentos-page__cliente'>
              <input
                className='orcamentos-page__input'
                value={clienteNome}
                onChange={(e) => {
                  setClienteNome(e.target.value);
                  setClienteId(null);
                }}
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

            <div className='orcamentos-page__totais'>
              <div className='orcamentos-page__total-card'>
                <span className='orcamentos-page__total-label'>
                  Total bruto
                </span>
                <strong className='orcamentos-page__total-value'>
                  {formatMoney(totais.bruto)}
                </strong>
              </div>

              <div className='orcamentos-page__total-card'>
                <span className='orcamentos-page__total-label'>Desconto</span>
                <strong className='orcamentos-page__total-value'>
                  {formatMoney(totais.descontoItens + toNumber(descontoGeral))}
                </strong>
              </div>

              <div className='orcamentos-page__total-card'>
                <span className='orcamentos-page__total-label'>Itens</span>
                <strong className='orcamentos-page__total-value'>
                  {totais.itens}
                </strong>
              </div>

              <div className='orcamentos-page__total-card'>
                <span className='orcamentos-page__total-label'>
                  Total líquido
                </span>
                <strong className='orcamentos-page__total-value'>
                  {formatMoney(totais.liquido)}
                </strong>
              </div>
            </div>
          </div>

          <div className='orcamentos-page__item-form'>
            <div className='orcamentos-page__field orcamentos-page__field--produto'>
              <BuscaManual
                endpoint='/produtos/busca'
                label='Produto'
                placeholder='Digite o nome do produto e pressione Enter'
                extraParams={{ tipos: 'fabricado,revenda,conjunto' }}
                onSelect={handleProdutoSelect}
                value={itemForm.produto_nome}
                onChangeValue={(value) =>
                  setItemForm((prev) => {
                    const proximo = {
                      ...prev,
                      produto_nome: value,
                      produto_id:
                        value === prev.produto_nome ? prev.produto_id : null,
                    };

                    console.log('onChangeValue produto ->', proximo);
                    return proximo;
                  })
                }
              />
            </div>

            <div className='orcamentos-page__field'>
              <label className='orcamentos-page__label'>Quantidade</label>
              <input
                className='orcamentos-page__input'
                value={itemForm.quantidade}
                onChange={(e) => handleItemChange('quantidade', e.target.value)}
                placeholder='1'
              />
            </div>

            <div className='orcamentos-page__field'>
              <label className='orcamentos-page__label'>Preço</label>
              <input
                className='orcamentos-page__input'
                value={itemForm.preco_unitario}
                onChange={(e) =>
                  handleItemChange('preco_unitario', e.target.value)
                }
                placeholder='0,00'
              />
            </div>

            <div className='orcamentos-page__field'>
              <label className='orcamentos-page__label'>Desc. valor</label>
              <input
                className='orcamentos-page__input'
                value={itemForm.desconto_valor}
                onChange={(e) =>
                  handleItemChange('desconto_valor', e.target.value)
                }
                placeholder='0,00'
              />
            </div>

            <div className='orcamentos-page__field'>
              <label className='orcamentos-page__label'>Desc. %</label>
              <input
                className='orcamentos-page__input'
                value={itemForm.desconto_percentual}
                onChange={(e) =>
                  handleItemChange('desconto_percentual', e.target.value)
                }
                placeholder='0'
              />
            </div>

            <div className='orcamentos-page__field orcamentos-page__field--descricao'>
              <label className='orcamentos-page__label'>
                Descrição do item
              </label>
              <input
                className='orcamentos-page__input'
                value={itemForm.nome_customizado}
                onChange={(e) =>
                  handleItemChange('nome_customizado', e.target.value)
                }
                placeholder='Descrição personalizada do item'
              />
            </div>

            <div className='orcamentos-page__field orcamentos-page__field--button'>
              <button
                className='btn btn--primary'
                onClick={adicionarItem}
                type='button'
              >
                Adicionar item
              </button>
            </div>
          </div>

          <div className='orcamentos-page__items-table'>
            <DataTable
              columns={[
                { key: 'codigo', label: 'Código' },
                {
                  key: 'descricao',
                  label: 'Descrição do item',
                  render: (_, row) => <strong>{row.descricao}</strong>,
                },
                { key: 'quantidade', label: 'Quantidade' },
                {
                  key: 'valor_unitario',
                  label: 'Valor unidade',
                  render: (_, row) => <strong>{row.valor_unitario}</strong>,
                },
                {
                  key: 'desconto',
                  label: 'Desconto',
                  render: (_, row) => <strong>{row.desconto}</strong>,
                },
                {
                  key: 'total_liquido',
                  label: 'Total líquido',
                  render: (_, row) => <strong>{row.total_liquido}</strong>,
                },
              ]}
              rows={rowsItens}
              emptyText='Nenhum item adicionado ao orçamento.'
              onRowContextMenu={handleItemContextMenu}
            />
          </div>

          <div className='orcamentos-page__actions'>
            <button
              className='btn btn--secondary'
              onClick={limparFormulario}
              type='button'
            >
              Limpar
            </button>

            <button
              className='btn btn--main'
              onClick={abrirModalSalvar}
              disabled={saving}
              type='button'
            >
              {modoFormulario === 'edicao'
                ? 'Finalizar edição'
                : 'Salvar orçamento'}
            </button>

            <button
              className='btn btn--primary'
              onClick={() => setModalObservacoesOpen(true)}
              type='button'
            >
              Observações
            </button>
          </div>
        </div>
      </Card>

      <Card title='Lista de orçamentos'>
        <DataTable
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'cliente_nome', label: 'Cliente' },
            {
              key: 'status',
              label: 'Status',
              render: (_, row) => <StatusBadge status={row.status} />,
            },
            {
              key: 'acoes',
              label: 'Ações',
              render: (_, row) => {
                return (
                  <div className='page-actions'>
                    {row.status === 'aprovado' ? (
                      <span className='orcamentos-page__status-text orcamentos-page__status-text--success'>
                        Orçamento aprovado
                      </span>
                    ) : row.status === 'rejeitado' ? (
                      <span className='orcamentos-page__status-text orcamentos-page__status-text--danger'>
                        Orçamento rejeitado
                      </span>
                    ) : (
                      <button
                        className='btn btn--primary'
                        onClick={() => abrirModalAprovacao(row)}
                        disabled={loading}
                      >
                        Aprovar
                      </button>
                    )}
                  </div>
                );
              },
            },
          ]}
          rows={rowsOrcamentos}
          onRowContextMenu={handleOrcamentoContextMenu}
        />
      </Card>

      {modalImpressaoOpen && (
        <div className='orcamentos-modal'>
          <div
            className='orcamentos-modal__backdrop'
            onClick={() => setModalImpressaoOpen(false)}
          />

          <div className='orcamentos-modal__card'>
            <h2 className='orcamentos-modal__title'>
              Deseja imprimir este documento?
            </h2>

            <div className='orcamentos-modal__actions'>
              <button
                className='btn btn--secondary'
                type='button'
                onClick={() => setModalImpressaoOpen(false)}
              >
                Não
              </button>

              <button
                className='btn btn--primary'
                type='button'
                onClick={() => {
                  const html = gerarHtmlDocumento({
                    tipo: documentoParaImprimir.tipo,
                    numero: documentoParaImprimir.numero,
                    empresa: {
                      nome: 'TORNEADORA UNIVERSAL',
                      logoUrl: '/logo.png',
                      endereco: 'R Thiago Magalhães Nunes, 1369, Centro',
                      cidade: 'Peixoto De Azevedo',
                      estado: 'MT',
                      telefone: '(66) 999751055',
                      email: 'gerente.torneadorauniversal@gmail.com',
                    },
                    cliente: documentoParaImprimir.cliente,
                    itens: documentoParaImprimir.itens,
                    totais: documentoParaImprimir.totais,
                    formas_pagamento:
                      documentoParaImprimir.formas_pagamento || [],
                    observacoes: documentoParaImprimir.observacoes || '',
                    assinaturaProprietarioUrl: '/assinatura-proprietario.png',
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

      <OrcamentoFinalizarModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmarSalvarOrcamento}
        itens={itens}
        descontoGeralInicial={descontoGeral}
        observacoesInicial={observacoes}
        pagamentosIniciais={pagamentos}
        modo={modoFormulario}
      />
      <OrcamentoItemContextMenu
        open={contextMenuOpen}
        x={contextMenuX}
        y={contextMenuY}
        onClose={() => setContextMenuOpen(false)}
        onEdit={abrirModalEditarItem}
        onRemove={removerItemPorContexto}
      />

      <OrcamentoItemEditarModal
        open={modalEditarItemOpen}
        item={itemEditando}
        onClose={() => {
          setModalEditarItemOpen(false);
          setItemEditando(null);
        }}
        onSave={salvarEdicaoItem}
      />

      {modalAprovacaoOpen && orcamentoAprovando && (
        <div className='orcamentos-modal'>
          <div
            className='orcamentos-modal__backdrop'
            onClick={fecharModalAprovacao}
          />

          <div className='orcamentos-modal__card'>
            <h2 className='orcamentos-modal__title'>Aprovar orçamento</h2>
            <p className='orcamentos-modal__subtitle'>
              Confirme os dados necessários para concluir a aprovação deste
              orçamento.
            </p>

            <div className='orcamentos-modal__summary'>
              <div className='orcamentos-modal__summary-card'>
                <span className='orcamentos-modal__summary-label'>
                  Orçamento
                </span>
                <strong className='orcamentos-modal__summary-value'>
                  #{orcamentoAprovando.id}
                </strong>
              </div>

              <div className='orcamentos-modal__summary-card'>
                <span className='orcamentos-modal__summary-label'>Cliente</span>
                <strong className='orcamentos-modal__summary-value'>
                  {orcamentoAprovando.cliente_nome || '-'}
                </strong>
              </div>

              <div className='orcamentos-modal__summary-card'>
                <span className='orcamentos-modal__summary-label'>Itens</span>
                <strong className='orcamentos-modal__summary-value'>
                  {orcamentoAprovando.itens?.length || 0}
                </strong>
              </div>

              <div className='orcamentos-modal__summary-card'>
                <span className='orcamentos-modal__summary-label'>
                  Status atual
                </span>
                <strong className='orcamentos-modal__summary-value'>
                  {orcamentoAprovando.status || '-'}
                </strong>
              </div>
            </div>

            {!orcamentoAprovando.cliente_id && (
              <div className='orcamentos-modal__section'>
                <h3 className='orcamentos-modal__section-title'>
                  Dados do cliente
                </h3>

                <div className='orcamentos-modal__cliente-badge orcamentos-modal__cliente-badge--warning'>
                  Cliente não cadastrado: este cliente será salvo no sistema ao
                  aprovar
                </div>

                <label className='orcamentos-modal__field orcamentos-modal__field--full'>
                  <span>Nome completo / Razão social</span>
                  <input
                    value={aprovacaoForm.nome_completo}
                    onChange={(e) =>
                      setAprovacaoForm((prev) => ({
                        ...prev,
                        nome_completo: e.target.value,
                      }))
                    }
                    placeholder='Nome oficial do cliente para cadastro e documentos'
                  />
                </label>

                <div className='orcamentos-modal__form-grid'>
                  <label className='orcamentos-modal__field'>
                    <span>Telefone</span>
                    <input
                      value={aprovacaoForm.telefone}
                      onChange={(e) =>
                        setAprovacaoForm((prev) => ({
                          ...prev,
                          telefone: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className='orcamentos-modal__field'>
                    <span>E-mail</span>
                    <input
                      value={aprovacaoForm.email}
                      onChange={(e) =>
                        setAprovacaoForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className='orcamentos-modal__field'>
                    <span>CPF/CNPJ</span>
                    <input
                      value={aprovacaoForm.cpf_cnpj}
                      onChange={(e) =>
                        setAprovacaoForm((prev) => ({
                          ...prev,
                          cpf_cnpj: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className='orcamentos-modal__field'>
                    <span>Endereço</span>
                    <input
                      value={aprovacaoForm.endereco}
                      onChange={(e) =>
                        setAprovacaoForm((prev) => ({
                          ...prev,
                          endereco: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className='orcamentos-modal__field'>
                    <span>Número</span>
                    <input
                      value={aprovacaoForm.numero}
                      onChange={(e) =>
                        setAprovacaoForm((prev) => ({
                          ...prev,
                          numero: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className='orcamentos-modal__field'>
                    <span>Bairro</span>
                    <input
                      value={aprovacaoForm.bairro}
                      onChange={(e) =>
                        setAprovacaoForm((prev) => ({
                          ...prev,
                          bairro: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className='orcamentos-modal__field'>
                    <span>Cidade</span>
                    <input
                      value={aprovacaoForm.cidade}
                      onChange={(e) =>
                        setAprovacaoForm((prev) => ({
                          ...prev,
                          cidade: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className='orcamentos-modal__field'>
                    <span>CEP</span>
                    <input
                      value={aprovacaoForm.cep}
                      onChange={(e) =>
                        setAprovacaoForm((prev) => ({
                          ...prev,
                          cep: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
            )}

            {orcamentoAprovando.cliente_id && (
              <div className='orcamentos-modal__section'>
                <h3 className='orcamentos-modal__section-title'>Cliente</h3>

                <div className='orcamentos-modal__cliente-badge'>
                  Cliente já cadastrado no sistema
                </div>
              </div>
            )}

            <div className='orcamentos-modal__section'>
              <h3 className='orcamentos-modal__section-title'>
                Logística da venda
              </h3>

              <div className='orcamentos-modal__form-grid'>
                <label className='orcamentos-modal__field'>
                  <span>Tipo de entrega</span>
                  <select
                    value={aprovacaoForm.tipo_entrega}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (value === 'retirada') {
                        setUsarTransportadoraManual(false);
                      }

                      setAprovacaoForm((prev) => ({
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

                <label className='orcamentos-modal__field'>
                  <span>Prazo de entrega</span>
                  <input
                    type='date'
                    value={aprovacaoForm.prazo_entrega}
                    onChange={(e) =>
                      setAprovacaoForm((prev) => ({
                        ...prev,
                        prazo_entrega: e.target.value,
                      }))
                    }
                  />
                </label>

                {aprovacaoForm.tipo_entrega === 'transportadora' && (
                  <>
                    <label className='orcamentos-modal__field'>
                      <span>Transportadora</span>
                      <select
                        value={
                          usarTransportadoraManual
                            ? 'outras'
                            : aprovacaoForm.transportadora_id || ''
                        }
                        onChange={(e) => {
                          const value = e.target.value;

                          if (value === 'outras') {
                            setUsarTransportadoraManual(true);
                            setAprovacaoForm((prev) => ({
                              ...prev,
                              transportadora_id: null,
                              transportadora_nome_manual: '',
                            }));
                            return;
                          }

                          setUsarTransportadoraManual(false);
                          setAprovacaoForm((prev) => ({
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
                      <label className='orcamentos-modal__field'>
                        <span>Nome da transportadora</span>
                        <input
                          value={aprovacaoForm.transportadora_nome_manual}
                          onChange={(e) =>
                            setAprovacaoForm((prev) => ({
                              ...prev,
                              transportadora_nome_manual: e.target.value,
                            }))
                          }
                          placeholder='Digite o nome da transportadora'
                        />
                      </label>
                    )}
                  </>
                )}

                <label className='orcamentos-modal__field orcamentos-modal__field--full'>
                  <span>Observações de entrega</span>
                  <textarea
                    rows={3}
                    value={aprovacaoForm.observacoes_entrega}
                    onChange={(e) =>
                      setAprovacaoForm((prev) => ({
                        ...prev,
                        observacoes_entrega: e.target.value,
                      }))
                    }
                    placeholder='Ex.: cliente retira no pátio, entregar até sexta, ligar antes, etc.'
                  />
                </label>
              </div>
            </div>

            <div className='orcamentos-modal__actions'>
              <button
                className='btn btn--secondary'
                type='button'
                onClick={fecharModalAprovacao}
              >
                Cancelar
              </button>

              <button
                className='btn btn--primary'
                type='button'
                onClick={confirmarAprovacao}
                disabled={loading}
              >
                {loading ? 'Aprovando...' : 'Confirmar aprovação'}
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
          setClienteId(item.id);
          setClienteNome(item.nome_fantasia || item.nome || '');
          setModalClienteOpen(false);
        }}
        formatarValor={(item) =>
          item.nome_fantasia || item.nome || `#${item.id}`
        }
      />

      <ActionContextMenu
        open={listaContextMenuOpen}
        x={listaContextMenuX}
        y={listaContextMenuY}
        onClose={() => setListaContextMenuOpen(false)}
        actions={[
          {
            key: 'edit',
            label: 'Editar',
            visible:
              orcamentoContexto &&
              ['rascunho', 'enviado'].includes(orcamentoContexto.status),
            onClick: () => editarOrcamento(orcamentoContexto.id),
          },
          {
            key: 'clone',
            label: 'Clonar',
            visible: !!orcamentoContexto,
            onClick: () => clonarOrcamento(orcamentoContexto.id),
          },
          {
            key: 'print',
            label: 'Imprimir orçamento',
            visible: !!orcamentoContexto,
            onClick: () => imprimirOrcamentoExistente(orcamentoContexto.id),
          },
          {
            key: 'reject',
            label: 'Rejeitar',
            danger: true,
            visible:
              orcamentoContexto &&
              !['aprovado', 'rejeitado'].includes(orcamentoContexto.status),
            onClick: () => decide(orcamentoContexto.id, 'rejeitado'),
          },
        ]}
      />

      <ObservacoesModal
        open={modalObservacoesOpen}
        initialValue={observacoes}
        onClose={() => setModalObservacoesOpen(false)}
        onSave={(texto) => {
          setObservacoes(texto);
          setModalObservacoesOpen(false);
          showToast('Observações atualizadas', 'success');
        }}
      />
    </>
  );
}
