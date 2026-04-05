import './style.css';

export default function LoadingModal({
  open,
  text = 'Carregando...',
  logoSrc = '/logo.png',
}) {
  if (!open) return null;

  return (
    <div className="loading-modal">
      <div className="loading-modal__backdrop" />

      <div className="loading-modal__card">
        <img
          src={logoSrc}
          alt="Logo da empresa"
          className="loading-modal__logo"
        />

        <div className="loading-modal__spinner" />

        <p className="loading-modal__text">{text}</p>
      </div>
    </div>
  );
}
