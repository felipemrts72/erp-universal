import './style.css';

export default function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase();
  const variant =
    normalized.includes('pend') ? 'pending' : normalized.includes('aprov') || normalized.includes('entreg') ? 'success' : normalized.includes('rejeit') ? 'danger' : 'neutral';

  return <span className={`status-badge status-badge--${variant}`}>{status || 'N/A'}</span>;
}
