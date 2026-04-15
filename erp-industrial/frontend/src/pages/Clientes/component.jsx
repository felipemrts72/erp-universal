import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import LoadingModal from '../../components/LoadingModal';
import { useToast } from '../../contexts/ToastContext';

import './style.css';

const initialForm = {
  nome: '',
  nome_fantasia: '',
  cpf_cnpj: '',
  telefone: '',
  email: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: '',
  cep: '',
  observacoes: '',
};

export default function Clientes() {
  const { showToast } = useToast();

  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [form, setForm] = useState(initialForm);

  const loadClientes = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/clientes');
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar clientes', 'error');
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const buscarClientes = async (q) => {
    const query = String(q || '').trim();

    if (!query) {
      await loadClientes();
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.get('/clientes/busca', {
        params: { q: query },
      });
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('Erro ao buscar clientes', 'error');
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, []);

  const tituloModal = useMemo(() => {
    return clienteEditando ? 'Editar cliente' : 'Novo cliente';
  }, [clienteEditando]);

  const resetForm = () => {
    setForm(initialForm);
    setClienteEditando(null);
  };

  const fecharModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const abrirNovoCliente = () => {
    resetForm();
    setModalOpen(true);
  };

  const abrirEditarCliente = (cliente) => {
    setClienteEditando(cliente);
    setForm({
      nome: cliente?.nome || '',
      nome_fantasia: cliente?.nome_fantasia || '',
      cpf_cnpj: cliente?.cpf_cnpj || '',
      telefone: cliente?.telefone || '',
      email: cliente?.email || '',
      endereco: cliente?.endereco || '',
      numero: cliente?.numero || '',
      bairro: cliente?.bairro || '',
      cidade: cliente?.cidade || '',
      cep: cliente?.cep || '',
      observacoes: cliente?.observacoes || '',
    });
    setModalOpen(true);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const salvarCliente = async () => {
    if (!form.nome.trim()) {
      showToast('Informe o nome oficial / razão social', 'error');
      return;
    }

    try {
      setSaving(true);

      if (clienteEditando?.id) {
        await api.patch(`/clientes/${clienteEditando.id}`, form);
        showToast('Cliente atualizado com sucesso', 'success');
      } else {
        await api.post('/clientes', form);
        showToast('Cliente criado com sucesso', 'success');
      }

      fecharModal();
      await loadClientes();
    } catch (err) {
      console.error(err);
      showToast(
        err?.response?.data?.message || 'Erro ao salvar cliente',
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const inativarCliente = async (cliente) => {
    const nomeExibicao = cliente?.nome_fantasia || cliente?.nome || 'cliente';

    const confirmado = window.confirm(`Deseja inativar ${nomeExibicao}?`);

    if (!confirmado) return;

    try {
      setLoading(true);
      await api.delete(`/clientes/${cliente.id}`);
      showToast('Cliente inativado com sucesso', 'success');
      await loadClientes();
    } catch (err) {
      console.error(err);
      showToast(
        err?.response?.data?.message || 'Erro ao inativar cliente',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {(loading || saving) && <LoadingModal />}

      <Card
        title='Clientes'
        subtitle='Cadastre, edite e organize clientes do sistema.'
      >
        <div className='clientes-page__topbar'>
          <div className='clientes-page__search'>
            <input
              className='clientes-page__search-input'
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  buscarClientes(busca);
                }
              }}
              placeholder='Buscar por nome, apelido, CPF/CNPJ, telefone ou cidade'
            />

            <button
              type='button'
              className='btn btn--secondary'
              onClick={() => buscarClientes(busca)}
            >
              Buscar
            </button>

            <button
              type='button'
              className='btn btn--secondary'
              onClick={() => {
                setBusca('');
                loadClientes();
              }}
            >
              Limpar
            </button>
          </div>

          <button
            type='button'
            className='btn btn--primary'
            onClick={abrirNovoCliente}
          >
            Novo cliente
          </button>
        </div>

        <div className='clientes-page__cards'>
          {clientes.length ? (
            clientes.map((cliente) => {
              const nomeExibicao = cliente.nome_fantasia || cliente.nome;

              return (
                <article key={cliente.id} className='clientes-page__card'>
                  <div className='clientes-page__card-header'>
                    <div>
                      <h3 className='clientes-page__card-title'>
                        {nomeExibicao || 'Sem nome'}
                      </h3>

                      {cliente.nome_fantasia ? (
                        <p className='clientes-page__card-subtitle'>
                          {cliente.nome}
                        </p>
                      ) : null}
                    </div>

                    <span className='clientes-page__badge'>
                      ID #{cliente.id}
                    </span>
                  </div>

                  <div className='clientes-page__meta-grid'>
                    <div className='clientes-page__meta'>
                      <span className='clientes-page__meta-label'>
                        CPF/CNPJ
                      </span>
                      <strong>{cliente.cpf_cnpj || '-'}</strong>
                    </div>

                    <div className='clientes-page__meta'>
                      <span className='clientes-page__meta-label'>
                        Telefone
                      </span>
                      <strong>{cliente.telefone || '-'}</strong>
                    </div>

                    <div className='clientes-page__meta'>
                      <span className='clientes-page__meta-label'>E-mail</span>
                      <strong>{cliente.email || '-'}</strong>
                    </div>

                    <div className='clientes-page__meta'>
                      <span className='clientes-page__meta-label'>Cidade</span>
                      <strong>{cliente.cidade || '-'}</strong>
                    </div>
                  </div>

                  <div className='clientes-page__address'>
                    <span className='clientes-page__meta-label'>Endereço</span>
                    <p>
                      {[
                        cliente.endereco,
                        cliente.numero,
                        cliente.bairro,
                        cliente.cidade,
                        cliente.cep,
                      ]
                        .filter(Boolean)
                        .join(' - ') || '-'}
                    </p>
                  </div>

                  {cliente.observacoes ? (
                    <div className='clientes-page__notes'>
                      <span className='clientes-page__meta-label'>
                        Observações
                      </span>
                      <p>{cliente.observacoes}</p>
                    </div>
                  ) : null}

                  <div className='clientes-page__actions'>
                    <button
                      type='button'
                      className='btn btn--secondary'
                      onClick={() => abrirEditarCliente(cliente)}
                    >
                      Editar
                    </button>

                    <button
                      type='button'
                      className='btn btn--secondary'
                      onClick={() => inativarCliente(cliente)}
                    >
                      Inativar
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className='clientes-page__empty'>
              Nenhum cliente encontrado.
            </div>
          )}
        </div>
      </Card>

      {modalOpen && (
        <div className='clientes-modal'>
          <div className='clientes-modal__backdrop' onClick={fecharModal} />

          <div className='clientes-modal__card'>
            <div className='clientes-modal__header'>
              <h2 className='clientes-modal__title'>{tituloModal}</h2>

              <button
                type='button'
                className='clientes-modal__close'
                onClick={fecharModal}
              >
                ×
              </button>
            </div>

            <div className='clientes-modal__form-grid'>
              <label className='clientes-modal__field clientes-modal__field--full'>
                <span>Nome oficial / Razão social</span>
                <input
                  value={form.nome}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  placeholder='Nome oficial do cliente'
                />
              </label>

              <label className='clientes-modal__field clientes-modal__field--full'>
                <span>Nome fantasia / Apelido</span>
                <input
                  value={form.nome_fantasia}
                  onChange={(e) =>
                    handleChange('nome_fantasia', e.target.value)
                  }
                  placeholder='Nome curto para uso interno'
                />
              </label>

              <label className='clientes-modal__field'>
                <span>CPF/CNPJ</span>
                <input
                  value={form.cpf_cnpj}
                  onChange={(e) => handleChange('cpf_cnpj', e.target.value)}
                />
              </label>

              <label className='clientes-modal__field'>
                <span>Telefone</span>
                <input
                  value={form.telefone}
                  onChange={(e) => handleChange('telefone', e.target.value)}
                />
              </label>

              <label className='clientes-modal__field clientes-modal__field--full'>
                <span>E-mail</span>
                <input
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </label>

              <label className='clientes-modal__field clientes-modal__field--full'>
                <span>Endereço</span>
                <input
                  value={form.endereco}
                  onChange={(e) => handleChange('endereco', e.target.value)}
                />
              </label>

              <label className='clientes-modal__field'>
                <span>Número</span>
                <input
                  value={form.numero}
                  onChange={(e) => handleChange('numero', e.target.value)}
                />
              </label>

              <label className='clientes-modal__field'>
                <span>Bairro</span>
                <input
                  value={form.bairro}
                  onChange={(e) => handleChange('bairro', e.target.value)}
                />
              </label>

              <label className='clientes-modal__field'>
                <span>Cidade</span>
                <input
                  value={form.cidade}
                  onChange={(e) => handleChange('cidade', e.target.value)}
                />
              </label>

              <label className='clientes-modal__field'>
                <span>CEP</span>
                <input
                  value={form.cep}
                  onChange={(e) => handleChange('cep', e.target.value)}
                />
              </label>

              <label className='clientes-modal__field clientes-modal__field--full'>
                <span>Observações</span>
                <textarea
                  rows={4}
                  value={form.observacoes}
                  onChange={(e) => handleChange('observacoes', e.target.value)}
                  placeholder='Observações internas sobre o cliente'
                />
              </label>
            </div>

            <div className='clientes-modal__actions'>
              <button
                type='button'
                className='btn btn--secondary'
                onClick={fecharModal}
              >
                Cancelar
              </button>

              <button
                type='button'
                className='btn btn--primary'
                onClick={salvarCliente}
              >
                {saving ? 'Salvando...' : 'Salvar cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
