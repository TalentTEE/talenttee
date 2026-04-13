'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { setApiErrorHandler } from '@/lib/api';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

const TOAST_ICONS: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: 'bg-green-500/10 border-green-500/30 text-green-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-400',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register global API error handler
  useEffect(() => {
    setApiErrorHandler((status: number) => {
      if (status === 401) addToast('Session expired. Please log in again.', 'error');
      else if (status === 403) addToast('Access denied.', 'error');
      else if (status >= 500) addToast('Server error. Please try again later.', 'error');
    });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container — bottom-right fixed */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg animate-in slide-in-from-right-5 fade-in duration-300 ${TOAST_COLORS[toast.type]}`}
          >
            <span
              className="material-symbols-outlined text-lg shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {TOAST_ICONS[toast.type]}
            </span>
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
