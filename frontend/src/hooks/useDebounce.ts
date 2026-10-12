import { useEffect, useState } from 'react';

// Returns `value` only after it has stopped changing for `delay` ms.
// Used by the product search so we do not call the API on every keystroke.
// REQUIREMENT [Core Req 3 - Frontend Application]: second custom hook - the search box waits until the user stops typing before calling the API.
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
