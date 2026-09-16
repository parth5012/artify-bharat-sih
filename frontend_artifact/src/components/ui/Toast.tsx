import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export interface SingleToastProps {
  message: string;
  type?: ToastType;
  onClose: () => void;
}

export const Toast: React.FC<SingleToastProps> = ({ message, type = 'success', onClose }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-md bg-emerald-50/95 border-emerald-300 text-emerald-900 animate-fade-in-up">
      {type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
      {type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
      {type === 'info' && <Info className="w-5 h-5 text-terracotta-500 shrink-0" />}
      <span className="text-xs font-bold font-sans">{message}</span>
      <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 text-current">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-slide-up ${
            toast.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900'
              : toast.type === 'error'
              ? 'bg-red-50/95 border-red-300 text-red-900'
              : 'bg-cream-50/95 border-terracotta-200 text-charcoal-800'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-terracotta-500 shrink-0 mt-0.5" />}

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold">{toast.title}</h4>
            {toast.description && <p className="text-xs mt-0.5 opacity-90">{toast.description}</p>}
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-lg hover:bg-black/5 text-current opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

