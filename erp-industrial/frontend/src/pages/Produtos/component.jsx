import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import DataTable from '../../components/DataTable';
import BuscaManual from '../../components/BuscaManual';

import './style.css';

const initialForm = {
  nome: '',
  tipo: 'materia_prima',
  sku: '',
  estoqueMinimo: '',
  custo: '',
  unidadeMedida: 'UN',
  precoVenda: '',
};

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  return Number(String(value).replace(',', '.')) || 0;
}

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

export default function Produtos() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [componentes, setComponentes] = useState([]);
  const [componenteSelecionado, setComponenteSelecionado] = useState(null);
  const [quantidadeComponente, setQuantidadeComponente] = useState('');

  const token = localStorage.getItem('token');

  const user = useMemo(() => {
    if (!token) return {};
    return parseJwt(token);
  }, [token]);

  const isAdmin = user?.role === 'admin';
  const podeVerPrecoVenda = isAdmin;

  const mostrarBlocoComponentes =
    form.tipo === 'fabricado' || form.tipo === 'conjunto';

  const custoCalculado = useMemo(() => {
    if (!mostrarBlocoComponentes) return toNumber(form.custo);

    return componentes.reduce((acc, item) => {
      return acc + toNumber(item.quantidade) * toNumber(item.custo);
    }, 0);
  }, [componentes, mostrarBlocoComponentes, form.custo]);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/produtos');
      setItems(Array.isArray(data) ? data : data.items || []);
      setError('');
    } catch (err) {
      setError('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const adicionarComponente = () => {
    if (!componenteSelecionado?.id) {
      setError('Selecione um componente');
      return;
    }

    if (
      componenteSelecionado?.tipo !== 'materia_prima' &&
      componenteSelecionado?.tipo !== 'revenda'
    ) {
      setError(
        'Somente matéria-prima ou revenda podem ser usados como component',
      );
      return;
    }

    if (!quantidadeComponente || toNumber(quantidadeComponente) <= 0) {
      setError('Informe uma quantidade válida para o componente');
      return;
    }

    const jaExiste = componentes.some(
      (item) => item.componenteId === componenteSelecionado.id,
    );

    if (jaExiste) {
      setError('Esse componente já foi adicionado');
      return;
    }

    setComponentes((prev) => [
      ...prev,
      {
        componenteId: componenteSelecionado.id,
        nome: componenteSelecionado.nome,
        quantidade: toNumber(quantidadeComponente),
        custo: toNumber(componenteSelecionado.custo),
      },
    ]);

    setComponenteSelecionado(null);
    setQuantidadeComponente('');
    setError('');
  };

  const removerComponente = (componenteId) => {
    setComponentes((prev) =>
      prev.filter((item) => item.componenteId !== componenteId),
    );
  };

  const createProduto = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.nome.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    if (!form.tipo) {
      setError('Tipo é obrigatório');
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      sku: form.sku.trim() || null,
      estoqueMinimo: toNumber(form.estoqueMinimo),
      custo: mostrarBlocoComponentes ? custoCalculado : toNumber(form.custo),
      unidadeMedida: form.unidadeMedida || 'UN',
    };

    if (isAdmin) {
      payload.precoVenda =
        form.tipo === 'consumivel' && form.precoVenda === ''
          ? null
          : toNumber(form.precoVenda);
    }

    if (mostrarBlocoComponentes && componentes.length) {
      payload.componentes = componentes.map((item) => ({
        componenteId: item.componenteId,
        quantidade: item.quantidade,
      }));
    }

    try {
      setLoading(true);
      await api.post('/produtos', payload);

      setSuccess('Produto criado com sucesso');
      setForm(initialForm);
      setComponentes([]);
      setComponenteSelecionado(null);
      setQuantidadeComponente('');
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao criar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <Card title="Cadastrar produto">
        <form
          className="form-grid produtos-page__form"
          onSubmit={createProduto}
        >
          <label className="form-control">
            Nome
            <input
              value={form.nome}
              onChange={(e) => handleFormChange('nome', e.target.value)}
              required
            />
          </label>

          <label className="form-control">
            Tipo
            <select
              value={form.tipo}
              onChange={(e) => handleFormChange('tipo', e.target.value)}
            >
              <option value="materia_prima">Matéria-prima</option>
              <option value="revenda">Revenda</option>
              <option value="fabricado">Fabricado</option>
              <option value="conjunto">Conjunto</option>
              <option value="consumivel">Consumível</option>
            </select>
          </label>

          <label className="form-control">
            SKU
            <input
              value={form.sku}
              onChange={(e) => handleFormChange('sku', e.target.value)}
            />
          </label>

          <label className="form-control">
            Estoque mínimo
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.estoqueMinimo}
              onChange={(e) =>
                handleFormChange('estoqueMinimo', e.target.value)
              }
            />
          </label>

          <label className="form-control">
            Custo
            <input
              type="number"
              min="0"
              step="0.01"
              value={mostrarBlocoComponentes ? custoCalculado : form.custo}
              onChange={(e) => handleFormChange('custo', e.target.value)}
              disabled={mostrarBlocoComponentes}
            />
          </label>

          <label className="form-control">
            Unidade
            <select
              value={form.unidadeMedida}
              onChange={(e) =>
                handleFormChange('unidadeMedida', e.target.value)
              }
            >
              <option value="UN">UN</option>
              <option value="KG">KG</option>
              <option value="PAR">PAR</option>
              <option value="MT">MT</option>
            </select>
          </label>

          {podeVerPrecoVenda && (
            <label className="form-control">
              Preço de venda
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.precoVenda}
                onChange={(e) => handleFormChange('precoVenda', e.target.value)}
                required={form.tipo !== 'consumivel'}
              />
            </label>
          )}

          <div className="produtos-page__submit">
            <button
              className="btn btn--primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Criar produto'}
            </button>
          </div>
        </form>
      </Card>

      {mostrarBlocoComponentes && (
        <Card title="Componentes do produto">
          <div className="produtos-page__componentes-form">
            <BuscaManual
              endpoint="/produtos/busca"
              label="Buscar componente"
              placeholder="Digite pelo menos 3 letras"
              filterOptions={(item) =>
                item.tipo === 'materia_prima' || item.tipo === 'revenda'
              }
              onSelect={(id, item) =>
                setComponenteSelecionado({
                  id,
                  ...item,
                })
              }
            />

            <label className="form-control">
              Quantidade
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantidadeComponente}
                onChange={(e) => setQuantidadeComponente(e.target.value)}
              />
            </label>

            <div className="produtos-page__componentes-action">
              <button
                className="btn btn--secondary"
                type="button"
                onClick={adicionarComponente}
              >
                Adicionar componente
              </button>
            </div>
          </div>

          {componenteSelecionado && (
            <div className="produtos-page__componente-selecionado">
              Componente selecionado:{' '}
              <strong>{componenteSelecionado.nome}</strong>
            </div>
          )}

          <DataTable
            columns={[
              { key: 'componenteId', label: 'ID' },
              { key: 'nome', label: 'Componente' },
              { key: 'quantidade', label: 'Quantidade' },
              { key: 'custo', label: 'Custo unitário' },
              {
                key: 'custo_total',
                label: 'Custo total',
                render: (_, row) =>
                  (toNumber(row.quantidade) * toNumber(row.custo)).toFixed(2),
              },
              {
                key: 'acoes',
                label: 'Ações',
                render: (_, row) => (
                  <button
                    className="btn btn--secondary"
                    onClick={() => removerComponente(row.componenteId)}
                  >
                    Remover
                  </button>
                ),
              },
            ]}
            rows={componentes.map((item) => ({
              ...item,
              acoes: item.componenteId,
            }))}
            emptyText="Nenhum componente adicionado."
          />
        </Card>
      )}

      <Card title="Produtos cadastrados">
        <DataTable
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'nome', label: 'Nome' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'sku', label: 'SKU' },
            { key: 'custo', label: 'Custo' },
            { key: 'unidade_medida', label: 'Unidade' },
            ...(podeVerPrecoVenda
              ? [{ key: 'preco_venda', label: 'Preço venda' }]
              : []),
          ]}
          rows={items}
        />
      </Card>
    </>
  );
}
