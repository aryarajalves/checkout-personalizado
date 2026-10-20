import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container" data-testid="toast-container" aria-live="polite">
        {toasts.map((toast) => {
          let Icon = CheckCircle2;
          let typeClass = 'toast-success';
          if (toast.type === 'error') {
            Icon = AlertCircle;
            typeClass = 'toast-error';
          } else if (toast.type === 'info') {
            Icon = Info;
            typeClass = 'toast-info';
          }

          return (
            <div
              key={toast.id}
              className={`toast-item ${typeClass}`}
              data-testid={`toast-${toast.type}`}
            >
              <Icon size={20} className="toast-icon" />
              <span className="toast-message">{toast.message}</span>
              <button
                type="button"
                className="toast-close-btn"
                onClick={() => removeToast(toast.id)}
                aria-label="Fechar notificação"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { addToast: null, removeToast: () => {} };
  }
  return context;
}
