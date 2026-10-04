import { useEffect, useState } from 'react';

// A per-viewer on/off preference kept in localStorage. Storage can be blocked
// (private windows, cleared site data), so every access falls back quietly.
export function useStoredFlag(key: string): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => {
    try {
      return window.localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // Not remembered this time; the page still works.
    }
  }, [key, value]);

  return [value, setValue];
}
