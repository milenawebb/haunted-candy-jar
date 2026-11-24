import { useEffect, useRef, type ReactNode } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import './BottomSheet.css'

export interface BottomSheetProps {
  /** Id of the element that names the sheet (aria-labelledby). */
  labelledBy: string
  onClose: () => void
  children: ReactNode
  /** Presses on matching elements do not count as outside (for example the opening candy). */
  ignoreOutside?: (target: Element) => boolean
  /** Where focus goes on close when the previously focused element is gone. */
  restoreFallback?: () => HTMLElement | SVGElement | null
}

/**
 * Simple reusable bottom sheet. Pinned to the bottom edge of the viewport,
 * non-modal (the rest of the page stays tappable), traps focus, closes on
 * Escape or an outside press. Slides up in 200 ms; under reduced motion it
 * fades in over 150 ms with no movement. Task 43 refines the shell.
 */
export function BottomSheet({ labelledBy, onClose, children, ignoreOutside, restoreFallback }: BottomSheetProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  useFocusTrap(ref, true, restoreFallback)
  useClickOutside(ref, onClose, { ignore: ignoreOutside })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      ref={ref}
      className={reduced ? 'bottom-sheet bottom-sheet--fade' : 'bottom-sheet'}
      role="dialog"
      aria-labelledby={labelledBy}
      data-testid="bottom-sheet"
    >
      {children}
    </div>
  )
}
