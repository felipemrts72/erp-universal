import './style.css';

export default function Topbar({ onToggleSidebar, onLogout }) {
  return (
    <header className='topbar'>
      <button className='topbar__menu' onClick={onToggleSidebar}>☰</button>
      <h1 className='topbar__title'>ERP Industrial</h1>
      <button className='btn btn--secondary' onClick={onLogout}>Sair</button>
    </header>
  );
}
