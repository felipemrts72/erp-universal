import './style.css';

export default function Toast({ open, message, type = 'error', onClose }) {
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
