import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import BuscaManual from '../../components/BuscaManual';
import LoadingModal from '../../components/LoadingModal';
import { useToast } from '../../contexts/ToastContext';

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
  const { showToast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  const [clienteForm, setClienteForm] = useState(initialCliente);
  const [itemForm, setItemForm] = useState(initialItem);
  const [itens, setItens] = useState([]);

  const [transportadoras, setTransportadoras] = useState([]);
  const [usarTransportadoraManual, setUsarTransportadoraManual] =
    useState(false);

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
    load();
    loadTransportadoras();
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

  return (
    <>
      {(loading || saving) && <LoadingModal />}

      <Card
        title='Vendas'
        subtitle='Acompanhe somente o que ainda está em aberto.'
      >
        <div className='vendas-page__top-action'>
          <button
            className='btn btn--primary vendas-page__new-button'
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
              const valorTotal = Number(venda.valor_total || 0);

              return (
                <article key={venda.id} className='vendas-page__sale-card'>
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
                        Valor total
                      </span>
                      <strong>{formatMoney(valorTotal)}</strong>
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
                      <strong>{venda.prazo_entrega}</strong>
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
                <BuscaManual
                  endpoint='/clientes/busca'
                  label='Cliente'
                  placeholder='Digite 3 letras, Enter ou clique na lupa'
                  onSelect={handleClienteSelect}
                  value={clienteForm.clienteNome}
                  onChangeValue={(value) => {
                    setClienteForm((prev) => ({
                      ...prev,
                      clienteNome: value,
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
                    }));
                  }}
                />
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

            <div className='vendas-page__item-section'>
              <h3 className='vendas-page__section-title'>Itens da venda</h3>

              <div className='vendas-page__item-form'>
                <div className='vendas-page__field vendas-page__field--product'>
                  <BuscaManual
                    endpoint='/produtos/busca'
                    label='Produto'
                    placeholder='Digite 3 letras, Enter ou clique na lupa'
                    extraParams={{ tipos: 'fabricado,revenda,conjunto' }}
                    onSelect={handleProdutoSelect}
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
                  itens.map((item, index) => (
                    <div
                      key={`${item.produto_id}-${index}`}
                      className='vendas-page__item-card'
                    >
                      <div>
                        <strong>{item.produto_nome}</strong>
                        <p>
                          {item.quantidade} × {formatMoney(item.preco_unitario)}
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
                  ))
                ) : (
                  <div className='vendas-page__empty-items'>
                    Nenhum item adicionado.
                  </div>
                )}
              </div>

              <div className='vendas-page__summary'>
                <span>Total de itens: {totais.itens}</span>
                <strong>Total: {formatMoney(totais.bruto)}</strong>
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
                className='btn btn--primary'
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
