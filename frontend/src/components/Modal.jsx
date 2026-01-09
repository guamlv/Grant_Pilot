import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'md' }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const previouslyFocused = document.activeElement;
    const focusable = modalRef.current?.querySelector('button, input, select');
    focusable?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-md transition-all duration-300"
      aria-modal="true"
      role="dialog"
      data-testid="modal-overlay"
    >
      <div 
        ref={modalRef}
        className={`bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] w-full ${widthClass[maxWidth]} flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-300`}
      >
        <div className="flex justify-between items-center p-8 border-b border-zinc-100 shrink-0">
          <h3 className="text-2xl font-black text-black tracking-tight">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-3 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-2xl transition-all"
            aria-label="Close modal"
            data-testid="modal-close"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-10 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
