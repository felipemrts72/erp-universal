import { NavLink } from 'react-router-dom';

const links = [
  ['/', 'Dashboard'],
  ['/produtos', 'Produtos'],
  ['/estoque', 'Estoque'],
  ['/orcamentos', 'Orçamentos'],
  ['/pedidos', 'Pedidos'],
  ['/producao', 'Produção'],
  ['/relatorios', 'Relatórios']
];

export function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <nav className="bg-slate-900 text-white px-6 py-3 flex gap-4 flex-wrap">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} className="hover:text-cyan-300">
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="p-6 max-w-6xl mx-auto">{children}</main>
    </div>
  );
}
