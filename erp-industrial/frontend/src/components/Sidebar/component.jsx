import { NavLink } from 'react-router-dom';
import './style.css';

const links = [
  ['/', 'Dashboard'],
  ['/produtos', 'Produtos'],
  ['/estoque', 'Estoque'],
  ['/producao', 'Produção'],
  ['/orcamentos', 'Orçamentos'],
  ['/pedidos', 'Pedidos'],
  ['/consumiveis', 'Consumíveis'],
  ['/funcionarios', 'Funcionários'],
  ['/entregas', 'Entregas']
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      <div className='sidebar__brand'>ERP Industrial</div>
      <nav className='sidebar__nav'>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
