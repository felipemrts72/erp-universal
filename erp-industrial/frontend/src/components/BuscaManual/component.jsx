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
}) {
  const [internalTerm, setInternalTerm] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const wrapperRef = useRef(null);

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
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async () => {
    const query = String(term || '').trim();

    if (query.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.get(endpoint, {
        params: { q: query },
      });

      let items = Array.isArray(data)
        ? data
        : data?.items || data?.results || [];

      if (typeof filterOptions === 'function') {
        items = items.filter(filterOptions);
      }

      setResults(items);
      setOpen(true);
    } catch (error) {
      console.error(`Erro ao buscar em ${endpoint}:`, error);
      setResults([]);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleSearch();
    }
  };

  const handleSelect = (item) => {
    if (typeof onSelect === 'function') {
      onSelect(item.id, item);
    }

    updateTerm(item?.nome || item?.cliente_nome || String(item?.id || ''));
    setOpen(false);
  };

  return (
    <div
      className="busca-manual"
      ref={wrapperRef}
      style={{ position: 'relative' }}
    >
      {label && <label className="orcamentos-page__label">{label}</label>}

      <div
        className="busca-manual__input-wrap"
        style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
      >
        <input
          className="orcamentos-page__input"
          value={term}
          onChange={(e) => updateTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />

        <button
          type="button"
          className="btn btn--secondary"
          onClick={handleSearch}
          title="Buscar"
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
          className="busca-manual__results"
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
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: 0,
                  background: '#fff',
                  padding: 12,
                  cursor: 'pointer',
                  borderBottom: '1px solid #eef2f7',
                }}
              >
                <strong>
                  {item?.nome || item?.cliente_nome || `#${item?.id}`}
                </strong>
                {item?.id ? (
                  <div style={{ fontSize: 12 }}>ID: {item.id}</div>
                ) : null}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
