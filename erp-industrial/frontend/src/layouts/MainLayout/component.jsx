import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import useAuth from '../../hooks/useAuth';
import './style.css';

export default function MainLayout() {
  const [isOpen, setIsOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <div className='main-layout'>
      <Sidebar isOpen={isOpen} onClose={() => setIsOpen(false)} />
      <div className='main-layout__content'>
        <Topbar onToggleSidebar={() => setIsOpen((prev) => !prev)} onLogout={logout} />
        <main className='main-layout__main'>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
