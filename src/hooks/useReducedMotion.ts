import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function getMql(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(QUERY)
}

/** True when the user prefers reduced motion. Returns false if matchMedia is missing. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => getMql()?.matches ?? false)

  useEffect(() => {
    const mql = getMql()
    if (!mql) return
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    setReduced(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return reduced
}
