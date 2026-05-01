import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import './style.css';

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

export default function Sidebar({ isOpen, onClose }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const token = localStorage.getItem('token');
  const user = token ? parseJwt(token) : {};
  const isAdmin = user?.role === 'admin';

  const links = [
    ['/', 'Dashboard', '🏠'],
    ['/orcamentos', 'Orçamentos', '📄'],
    ['/vendas', 'Vendas', '💰'],
    ['/produtos', 'Produtos', '📦'],
    ['/estoque', 'Estoque', '🏷️'],
    ['/clientes', 'Clientes', '👥'],
    ['/producao', 'Produção', '🏭'],
    ['/consumiveis', 'Consumíveis', '🧰'],
    ['/funcionarios', 'Funcionários', '🧑‍🏭'],
    ['/entregas', 'Entregas', '🚚'],
    ...(isAdmin
      ? [
          ['/auditoria', 'Auditoria', '📊'],
          ['/usuarios', 'Usuários', '🔐'],
        ]
      : []),
  ];

  return (
    <aside
      className={`sidebar ${isOpen ? 'sidebar--open' : ''} ${
        isCollapsed ? 'sidebar--collapsed' : ''
      }`}
    >
      <div className='sidebar__top'>
        <div className='sidebar__brand'>
          <span className='sidebar__brand-icon'>⚙️</span>
          {!isCollapsed && <span>ERP Industrial</span>}
        </div>

        <button
          type='button'
          className='sidebar__collapse-button'
          onClick={() => setIsCollapsed((prev) => !prev)}
          title={isCollapsed ? 'Expandir menu' : 'Minimizar menu'}
        >
          {isCollapsed ? '»' : '«'}
        </button>
      </div>

      <nav className='sidebar__nav'>
        {links.map(([to, label, icon]) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
            title={isCollapsed ? label : ''}
          >
            <span className='sidebar__icon'>{icon}</span>
            {!isCollapsed && <span className='sidebar__label'>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
