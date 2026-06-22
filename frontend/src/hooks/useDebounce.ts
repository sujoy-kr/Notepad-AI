/**
 * Custom React hook for debouncing values.
 * 
 * Delays updating the debounced state value until a specified millisecond duration 
 * has elapsed without any changes to the input value.
 */

import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel timer on dependency updates or component unmounts
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
