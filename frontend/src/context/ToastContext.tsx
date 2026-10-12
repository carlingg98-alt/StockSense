import { createContext, useCallback, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/ui/Icon';

type ToastTone = 'success' | 'error';
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

// Holds the list of visible toasts and renders them above every page.
// REQUIREMENT [Core Req 3 - Frontend Application]: visible success feedback (toast) shown after create, update and delete.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {/* REQUIREMENT [Core Req 3 - Frontend Application]: list rendered with map() and a stable id as key (not the array index). */}
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="animate-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-pop"
          >
            <span
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${
                toast.tone === 'success' ? 'bg-tag text-ink' : 'bg-out text-white'
              }`}
            >
              <Icon name={toast.tone === 'success' ? 'check' : 'alert'} className="size-3.5" />
            </span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
