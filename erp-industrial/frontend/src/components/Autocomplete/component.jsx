import { useEffect, useState } from 'react';
import api from '../../services/api';
import './style.css';

export default function Autocomplete({ endpoint, label, placeholder, onSelect }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 3) {
        setOptions([]);
        setOpen(false);
        return;
      }

      try {
        setLoading(true);
        const { data } = await api.get(`${endpoint}?q=${encodeURIComponent(query)}`);
        const list = Array.isArray(data) ? data : data.items || [];
        setOptions(list);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [endpoint, query]);

  const handleSelect = (item) => {
    setQuery(item.nome || item.name || `ID ${item.id}`);
    setOpen(false);
    onSelect(item.id, item);
  };

  return (
    <div className='autocomplete'>
      <label className='autocomplete__label'>{label}</label>
      <input
        className='autocomplete__input'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
      />
      {loading && <span className='autocomplete__hint'>Buscando...</span>}
      {open && (
        <ul className='autocomplete__list'>
          {options.length ? (
            options.map((item) => (
              <li key={item.id} onClick={() => handleSelect(item)}>
                {item.nome || item.name || item.id}
              </li>
            ))
          ) : (
            <li className='autocomplete__empty'>Nenhum resultado</li>
          )}
        </ul>
      )}
    </div>
  );
}
