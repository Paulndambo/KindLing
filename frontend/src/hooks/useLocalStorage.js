import { useState, useCallback } from "react";

/**
 * Persist state in localStorage with safe JSON parse/stringify.
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) return JSON.parse(item);
    } catch (error) {
      console.error(`Failed to read localStorage key "${key}":`, error);
    }
    return typeof initialValue === "function" ? initialValue() : initialValue;
  });

  const setValue = useCallback(
    (value) => {
      setStoredValue((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        try {
          if (next === null || next === undefined) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, JSON.stringify(next));
          }
        } catch (error) {
          console.error(`Failed to write localStorage key "${key}":`, error);
        }
        return next;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
