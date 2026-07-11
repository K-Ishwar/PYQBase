import { useEffect, useState } from 'react'

/**
 * Debounces a value by the specified delay (ms).
 * Used to avoid firing API requests on every keystroke.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
