import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/*
 * Load data once per `key`:
 *
 *   const { data, loading, error, reload } =
 *     useApi(() => adminApi.careRequests(status), status);
 *
 * - `key` (string/number) re-runs the request when it changes
 * - `loading` is true until the first response for the current key
 * - `reload()` re-fetches while keeping the current rows on screen
 */
export function useApi(fetcher, key = '') {
  const fetcherRef = useRef(fetcher);
  useLayoutEffect(() => {
    fetcherRef.current = fetcher;
  });

  const [state, setState] = useState({ key: null, data: null, error: '' });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    fetcherRef.current().then(
      (data) => alive && setState({ key, data, error: '' }),
      (err) => alive && setState((s) => ({ key, data: s.key === key ? s.data : null, error: err.message }))
    );
    return () => {
      alive = false;
    };
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : '',
    loading: state.key !== key,
    reload,
  };
}
