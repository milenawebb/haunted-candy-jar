import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useHauntClock } from '../../hooks/useHauntClock'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { decayFunction } from '../tasks/decayFunction'
import { useTaskStore } from '../tasks/taskStore'
import type { Task } from '../tasks/taskTypes'
import { BottomSheet } from './BottomSheet'
import './ContextMenu.css'

/** Mobile breakpoint, same as DeskBackground.css and JarPile. */
const MOBILE_QUERY = '(max-width: 767px)'
/** Gap in CSS px between the lifted candy and the popover. */
const GAP = 12
/** Viewport edge margin in CSS px. */
const EDGE = 8
/** Popover size used for placement when it cannot be measured (jsdom). */
const FALLBACK_SIZE = { width: 200, height: 220 }

function useIsMobile(): boolean {
  const get = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(MOBILE_QUERY).matches
      : false
  const [mobile, setMobile] = useState<boolean>(get)
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

/** The candy's <g> in the jar SVG, found by task id (ids are never put in a selector). */
function findCandyElement(taskId: string): SVGGraphicsElement | null {
  const all = document.querySelectorAll<SVGGraphicsElement>('[data-testid="candy-item"]')
  for (const el of Array.from(all)) {
    if (el.getAttribute('data-task-id') === taskId) return el
  }
  return null
}

/** True for presses on the open candy itself (its own click toggles the selection). */
function isSelectedCandy(target: Element): boolean {
  return target.closest('[data-testid="candy-item"][data-selected="true"]') !== null
}

interface Position {
  left: number
  top: number
}

/**
 * Where to put the popover, from the lifted candy's on-screen box.
 * Prefers the right of the candy (and its note), flips left when it would run
 * off the viewport, and is clamped to the viewport on both axes.
 */
export function placePopover(
  anchor: { left: number; right: number; top: number; bottom: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): Position {
  let left = anchor.right + GAP
  if (left + size.width > viewport.width - EDGE) left = anchor.left - GAP - size.width
  left = Math.max(EDGE, Math.min(left, viewport.width - size.width - EDGE))
  const centerY = (anchor.top + anchor.bottom) / 2
  let top = centerY - size.height / 2
  top = Math.max(EDGE, Math.min(top, viewport.height - size.height - EDGE))
  return { left, top }
}

export interface ContextMenuProps {
  /**
   * Called (with the task) after Edit is chosen and the menu has closed.
   * App wires it to the Edit form in task 31. When absent the button still
   * renders, is enabled, and just closes the menu.
   */
  onEdit?: (task: Task) => void
  /**
   * Called (with the task) after Focus is chosen and the menu has closed.
   * App wires it to the duration picker in task 34. When absent the button
   * still renders, is enabled, and just closes the menu.
   */
  onFocus?: (task: Task) => void
}

/**
 * Menu for the selected candy: Complete, Focus, Edit, Delete.
 *
 * Renders nothing unless selectedTaskId points at a live, unfinished task.
 *
 * Semantics: a non-modal role="dialog" holding plain buttons (not role="menu"),
 * so Tab and Shift+Tab walk the four buttons and wrap (focus trap), which is
 * simpler and more predictable for screen readers than menu arrow-key
 * conventions. Escape or a press outside closes it (SELECT_TASK null) and
 * focus returns to the candy.
 *
 * Placement (desktop): the popover is position: fixed in viewport pixels,
 * computed from getBoundingClientRect of the selected candy's lifted group
 * (candy plus note). That reads the final on-screen box whatever the SVG
 * scaling, the jar breakpoint or the lift transform, so it is more robust than
 * mapping jar units by hand. It is measured on open, again once the 220 ms
 * lift transition has finished, and on window resize. Under 768 px wide the
 * same content is shown in a BottomSheet instead.
 *
 * Hit testing: the popover only covers its own box. There is no backdrop, so
 * every other candy stays tappable, and a press on another candy both closes
 * the menu and selects that candy.
 *
 * Reduced motion: the popover fades in over 150 ms with no movement.
 *
 * Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */
export function ContextMenu({ onEdit, onFocus }: ContextMenuProps) {
  const { state } = useTaskStore()
  const task = state.tasks.find((t) => t.id === state.selectedTaskId && t.completedAt === null)
  if (!task) return null
  return <OpenMenu key={task.id} task={task} onEdit={onEdit} onFocus={onFocus} />
}

function OpenMenu({ task, onEdit, onFocus }: ContextMenuProps & { task: Task }) {
  const { dispatch } = useTaskStore()
  const logicalNow = useHauntClock()
  const mobile = useIsMobile()
  const reduced = useReducedMotion()
  const titleId = useId()
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<Position | null>(null)
  const stage = decayFunction(task, logicalNow)

  const close = useCallback(() => dispatch({ type: 'SELECT_TASK', taskId: null }), [dispatch])
  const restoreFallback = useCallback(() => findCandyElement(task.id), [task.id])

  // Desktop placement. Re-measured after the lift transition and on resize.
  useLayoutEffect(() => {
    if (mobile) return
    const measure = () => {
      const candy = findCandyElement(task.id)
      const lift = candy?.querySelector('[data-testid="candy-lift"]') ?? candy
      if (!lift) return
      const r = lift.getBoundingClientRect()
      const pop = popRef.current
      const size = {
        width: pop?.offsetWidth || FALLBACK_SIZE.width,
        height: pop?.offsetHeight || FALLBACK_SIZE.height,
      }
      setPos(
        placePopover(r, size, { width: window.innerWidth, height: window.innerHeight }),
      )
    }
    measure()
    const timer = window.setTimeout(measure, reduced ? 0 : 260)
    window.addEventListener('resize', measure)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', measure)
    }
  }, [mobile, reduced, task.id])

  // Complete and Delete clear the selection in the reducer, which closes the menu.
  const onComplete = () => dispatch({ type: 'COMPLETE_TASK', taskId: task.id, now: Date.now() })
  const onDelete = () => dispatch({ type: 'DELETE_TASK', taskId: task.id })
  const onFocusClick = () => {
    close()
    onFocus?.(task)
  }
  const onEditClick = () => {
    close()
    onEdit?.(task)
  }

  const content: ReactNode = (
    <>
      <div className="context-menu__header">
        <h2 id={titleId} className="context-menu__title">
          {task.title}
        </h2>
        <p className="context-menu__stage">Stage: {stage}</p>
      </div>
      <div className="context-menu__actions">
        <button type="button" className="context-menu__btn" onClick={onComplete}>
          Complete
        </button>
        <button type="button" className="context-menu__btn" onClick={onFocusClick}>
          Focus
        </button>
        <button type="button" className="context-menu__btn" onClick={onEditClick}>
          Edit
        </button>
        <button type="button" className="context-menu__btn context-menu__btn--danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </>
  )

  if (mobile) {
    return (
      <BottomSheet
        labelledBy={titleId}
        onClose={close}
        ignoreOutside={isSelectedCandy}
        restoreFallback={restoreFallback}
      >
        <div className="context-menu context-menu--sheet" data-testid="context-menu">
          {content}
        </div>
      </BottomSheet>
    )
  }

  return (
    <Popover
      popRef={popRef}
      titleId={titleId}
      pos={pos}
      reduced={reduced}
      onClose={close}
      restoreFallback={restoreFallback}
    >
      {content}
    </Popover>
  )
}

interface PopoverProps {
  popRef: RefObject<HTMLDivElement>
  titleId: string
  pos: Position | null
  reduced: boolean
  onClose: () => void
  restoreFallback: () => HTMLElement | SVGElement | null
  children: ReactNode
}

function Popover({ popRef, titleId, pos, reduced, onClose, restoreFallback, children }: PopoverProps) {
  useFocusTrap(popRef, true, restoreFallback)
  useClickOutside(popRef, onClose, { ignore: isSelectedCandy })
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
  const classes = ['context-menu', 'context-menu--popover']
  if (reduced) classes.push('context-menu--fade')
  return (
    <div
      ref={popRef}
      className={classes.join(' ')}
      role="dialog"
      aria-labelledby={titleId}
      data-testid="context-menu"
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0 }}
    >
      {children}
    </div>
  )
}
