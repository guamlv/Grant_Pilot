import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

export const ToastContainer = ({ messages, remove }) => {
  return createPortal(
    <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-4 pointer-events-none w-full max-w-sm">
      {messages.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={() => remove(toast.id)} />
      ))}
    </div>,
    document.body
  );
};

const Toast = ({ toast, onRemove }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = toast.duration || 5000;
    const interval = 10;
    const step = (interval / duration) * 100;
    
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onRemove();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [toast, onRemove]);

  return (
    <div className="bg-black text-white p-6 rounded-[2rem] shadow-2xl pointer-events-auto animate-in slide-in-from-right-8 fade-in relative overflow-hidden ring-1 ring-zinc-800" data-testid="toast">
      <div className="flex gap-4 items-start">
        <div className="mt-1">
          {toast.type === 'success' ? <CheckCircle2 className="text-emerald-400" size={20}/> : <AlertCircle className="text-rose-400" size={20}/>}
        </div>
        <div className="flex-1">
          <h4 className="font-black text-sm tracking-tight">{toast.title}</h4>
          {toast.message && <p className="text-xs text-zinc-500 mt-1 font-medium">{toast.message}</p>}
          {toast.onUndo && (
            <button 
              onClick={() => { toast.onUndo(); onRemove(); }}
              className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white transition-colors"
            >
              <RotateCcw size={12}/> Undo Action
            </button>
          )}
        </div>
        <button onClick={onRemove} className="text-zinc-600 hover:text-white transition-colors">
          <X size={16}/>
        </button>
      </div>
      <div 
        className="absolute bottom-0 left-0 h-1 bg-zinc-800 transition-all duration-100 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
