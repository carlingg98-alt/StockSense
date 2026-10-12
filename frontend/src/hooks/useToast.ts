import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext';

// Custom hook: showToast('Product saved') from any page.
// REQUIREMENT [Core Req 3 - Frontend Application]: third custom hook - success / error feedback after create, update and delete.
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
