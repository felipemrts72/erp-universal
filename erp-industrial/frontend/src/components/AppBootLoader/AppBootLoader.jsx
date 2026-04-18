import { useEffect, useState } from 'react';
import './AppBootLoader.css';

export default function AppBootLoader({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = Date.now();

    async function boot() {
      await Promise.resolve();

      const elapsed = Date.now() - start;
      const remaining = Math.max(2000 - elapsed, 0);

      setTimeout(() => {
        setReady(true);
      }, remaining);
    }

    boot();
  }, []);

  if (!ready) {
    return (
      <div className='app-boot-loader'>
        <div className='app-boot-loader__box'>
          <div className='app-boot-loader__spinner' />
          <h2>Carregando sistema...</h2>
        </div>
      </div>
    );
  }

  return children;
}
