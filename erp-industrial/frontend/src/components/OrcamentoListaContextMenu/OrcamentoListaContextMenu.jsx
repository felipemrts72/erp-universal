import './style.css';

export default function OrcamentoListaContextMenu({
  open,
  x,
  y,
  onClose,
  onEdit,
  onClone,
  onPrint,
  onReject,
  podeEditar = false,
  podeRejeitar = false,
}) {
  if (!open) return null;

  return (
    <div className='orcamento-lista-context-menu' style={{ top: y, left: x }}>
      {podeEditar && (
        <button
          type='button'
          className='orcamento-lista-context-menu__button'
          onClick={() => {
            onEdit();
            onClose();
          }}
        >
          Editar
        </button>
      )}

      <button
        type='button'
        className='orcamento-lista-context-menu__button'
        onClick={() => {
          onClone();
          onClose();
        }}
      >
        Clonar
      </button>

      <button
        type='button'
        className='orcamento-lista-context-menu__button'
        onClick={() => {
          onPrint();
          onClose();
        }}
      >
        Imprimir orçamento
      </button>

      {podeRejeitar && (
        <button
          type='button'
          className='orcamento-lista-context-menu__button orcamento-lista-context-menu__button--danger'
          onClick={() => {
            onReject();
            onClose();
          }}
        >
          Rejeitar
        </button>
      )}
    </div>
  );
}
