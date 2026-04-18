import { useEffect, useState } from 'react';
import './style.css';

export default function ObservacoesModal({
  open,
  onClose,
  onSave,
  initialValue = '',
}) {
  const [texto, setTexto] = useState(initialValue || '');

  useEffect(() => {
    if (open) {
      setTexto(initialValue || '');
    }
  }, [open, initialValue]);

  if (!open) return null;

  return (
    <div className='observacoes-modal' onClick={onClose}>
      <div
        className='observacoes-modal__card'
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className='observacoes-modal__title'>Observações</h2>

        <textarea
          className='observacoes-modal__textarea'
          rows={6}
          maxLength={200}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder='Digite observações do orçamento ou da venda'
        />

        <div className='observacoes-modal__counter'>{texto.length}/200</div>

        <div className='observacoes-modal__actions'>
          <button
            type='button'
            className='btn btn--secondary'
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            type='button'
            className='btn btn--primary'
            onClick={() => onSave(texto.trim())}
          >
            Salvar observações
          </button>
        </div>
      </div>
    </div>
  );
}
