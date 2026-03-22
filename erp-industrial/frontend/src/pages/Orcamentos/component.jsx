import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import BuscaManual from '../../components/BuscaManual';
import LoadingSpinner from '../../components/LoadingSpinner';
import OrcamentoFinalizarModal from '../../components/OrcamentoFinalizarModal';

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/orcamentos');
      setOrcamentos(Array.isArray(data) ? data : data?.items || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
    if (item?.tipo === 'consumivel') {
      setError('Consumíveis não podem ser adicionados ao orçamento');
      return;
    }

    setError('');
    setItemForm((prev) => ({
      ...prev,
      produto_id: id,
      produto_nome: item?.nome || '',
      nome_customizado: item?.nome || '',
      preco_unitario: toNumber(item?.preco_venda ?? item?.preco ?? 0),
    }));
  };

  const handleClienteSelect = (id, item) => {
    setClienteId(id || null);
    setClienteNome(item?.nome || '');
    setError('');
  };

  const handleItemChange = (field, value) => {
    setItemForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const adicionarItem = () => {
    setError('');
    setSuccess('');

    if (!itemForm.produto_id) {
      setError('Selecione um produto');
      return;
    }

    if (toNumber(itemForm.quantidade) <= 0) {
      setError('Quantidade inválida');
      return;
    }

    if (toNumber(itemForm.preco_unitario) < 0) {
      setError('Preço inválido');
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
    setError('');
    setSuccess('');
  };

  const abrirModalSalvar = () => {
    setError('');
    setSuccess('');

    if (!clienteNome.trim()) {
      setError('Informe o nome do cliente');
      return;
    }

    if (!itens.length) {
      setError('Adicione pelo menos um item ao orçamento');
      return;
    }

    setModalOpen(true);
  };

  const confirmarSalvarOrcamento = async ({ descontoGeral: descontoModal }) => {
    setError('');
    setSuccess('');

    const payload = {
      clienteNome,
      cliente_id: clienteId || null,
      desconto_geral: toNumber(descontoModal),
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
      await api.post('/orcamentos', payload);
      setDescontoGeral(descontoModal);
      setSuccess('Orçamento salvo com sucesso');
      setModalOpen(false);
      limparFormulario();
      await load();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Erro ao salvar orçamento');
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
      setError('Erro ao atualizar orçamento');
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

  return (
    <>
      {(loading || saving) && <LoadingSpinner />}
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <Card title="Pré-venda | Orçamento">
        <div className="orcamentos-page">
          <div className="orcamentos-page__top">
            <div className="orcamentos-page__cliente">
              <label className="orcamentos-page__label">Nome do cliente</label>
              <div className="orcamentos-page__cliente">
                <BuscaManual
                  endpoint="/clientes/busca"
                  label="Nome do cliente"
                  placeholder="Digite 3 letras, Enter ou clique na lupa"
                  onSelect={handleClienteSelect}
                  value={clienteNome}
                  onChangeValue={(value) => {
                    setClienteNome(value);
                    setClienteId(null);
                  }}
                />
              </div>
            </div>

            <div className="orcamentos-page__totais">
              <div className="orcamentos-page__total-card">
                <span className="orcamentos-page__total-label">
                  Total bruto
                </span>
                <strong className="orcamentos-page__total-value">
                  {formatMoney(totais.bruto)}
                </strong>
              </div>

              <div className="orcamentos-page__total-card">
                <span className="orcamentos-page__total-label">Desconto</span>
                <strong className="orcamentos-page__total-value">
                  {formatMoney(totais.descontoItens + toNumber(descontoGeral))}
                </strong>
              </div>

              <div className="orcamentos-page__total-card">
                <span className="orcamentos-page__total-label">Itens</span>
                <strong className="orcamentos-page__total-value">
                  {totais.itens}
                </strong>
              </div>

              <div className="orcamentos-page__total-card">
                <span className="orcamentos-page__total-label">
                  Total líquido
                </span>
                <strong className="orcamentos-page__total-value">
                  {formatMoney(totais.liquido)}
                </strong>
              </div>
            </div>
          </div>

          <div className="orcamentos-page__item-form">
            <div className="orcamentos-page__field orcamentos-page__field--produto">
              <BuscaManual
                endpoint="/produtos/busca"
                label="Produto"
                placeholder="Digite 3 letras e pressione Enter ou clique na lupa"
                filterOptions={(item) => item.tipo !== 'consumivel'}
                onSelect={handleProdutoSelect}
              />
            </div>

            <div className="orcamentos-page__field">
              <label className="orcamentos-page__label">Quantidade</label>
              <input
                className="orcamentos-page__input"
                value={itemForm.quantidade}
                onChange={(e) => handleItemChange('quantidade', e.target.value)}
                placeholder="1"
              />
            </div>

            <div className="orcamentos-page__field">
              <label className="orcamentos-page__label">Preço</label>
              <input
                className="orcamentos-page__input"
                value={itemForm.preco_unitario}
                onChange={(e) =>
                  handleItemChange('preco_unitario', e.target.value)
                }
                placeholder="0,00"
              />
            </div>

            <div className="orcamentos-page__field">
              <label className="orcamentos-page__label">Desc. valor</label>
              <input
                className="orcamentos-page__input"
                value={itemForm.desconto_valor}
                onChange={(e) =>
                  handleItemChange('desconto_valor', e.target.value)
                }
                placeholder="0,00"
              />
            </div>

            <div className="orcamentos-page__field">
              <label className="orcamentos-page__label">Desc. %</label>
              <input
                className="orcamentos-page__input"
                value={itemForm.desconto_percentual}
                onChange={(e) =>
                  handleItemChange('desconto_percentual', e.target.value)
                }
                placeholder="0"
              />
            </div>

            <div className="orcamentos-page__field orcamentos-page__field--descricao">
              <label className="orcamentos-page__label">
                Descrição do item
              </label>
              <input
                className="orcamentos-page__input"
                value={itemForm.nome_customizado}
                onChange={(e) =>
                  handleItemChange('nome_customizado', e.target.value)
                }
                placeholder="Descrição personalizada do item"
              />
            </div>

            <div className="orcamentos-page__field orcamentos-page__field--button">
              <button
                className="btn btn--primary"
                onClick={adicionarItem}
                type="button"
              >
                Adicionar item
              </button>
            </div>
          </div>

          <div className="orcamentos-page__items-table">
            <DataTable
              columns={[
                { key: 'codigo', label: 'Código' },
                { key: 'descricao', label: 'Descrição do item' },
                { key: 'quantidade', label: 'Quantidade' },
                { key: 'valor_unitario', label: 'Valor unidade' },
                { key: 'desconto', label: 'Desconto' },
                { key: 'total_liquido', label: 'Total líquido' },
                {
                  key: 'acoes',
                  label: 'Ações',
                  render: (_, row) => (
                    <button
                      className="btn btn--secondary"
                      onClick={() => removerItem(row.acoes)}
                    >
                      Remover
                    </button>
                  ),
                },
              ]}
              rows={rowsItens}
              emptyText="Nenhum item adicionado ao orçamento."
            />
          </div>

          <div className="orcamentos-page__actions">
            <button
              className="btn btn--secondary"
              onClick={limparFormulario}
              type="button"
            >
              Limpar
            </button>

            <button
              className="btn btn--primary"
              onClick={abrirModalSalvar}
              disabled={saving}
              type="button"
            >
              Salvar orçamento
            </button>
          </div>
        </div>
      </Card>

      <Card title="Lista de orçamentos">
        <div className="orcamentos-page__search" style={{ marginBottom: 16 }}>
          <BuscaManual
            endpoint="/orcamentos/busca"
            label="Buscar orçamento"
            placeholder="Digite 3 letras, aperte Enter ou clique na lupa"
            onSelect={(id) => setBuscaId(id)}
          />

          {buscaId && (
            <span className="orcamentos-page__search-result">
              Orçamento selecionado: #{buscaId}
            </span>
          )}
        </div>

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
                const podeAlterar =
                  row.status === 'rascunho' || row.status === 'enviado';

                return (
                  <div className="page-actions">
                    <button
                      className="btn btn--primary"
                      onClick={() => decide(row.id, 'aprovado')}
                      disabled={loading || !podeAlterar}
                    >
                      Aprovar
                    </button>
                    <button
                      className="btn btn--secondary"
                      onClick={() => decide(row.id, 'rejeitado')}
                      disabled={loading || !podeAlterar}
                    >
                      Rejeitar
                    </button>
                  </div>
                );
              },
            },
          ]}
          rows={rowsOrcamentos}
        />
      </Card>

      <OrcamentoFinalizarModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmarSalvarOrcamento}
        itens={itens}
        descontoGeralInicial={descontoGeral}
      />
    </>
  );
}
