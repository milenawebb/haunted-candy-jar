import { useEffect, useRef, type RefObject } from 'react'

/**
 * Calls `handler` when a pointer press lands outside `ref`'s element.
 * `ignore` can veto a press (return true to treat it as inside), for example
 * the element that opened the popover. Does nothing while `active` is false.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  options: { active?: boolean; ignore?: (target: Element) => boolean } = {},
): void {
  const { active = true, ignore } = options
  const handlerRef = useRef(handler)
  const ignoreRef = useRef(ignore)
  useEffect(() => {
    handlerRef.current = handler
    ignoreRef.current = ignore
  })

  useEffect(() => {
    if (!active) return
    const onDown = (e: Event) => {
      const el = ref.current
      const target = e.target
      if (!el || !(target instanceof Element)) return
      if (el.contains(target)) return
      if (ignoreRef.current?.(target)) return
      handlerRef.current()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [ref, active])
}
