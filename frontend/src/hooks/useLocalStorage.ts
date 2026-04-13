import { useState, useCallback } from 'react';

/**
 * useState that automatically persists its value to localStorage.
 * Strings are stored raw; other types are JSON-serialized.
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (val: T) => void] {
  const [stored, setStored] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    const raw = window.localStorage.getItem(key);
    if (raw === null) return initialValue;
    // Strings are stored and returned as-is (no JSON wrapping)
    if (typeof initialValue === 'string') return raw as unknown as T;
    // Booleans are stored as 'true'/'false'
    if (typeof initialValue === 'boolean') return (raw !== 'false') as unknown as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T) => {
      setStored(value);
      try {
        const raw =
          typeof value === 'string' || typeof value === 'boolean'
            ? String(value)
            : JSON.stringify(value);
        window.localStorage.setItem(key, raw);
      } catch {
        // SSR or storage quota — silently ignore
      }
    },
    [key],
  );

  return [stored, setValue];
}
