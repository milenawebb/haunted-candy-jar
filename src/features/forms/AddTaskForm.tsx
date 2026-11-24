import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { BottomSheet } from '../contextMenu/BottomSheet'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useTaskStore } from '../tasks/taskStore'
import type { MonsterKind } from '../tasks/taskTypes'
import { MonsterPicker } from './MonsterPicker'
import './AddTaskForm.css'

export const TITLE_MAX_LENGTH = 120

/**
 * Converts the value of an `<input type="date">` ("YYYY-MM-DD") to a timestamp.
 * The due date is the END of the chosen day in the user's local time zone
 * (23:59:59.999), so a candy due "today" does not start decaying before the
 * day is over. Returns null for an empty or malformed value.
 */
export function dateInputToTimestamp(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(y, m - 1, d, 23, 59, 59, 999)
  const time = date.getTime()
  return Number.isNaN(time) ? null : time
}

export interface AddTaskFormProps {
  onClose: () => void
}

function FormBody({ onClose, headingId }: { onClose: () => void; headingId: string }) {
  const { dispatch } = useTaskStore()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [monster, setMonster] = useState<MonsterKind | null>(null)
  const [error, setError] = useState<string | null>(null)
  const uid = useId()
  const titleId = `${uid}-title`
  const dueId = `${uid}-due`
  const errorId = `${uid}-error`

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (title.trim().length === 0) {
      setError('Give your candy a name!')
      return
    }
    dispatch({
      type: 'CREATE_TASK',
      payload: { title: title.trim(), dueDate: dateInputToTimestamp(due), monster },
      now: Date.now(),
    })
    onClose()
  }

  return (
    <form className="add-task-form" onSubmit={onSubmit} noValidate>
      <h2 id={headingId} className="add-task-form__heading">
        Add a candy
      </h2>
      <div className="add-task-form__field">
        <label htmlFor={titleId} className="add-task-form__label">
          Title
        </label>
        <input
          id={titleId}
          className="add-task-form__input"
          type="text"
          value={title}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="What needs doing?"
          required
          aria-required="true"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          onChange={(e) => {
            setTitle(e.target.value)
            if (error) setError(null)
          }}
        />
        {error && (
          <p id={errorId} role="alert" className="add-task-form__error">
            {error}
          </p>
        )}
      </div>
      <div className="add-task-form__field">
        <label htmlFor={dueId} className="add-task-form__label">
          Due date (optional)
        </label>
        <input
          id={dueId}
          className="add-task-form__input"
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
      </div>
      <div className="add-task-form__field">
        <MonsterPicker value={monster} onChange={setMonster} />
      </div>
      <div className="add-task-form__actions">
        <button type="button" className="add-task-form__btn add-task-form__btn--ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="add-task-form__btn">
          Add
        </button>
      </div>
    </form>
  )
}

function Modal({ onClose, headingId, children }: { onClose: () => void; headingId: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  useFocusTrap(ref, true)
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
      className={reduced ? 'add-task-backdrop add-task-backdrop--fade' : 'add-task-backdrop'}
      data-testid="add-task-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        className="add-task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        data-testid="add-task-modal"
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Add-a-candy form. A centered modal on desktop, a BottomSheet on mobile
 * (max-width 767px). Closes on Escape or Cancel without creating a task.
 */
export function AddTaskForm({ onClose }: AddTaskFormProps) {
  const mobile = useIsMobile()
  const headingId = useId()
  const body = <FormBody onClose={onClose} headingId={headingId} />
  if (mobile) {
    return (
      <BottomSheet labelledBy={headingId} onClose={onClose}>
        {body}
      </BottomSheet>
    )
  }
  return (
    <Modal onClose={onClose} headingId={headingId}>
      {body}
    </Modal>
  )
}

export default AddTaskForm
