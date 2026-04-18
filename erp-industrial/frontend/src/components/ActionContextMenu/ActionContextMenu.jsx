import './ActionContextMenu.css';

export default function ActionContextMenu({
  open,
  x,
  y,
  onClose,
  actions = [],
}) {
  if (!open) return null;

  const visibleActions = actions.filter(
    (action) => action && action.visible !== false,
  );

  if (!visibleActions.length) return null;

  return (
    <div
      className='action-context-menu'
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      {visibleActions.map((action) => (
        <button
          key={action.key}
          type='button'
          className={`action-context-menu__item ${
            action.danger ? 'action-context-menu__item--danger' : ''
          }`}
          onClick={() => {
            action.onClick?.();
            onClose?.();
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
