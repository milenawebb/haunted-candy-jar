import { useEffect } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useTaskStore } from '../tasks/taskStore'
import type { PendingUndo } from '../tasks/taskReducer'
import './UndoToast.css'

/** How long the undo toast stays up before the action is committed (Req 5.1). */
export const UNDO_DURATION_MS = 6000

const MESSAGES: Record<PendingUndo['action'], string> = {
  complete: 'Task completed (a ghost cheers)',
  delete: 'Candy tossed',
}

function ToastBody({ pending }: { pending: PendingUndo }) {
  const { dispatch } = useTaskStore()
  const reduced = useReducedMotion()

  // Natural expiry. The cleanup clears the timer on UNDO, dismiss, a second
  // action (remount through the key) and unmount, so it never fires late.
  useEffect(() => {
    const id = window.setTimeout(() => dispatch({ type: 'UNDO_EXPIRED' }), UNDO_DURATION_MS)
    return () => window.clearTimeout(id)
  }, [dispatch])

  return (
    <div
      className={`undo-toast${reduced ? ' undo-toast--reduced' : ''}`}
      data-testid="undo-toast"
    >
      <span className="undo-toast__text">{MESSAGES[pending.action]}</span>
      <button
        type="button"
        className="undo-toast__undo"
        onClick={() => dispatch({ type: 'UNDO' })}
      >
        Undo
      </button>
      <button
        type="button"
        className="undo-toast__dismiss"
        aria-label="Dismiss"
        onClick={() => dispatch({ type: 'UNDO_EXPIRED' })}
      >
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
          <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

/**
 * Bottom-centre undo notification. The live region is always mounted (empty
 * when idle) so screen readers announce the text when a toast appears.
 */
export function UndoToast() {
  const { state } = useTaskStore()
  const pending = state.pendingUndo
  return (
    <div className="undo-toast-region" role="status" aria-live="polite">
      {pending && (
        <ToastBody key={`${pending.task.id}:${pending.action}`} pending={pending} />
      )}
    </div>
  )
}

export default UndoToast
