import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';
import './index.css';
import { ToastProvider } from './contexts/ToastContext';
import AppBootLoader from './components/AppBootLoader/AppBootLoader';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AppBootLoader>
          <AppRoutes />
        </AppBootLoader>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
