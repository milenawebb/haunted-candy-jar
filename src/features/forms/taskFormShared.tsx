import { useEffect, useId, useRef, type ReactNode } from 'react'
import { BottomSheet } from '../contextMenu/BottomSheet'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import type { MonsterKind } from '../tasks/taskTypes'
import { MonsterPicker } from './MonsterPicker'
import './AddTaskForm.css'

/** Pieces shared by AddTaskForm and EditTaskForm (fields, date helpers, frame). */

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

/**
 * Date plus optional time ("HH:MM") to a timestamp in local time. With a valid
 * time the result is that local date and time (seconds and ms 0). With an empty
 * or malformed time it falls back to end of day, like dateInputToTimestamp.
 * Returns null when the date is empty or malformed.
 */
export function dateTimeInputToTimestamp(date: string, time: string): number | null {
  const endOfDay = dateInputToTimestamp(date)
  if (endOfDay === null) return null
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!match) return endOfDay
  const day = new Date(endOfDay)
  const result = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(match[1]), Number(match[2]), 0, 0)
  const ts = result.getTime()
  return Number.isNaN(ts) ? endOfDay : ts
}

function isLocalEndOfDay(date: Date): boolean {
  return date.getHours() === 23 && date.getMinutes() === 59 && date.getSeconds() === 59 && date.getMilliseconds() === 999
}

/**
 * Inverse of dateInputToTimestamp: the local calendar date of a timestamp as
 * "YYYY-MM-DD". Returns '' for null or a non-finite value.
 */
export function timestampToDateInput(timestamp: number | null): string {
  if (timestamp === null || !Number.isFinite(timestamp)) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  const y = String(date.getFullYear()).padStart(4, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * The local time of a timestamp as "HH:MM", or '' for null, a non-finite value
 * or local end of day (23:59:59.999, meaning "no time chosen").
 */
export function timestampToTimeInput(timestamp: number | null): string {
  if (timestamp === null || !Number.isFinite(timestamp)) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime()) || isLocalEndOfDay(date)) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * Short due label for the context menu: "Due Jan 22, 3:00 PM", or "Due Jan 22"
 * for end-of-day due dates. Returns '' for null or an invalid timestamp.
 * `locale` defaults to the user's locale.
 */
export function formatDueLabel(timestamp: number | null, locale?: string): string {
  if (timestamp === null || !Number.isFinite(timestamp)) return ''
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (!isLocalEndOfDay(date)) {
    options.hour = 'numeric'
    options.minute = '2-digit'
  }
  return `Due ${new Intl.DateTimeFormat(locale, options).format(date)}`
}

export interface TaskFieldsProps {
  title: string
  onTitleChange: (value: string) => void
  due: string
  onDueChange: (value: string) => void
  time: string
  onTimeChange: (value: string) => void
  monster: MonsterKind | null
  onMonsterChange: (kind: MonsterKind | null) => void
  error: string | null
}

/** Title, due date, optional due time and monster picker fields. */
export function TaskFields(props: TaskFieldsProps) {
  const { title, onTitleChange, due, onDueChange, time, onTimeChange, monster, onMonsterChange, error } = props
  const uid = useId()
  const titleId = `${uid}-title`
  const dueId = `${uid}-due`
  const timeId = `${uid}-time`
  const errorId = `${uid}-error`

  return (
    <>
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
          onChange={(e) => onTitleChange(e.target.value)}
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
          onChange={(e) => {
            onDueChange(e.target.value)
            if (!e.target.value) onTimeChange('')
          }}
        />
      </div>
      <div className="add-task-form__field">
        <label htmlFor={timeId} className="add-task-form__label">
          Time (optional)
        </label>
        <input
          id={timeId}
          className="add-task-form__input"
          type="time"
          value={due ? time : ''}
          disabled={!due}
          onChange={(e) => onTimeChange(e.target.value)}
        />
      </div>
      <div className="add-task-form__field">
        <MonsterPicker value={monster} onChange={onMonsterChange} />
      </div>
    </>
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
 * Centered modal on desktop, BottomSheet on mobile (max-width 767px).
 * `children` receives the heading id used for the dialog's accessible name.
 */
export function FormFrame({ onClose, children }: { onClose: () => void; children: (headingId: string) => ReactNode }) {
  const mobile = useIsMobile()
  const headingId = useId()
  const body = children(headingId)
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
