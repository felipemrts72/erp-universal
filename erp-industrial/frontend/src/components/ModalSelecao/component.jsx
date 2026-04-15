import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import './style.css';

export default function ModalSelecao({
  open,
  title = 'Selecionar item',
  endpoint,
  placeholder = 'Digite pelo menos 3 letras',
  colunas = [],
  extraParams = {},
  onClose,
  onConfirm,
  minChars = 2,
  botaoNovoLabel = '',
  onNovo,
  formatarValor = (item) =>
    item?.nome_fantasia || item?.nome || item?.cliente_nome || `#${item?.id}`,
}) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => {
    if (!open) {
      setBusca('');
      setResultados([]);
      setSelecionado(null);
    }
  }, [open]);

  useEffect(() => {
    function handleEsc(event) {
      if (event.key === 'Escape') {
        onClose?.();
      }
    }

    if (open) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  const mensagemVazia = useMemo(() => {
    if (!busca.trim()) return 'Digite para pesquisar.';
    if (busca.trim().length < minChars) {
      return `Digite pelo menos ${minChars} caracteres.`;
    }
    return 'Nenhum resultado encontrado.';
  }, [busca, minChars]);

  const pesquisar = async () => {
    const termo = String(busca || '').trim();

    if (termo.length < minChars) {
      setResultados([]);
      setSelecionado(null);
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.get(endpoint, {
        params: {
          q: termo,
          ...extraParams,
        },
      });

      const items = Array.isArray(data)
        ? data
        : data?.items || data?.results || [];

      setResultados(items);
      setSelecionado(items[0] || null);
    } catch (error) {
      console.error(`Erro ao buscar em ${endpoint}:`, error);
      setResultados([]);
      setSelecionado(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDownBusca = async (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await pesquisar();
    }
  };

  const confirmar = () => {
    if (!selecionado) return;
    onConfirm?.(selecionado);
    onClose?.();
  };

  const renderCelula = (item, coluna) => {
    if (typeof coluna.render === 'function') {
      return coluna.render(item[coluna.key], item);
    }

    const valor = item[coluna.key];

    if (valor === null || valor === undefined || valor === '') {
      return '-';
    }

    return String(valor);
  };

  if (!open) return null;

  return (
    <div className='modal-selecao'>
      <div className='modal-selecao__backdrop' onClick={onClose} />

      <div className='modal-selecao__card'>
        <div className='modal-selecao__header'>
          <h2 className='modal-selecao__title'>{title}</h2>

          <button
            type='button'
            className='modal-selecao__close'
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className='modal-selecao__search'>
          <label className='modal-selecao__label'>Pesquisa</label>

          <div className='modal-selecao__search-row'>
            <input
              className='modal-selecao__input'
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={handleKeyDownBusca}
              placeholder={placeholder}
              autoFocus
            />

            <button
              type='button'
              className='btn btn--primary'
              onClick={pesquisar}
              disabled={loading}
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        <div className='modal-selecao__content'>
          {loading ? (
            <div className='modal-selecao__empty'>Buscando...</div>
          ) : resultados.length === 0 ? (
            <div className='modal-selecao__empty'>{mensagemVazia}</div>
          ) : (
            <div className='modal-selecao__table-wrap'>
              <table className='modal-selecao__table'>
                <thead>
                  <tr>
                    {colunas.map((coluna) => (
                      <th key={coluna.key}>{coluna.label}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {resultados.map((item) => {
                    const ativo = Number(selecionado?.id) === Number(item.id);

                    return (
                      <tr
                        key={item.id}
                        className={ativo ? 'modal-selecao__row--active' : ''}
                        onClick={() => setSelecionado(item)}
                        onDoubleClick={() => {
                          setSelecionado(item);
                          onConfirm?.(item);
                          onClose?.();
                        }}
                      >
                        {colunas.map((coluna) => (
                          <td key={`${item.id}-${coluna.key}`}>
                            {renderCelula(item, coluna)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className='modal-selecao__selecionado'>
          <span className='modal-selecao__selecionado-label'>Selecionado:</span>
          <strong className='modal-selecao__selecionado-value'>
            {selecionado
              ? formatarValor(selecionado)
              : 'Nenhum item selecionado'}
          </strong>
        </div>

        <div className='modal-selecao__actions'>
          <div className='modal-selecao__actions-left'>
            {botaoNovoLabel && typeof onNovo === 'function' ? (
              <button
                type='button'
                className='btn btn--secondary'
                onClick={onNovo}
              >
                {botaoNovoLabel}
              </button>
            ) : null}
          </div>

          <div className='modal-selecao__actions-right'>
            <button
              type='button'
              className='btn btn--secondary'
              onClick={onClose}
            >
              Fechar
            </button>

            <button
              type='button'
              className='btn btn--primary'
              onClick={confirmar}
              disabled={!selecionado}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
