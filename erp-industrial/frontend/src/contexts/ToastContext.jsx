import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import Toast from '../components/Toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    open: false,
    message: '',
    type: 'error',
  });

  const showToast = useCallback((message, type = 'error') => {
    setToast({
      open: true,
      message,
      type,
    });
  }, []);

  const closeToast = useCallback(() => {
    setToast((prev) => ({
      ...prev,
      open: false,
    }));
  }, []);

  const value = useMemo(
    () => ({
      showToast,
      closeToast,
    }),
    [showToast, closeToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={closeToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast precisa ser usado dentro de ToastProvider');
  }

  return context;
}
