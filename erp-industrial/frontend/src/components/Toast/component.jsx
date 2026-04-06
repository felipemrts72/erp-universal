import { useEffect } from 'react';
import './style.css';

export default function Toast({ open, message, type = 'error', onClose }) {
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      onClose?.();
    }, 3500);

    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={`toast toast--${type}`}>
      <div className="toast__content">
        <span className="toast__message">{message}</span>
        <button className="toast__close" onClick={onClose} type="button">
          ×
        </button>
      </div>
    </div>
  );
}
