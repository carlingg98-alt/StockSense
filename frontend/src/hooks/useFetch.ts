import { useCallback, useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Custom hook: GET a URL through the shared axios instance and track
// the three things every screen needs: data, loading and error.
// `reload()` runs the same request again (used after create / update / delete).
// REQUIREMENT [Core Req 3 - Frontend Application]: custom hook in the hooks/ folder. Tracks data, loading and error for every screen that loads data.
// reload() refreshes the screen after create / update / delete.
export function useFetch<T>(url: string | null, params?: Record<string, string | number | undefined>) {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: url !== null, error: null });
  const [reloadCount, setReloadCount] = useState(0);

  // Objects are compared by reference, so turn params into a string for the dependency list.
  const paramsKey = JSON.stringify(params ?? {});

  useEffect(() => {
    if (url === null) return;

    // REQUIREMENT [Core Req 3 - Frontend Application]: avoids showing a stale answer when the component unmounts or the request changes.
    let cancelled = false; // ignore the answer if the component unmounted or the request changed
    setState((previous) => ({ ...previous, loading: true, error: null }));

    api
      .get<T>(url, { params: JSON.parse(paramsKey) })
      .then((response) => {
        if (!cancelled) setState({ data: response.data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ data: null, loading: false, error: getErrorMessage(error) });
      });

    return () => {
      cancelled = true;
    };
  }, [url, paramsKey, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { ...state, reload };
}
