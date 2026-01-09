
import { useState, useCallback } from 'react';
import { ToastMessage } from '../components/Toast.tsx';

let toastListeners: Array<(messages: ToastMessage[]) => void> = [];
let globalMessages: ToastMessage[] = [];

export function useToast() {
  const [, setState] = useState({});

  const notify = useCallback(() => {
    toastListeners.forEach(listener => listener([...globalMessages]));
    setState({});
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    globalMessages = [...globalMessages, { ...toast, id }];
    notify();
    return id;
  }, [notify]);

  const removeToast = useCallback((id: string) => {
    globalMessages = globalMessages.filter(m => m.id !== id);
    notify();
  }, [notify]);

  return { messages: globalMessages, addToast, removeToast };
}

// Global register for context-less components
export const toastRegistry = {
  subscribe: (listener: (messages: ToastMessage[]) => void) => {
    toastListeners.push(listener);
    return () => { toastListeners = toastListeners.filter(l => l !== listener); };
  },
  show: (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    globalMessages = [...globalMessages, { ...toast, id }];
    toastListeners.forEach(l => l([...globalMessages]));
  }
};
