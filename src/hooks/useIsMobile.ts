import { useEffect, useState } from 'react'

/** Mobile breakpoint, same as DeskBackground.css, JarPile and ContextMenu. */
const MOBILE_QUERY = '(max-width: 767px)'

function read(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_QUERY).matches
    : false
}

/** True on viewports up to 767px wide. False when matchMedia is missing. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState<boolean>(read)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches)
    setMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return mobile
}
