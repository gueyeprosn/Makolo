import * as React from 'react';

/** Retarde la propagation d'une valeur (recherche marketplace, filtres). */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
