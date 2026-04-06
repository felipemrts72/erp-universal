import './style.css';

export default function OrcamentoItemContextMenu({
  open,
  x,
  y,
  onClose,
  onEdit,
  onRemove,
}) {
  if (!open) return null;

  return (
    <div className="orcamento-item-context-menu" style={{ top: y, left: x }}>
      <button
        type="button"
        className="orcamento-item-context-menu__button"
        onClick={() => {
          onEdit();
          onClose();
        }}
      >
        Editar item
      </button>

      <button
        type="button"
        className="orcamento-item-context-menu__button orcamento-item-context-menu__button--danger"
        onClick={() => {
          onRemove();
          onClose();
        }}
      >
        Remover item
      </button>
    </div>
  );
}
