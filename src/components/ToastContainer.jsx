import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type} ${toast.exiting ? 'toast-exiting' : ''}`}
          >
            <div className="toast-icon">
              {isSuccess && <CheckCircle2 size={18} color="#2ea043" />}
              {isError && <AlertCircle size={18} color="#f85149" />}
              {isWarning && <AlertTriangle size={18} color="#d29922" />}
              {!isSuccess && !isError && !isWarning && <Info size={18} color="#e6b422" />}
            </div>

            <div className="toast-message">{toast.message}</div>

            <button
              className="toast-close-btn"
              onClick={() => onDismiss(toast.id)}
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
