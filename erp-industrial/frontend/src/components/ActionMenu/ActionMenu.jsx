import { useEffect, useRef, useState } from 'react';
import './ActionMenu.css';

export default function ActionMenu({ actions = [], onOpen }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const visibleActions = actions.filter((action) => action.visible !== false);

  useEffect(() => {
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };

    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  return (
    <div className='action-menu' ref={ref}>
      <button
        type='button'
        className='action-menu__button'
        onClick={(event) => {
          event.stopPropagation();
          onOpen?.();
          setOpen((prev) => !prev);
        }}
        aria-label='Abrir opções'
      >
        ⋮
      </button>

      {open && (
        <div className='action-menu__dropdown'>
          {visibleActions.map((action) => (
            <button
              key={action.key}
              type='button'
              className={`action-menu__item ${
                action.danger ? 'action-menu__item--danger' : ''
              }`}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                action.onClick?.();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}