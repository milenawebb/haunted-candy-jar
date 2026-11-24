import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
}

/**
 * Traps keyboard focus inside `ref` while `active`.
 * On activation it remembers the focused element and moves focus to the first
 * focusable child. Tab and Shift+Tab wrap around. On deactivation focus goes
 * back to the remembered element, or to `restoreFallback()` when that element
 * has left the document (for example a candy that was re-mounted).
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  restoreFallback?: () => HTMLElement | SVGElement | null,
): void {
  const fallbackRef = useRef(restoreFallback)
  useEffect(() => {
    fallbackRef.current = restoreFallback
  })

  useEffect(() => {
    const root = ref.current
    if (!active || !root) return
    const previous = document.activeElement as HTMLElement | SVGElement | null
    const items = focusables(root)
    if (items[0]) items[0].focus()
    else {
      root.tabIndex = -1
      root.focus()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const list = focusables(root)
      if (list.length === 0) {
        e.preventDefault()
        return
      }
      const first = list[0]!
      const last = list[list.length - 1]!
      const current = document.activeElement
      const inside = current instanceof Node && root.contains(current)
      if (!inside) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && current === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const target =
        previous && previous.isConnected && previous !== document.body ? previous : fallbackRef.current?.() ?? null
      target?.focus?.()
    }
  }, [ref, active])
}
