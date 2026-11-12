/**
 * Toast Container — renders toast notification badges in the bottom-right corner.
 */
import { useToastStore } from '../store/useToastStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-10 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2.5 px-3 py-2 rounded-lg shadow-xl border text-xs backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 ${
            t.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
              : t.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-800'
                : 'bg-slate-900/90 text-slate-200 border-slate-700'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />}
          {t.type === 'error' && <AlertCircle size={15} className="text-rose-400 shrink-0" />}
          {t.type === 'info' && <Info size={15} className="text-indigo-400 shrink-0" />}

          <span className="flex-1 leading-tight">{t.message}</span>

          <button
            onClick={() => removeToast(t.id)}
            className="p-1 hover:opacity-75 rounded transition-opacity"
            aria-label="Dismiss toast"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
