import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import BuscaManual from '../../components/BuscaManual';
import LoadingModal from '../../components/LoadingModal';
import Toast from '../../components/Toast';

import './style.css';

const initialItem = {
  produto_id: null,
  produto_nome: '',
  quantidade: 1,
  preco_unitario: 0,
};

const initialCliente = {
  clienteNome: '',
  cliente_id: null,
  telefone: '',
  email: '',
  cpf_cnpj: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: '',
  cep: '',
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: '',
    type: 'error',
  });

  const [modalOpen, setModalOpen] = useState(false);

  const [clienteForm, setClienteForm] = useState(initialCliente);
  const [itemForm, setItemForm] = useState(initialItem);
  const [itens, setItens] = useState([]);

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

  useEffect(() => {
    load();
  }, []);

  const totais = useMemo(() => {
    const bruto = itens.reduce((acc, item) => {
      return acc + toNumber(item.quantidade) * toNumber(item.preco_unitario);
    }, 0);

    return {
      itens: itens.length,
      bruto,
    };
  }, [itens]);

  const resetFormulario = () => {
    setClienteForm(initialCliente);
    setItemForm(initialItem);
    setItens([]);
  };

  const handleClienteChange = (field, value) => {
    setClienteForm((prev) => ({
      ...prev,
      [field]: value,
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

    if (!itens.length) {
      showToast('Adicione pelo menos um item', 'error');
      return;
    }

    const payload = {
      clienteNome: clienteForm.clienteNome,
      cliente_id: clienteForm.cliente_id || null,
      telefone: clienteForm.telefone,
      email: clienteForm.email,
      cpf_cnpj: clienteForm.cpf_cnpj,
      endereco: clienteForm.endereco,
      numero: clienteForm.numero,
      bairro: clienteForm.bairro,
      cidade: clienteForm.cidade,
      cep: clienteForm.cep,
      itens: itens.map((item) => ({
        produto_id: item.produto_id,
        quantidade: toNumber(item.quantidade),
        preco_unitario: toNumber(item.preco_unitario),
      })),
    };

    try {
      setSaving(true);
      await api.post('/vendas', payload);

      showToast('Venda criada com sucesso', 'success');
      setModalOpen(false);
      resetFormulario();
      await load();
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.message || 'Erro ao criar venda', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message, type = 'error') => {
    setToast((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const closeToast = () => {
    setToast((prev) => ({
      ...prev,
      open: false,
    }));
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
        title="Vendas"
        subtitle="Acompanhe somente o que ainda está em aberto."
      >
        <div className="vendas-page__top-action">
          <button
            className="btn btn--primary vendas-page__new-button"
            type="button"
            onClick={() => {
              setModalOpen(true);
            }}
          >
            Realizar venda
          </button>
        </div>
        <div className="vendas-page__cards">
          {items.length ? (
            items.map((venda) => {
              const itensVenda = Array.isArray(venda.itens) ? venda.itens : [];
              const totalItens = Number(venda.total_itens || 0);
              const valorTotal = Number(venda.valor_total || 0);

              return (
                <article key={venda.id} className="vendas-page__sale-card">
                  <div className="vendas-page__sale-header">
                    <div>
                      <h3 className="vendas-page__sale-title">
                        Venda #{venda.id}
                      </h3>
                      <p className="vendas-page__sale-client">
                        {venda.cliente_nome || 'Cliente não informado'}
                      </p>
                    </div>

                    <span className={getStatusClass(venda.status_venda)}>
                      {getStatusLabel(venda.status_venda)}
                    </span>
                  </div>

                  <div className="vendas-page__sale-body">
                    <div className="vendas-page__meta">
                      <span className="vendas-page__meta-label">Criada em</span>
                      <strong>{formatDate(venda.criado_em)}</strong>
                    </div>

                    <div className="vendas-page__meta">
                      <span className="vendas-page__meta-label">Itens</span>
                      <strong>{totalItens}</strong>
                    </div>

                    <div className="vendas-page__meta">
                      <span className="vendas-page__meta-label">
                        Valor total
                      </span>
                      <strong>{formatMoney(valorTotal)}</strong>
                    </div>
                  </div>

                  <div className="vendas-page__sale-items">
                    {itensVenda.map((item) => (
                      <div
                        key={`${venda.id}-${item.id || item.produto_id}`}
                        className="vendas-page__sale-item"
                      >
                        <span className="vendas-page__sale-item-name">
                          {item.produto_nome}
                        </span>

                        <span className="vendas-page__sale-item-detail">
                          {item.quantidade} × {formatMoney(item.preco_unitario)}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="vendas-page__empty">
              Nenhuma venda aberta encontrada.
            </div>
          )}
        </div>
      </Card>

      {modalOpen && (
        <div className="vendas-page__modal">
          <div
            className="vendas-page__modal-backdrop"
            onClick={() => setModalOpen(false)}
          />

          <div className="vendas-page__modal-card">
            <div className="vendas-page__modal-header">
              <h2 className="vendas-page__modal-title">Realizar venda</h2>
              <button
                type="button"
                className="vendas-page__modal-close"
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="vendas-page__form-grid">
              <div className="vendas-page__field vendas-page__field--full">
                <BuscaManual
                  endpoint="/clientes/busca"
                  label="Cliente"
                  placeholder="Digite 3 letras, Enter ou clique na lupa"
                  onSelect={(id, item) => {
                    handleClienteChange('cliente_id', id || null);
                    handleClienteChange('clienteNome', item?.nome || '');
                    handleClienteChange('telefone', item?.telefone || '');
                    handleClienteChange('email', item?.email || '');
                    handleClienteChange('cpf_cnpj', item?.cpf_cnpj || '');
                    handleClienteChange('endereco', item?.endereco || '');
                  }}
                  value={clienteForm.clienteNome}
                  onChangeValue={(value) => {
                    handleClienteChange('clienteNome', value);
                    handleClienteChange('cliente_id', null);
                  }}
                />
              </div>

              <label className="vendas-page__field">
                <span>Telefone</span>
                <input
                  value={clienteForm.telefone}
                  onChange={(e) =>
                    handleClienteChange('telefone', e.target.value)
                  }
                />
              </label>

              <label className="vendas-page__field">
                <span>E-mail</span>
                <input
                  value={clienteForm.email}
                  onChange={(e) => handleClienteChange('email', e.target.value)}
                />
              </label>

              <label className="vendas-page__field">
                <span>CPF/CNPJ</span>
                <input
                  value={clienteForm.cpf_cnpj}
                  onChange={(e) =>
                    handleClienteChange('cpf_cnpj', e.target.value)
                  }
                />
              </label>

              <label className="vendas-page__field vendas-page__field--full">
                <span>Endereço</span>
                <input
                  value={clienteForm.endereco}
                  onChange={(e) =>
                    handleClienteChange('endereco', e.target.value)
                  }
                />
              </label>

              <label className="vendas-page__field">
                <span>Número</span>
                <input
                  value={clienteForm.numero}
                  onChange={(e) =>
                    handleClienteChange('numero', e.target.value)
                  }
                />
              </label>

              <label className="vendas-page__field">
                <span>Bairro</span>
                <input
                  value={clienteForm.bairro}
                  onChange={(e) =>
                    handleClienteChange('bairro', e.target.value)
                  }
                />
              </label>

              <label className="vendas-page__field">
                <span>Cidade</span>
                <input
                  value={clienteForm.cidade}
                  onChange={(e) =>
                    handleClienteChange('cidade', e.target.value)
                  }
                />
              </label>

              <label className="vendas-page__field">
                <span>CEP</span>
                <input
                  value={clienteForm.cep}
                  onChange={(e) => handleClienteChange('cep', e.target.value)}
                />
              </label>
            </div>

            <div className="vendas-page__item-section">
              <h3 className="vendas-page__section-title">Itens da venda</h3>

              <div className="vendas-page__item-form">
                <div className="vendas-page__field vendas-page__field--product">
                  <BuscaManual
                    endpoint="/produtos/busca"
                    label="Produto"
                    placeholder="Digite 3 letras, Enter ou clique na lupa"
                    filterOptions={(item) => item.tipo !== 'consumivel'}
                    onSelect={handleProdutoSelect}
                  />
                </div>

                <label className="vendas-page__field">
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

                <label className="vendas-page__field">
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

                <div className="vendas-page__field vendas-page__field--button">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={adicionarItem}
                  >
                    Adicionar item
                  </button>
                </div>
              </div>

              <div className="vendas-page__item-list">
                {itens.length ? (
                  itens.map((item, index) => (
                    <div
                      key={`${item.produto_id}-${index}`}
                      className="vendas-page__item-card"
                    >
                      <div>
                        <strong>{item.produto_nome}</strong>
                        <p>
                          {item.quantidade} × {formatMoney(item.preco_unitario)}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => removerItem(index)}
                      >
                        Remover
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="vendas-page__empty-items">
                    Nenhum item adicionado.
                  </div>
                )}
              </div>

              <div className="vendas-page__summary">
                <span>Total de itens: {totais.itens}</span>
                <strong>Total: {formatMoney(totais.bruto)}</strong>
              </div>
            </div>

            <div className="vendas-page__modal-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  resetFormulario();
                  setModalOpen(false);
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn btn--primary"
                onClick={criarVenda}
              >
                Confirmar venda
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
