import { useCallback, useEffect, useState } from 'react';

/*
 * const { toast, showToast, clearToast } = useToast();
 * showToast('success', 'Saved');
 * {toast && <Toast {...toast} onClose={clearToast} />}
 */
export function useToast(timeout = 4000) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), timeout);
    return () => clearTimeout(t);
  }, [toast, timeout]);

  const showToast = useCallback((type, message) => setToast({ type, message, id: Date.now() }), []);
  const clearToast = useCallback(() => setToast(null), []);

  return { toast, showToast, clearToast };
}
