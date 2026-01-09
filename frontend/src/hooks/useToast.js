import { useState, useCallback } from 'react';

let toastListeners = [];
let globalMessages = [];

export function useToast() {
  const [, setState] = useState({});

  const notify = useCallback(() => {
    toastListeners.forEach(listener => listener([...globalMessages]));
    setState({});
  }, []);

  const addToast = useCallback((toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    globalMessages = [...globalMessages, { ...toast, id }];
    notify();
    return id;
  }, [notify]);

  const removeToast = useCallback((id) => {
    globalMessages = globalMessages.filter(m => m.id !== id);
    notify();
  }, [notify]);

  return { messages: globalMessages, addToast, removeToast };
}

export const toastRegistry = {
  subscribe: (listener) => {
    toastListeners.push(listener);
    return () => { toastListeners = toastListeners.filter(l => l !== listener); };
  },
  show: (toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    globalMessages = [...globalMessages, { ...toast, id }];
    toastListeners.forEach(l => l([...globalMessages]));
  }
};
