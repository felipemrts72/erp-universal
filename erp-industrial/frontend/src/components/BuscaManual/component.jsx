import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

export default function BuscaManual({
  endpoint,
  label,
  placeholder = 'Digite pelo menos 3 letras',
  filterOptions,
  onSelect,
  value,
  onChangeValue,
  extraParams = {},
}) {
  const [internalTerm, setInternalTerm] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const wrapperRef = useRef(null);
  const itemRefs = useRef([]);

  const term = value !== undefined ? value : internalTerm;

  function updateTerm(newValue) {
    if (typeof onChangeValue === 'function') {
      onChangeValue(newValue);
    } else {
      setInternalTerm(newValue);
    }
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (highlightedIndex < 0) return;

    const selectedItem = itemRefs.current[highlightedIndex];
    if (selectedItem?.scrollIntoView) {
      selectedItem.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [highlightedIndex, open]);

  const handleSearch = async () => {
    const query = String(term || '').trim();

    if (query.length < 3) {
      setResults([]);
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.get(endpoint, {
        params: {
          q: query,
          ...extraParams,
        },
      });

      let items = Array.isArray(data)
        ? data
        : data?.items || data?.results || [];

      if (typeof filterOptions === 'function') {
        items = items.filter(filterOptions);
      }

      setResults(items);
      setOpen(true);
      setHighlightedIndex(items.length ? 0 : -1);
    } catch (error) {
      console.error(`Erro ao buscar em ${endpoint}:`, error);
      setResults([]);
      setOpen(true);
      setHighlightedIndex(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    if (typeof onSelect === 'function') {
      onSelect(item.id, item);
    }

    updateTerm(item?.nome || item?.cliente_nome || String(item?.id) || '');
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      if (open && highlightedIndex >= 0 && results[highlightedIndex]) {
        handleSelect(results[highlightedIndex]);
        return;
      }

      await handleSearch();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();

      if (!open) {
        await handleSearch();
        return;
      }

      if (!results.length) return;

      setHighlightedIndex((prev) => {
        if (prev < results.length - 1) return prev + 1;
        return 0;
      });

      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();

      if (!open || !results.length) return;

      setHighlightedIndex((prev) => {
        if (prev > 0) return prev - 1;
        return results.length - 1;
      });

      return;
    }

    if (e.key === 'Escape') {
      setOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div
      className='busca-manual'
      ref={wrapperRef}
      style={{ position: 'relative' }}
    >
      {label && <label className='orcamentos-page__label'>{label}</label>}

      <div
        className='busca-manual__input-wrap'
        style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
      >
        <input
          className='orcamentos-page__input'
          value={term}
          onChange={(e) => {
            updateTerm(e.target.value);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />

        <button
          type='button'
          className='btn btn--secondary'
          onClick={handleSearch}
          title='Buscar'
          style={{
            minWidth: 42,
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          🔍
        </button>
      </div>

      {open && (
        <div
          className='busca-manual__results'
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 20,
            background: '#fff',
            border: '1px solid #dbe1ea',
            borderRadius: 12,
            marginTop: 8,
            maxHeight: 260,
            overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          }}
        >
          {loading ? (
            <div style={{ padding: 12, fontSize: 14 }}>Buscando...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: 12, fontSize: 14 }}>
              Nenhum resultado encontrado.
            </div>
          ) : (
            results.map((item, index) => {
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  type='button'
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 0,
                    background: isHighlighted ? '#eff6ff' : '#fff',
                    padding: 12,
                    cursor: 'pointer',
                    borderBottom: '1px solid #eef2f7',
                  }}
                >
                  <strong>
                    {item?.nome_fantasia ||
                      item?.nome ||
                      item?.cliente_nome ||
                      `#${item?.id}`}
                  </strong>

                  {item?.nome_fantasia && item?.nome ? (
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {item.nome}
                    </div>
                  ) : null}

                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    ID: {item.id}
                  </div>

                  {item?.tipo ? (
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      Tipo: {item.tipo}
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
