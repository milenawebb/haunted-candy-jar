import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import './Picker.css'
import './TimePicker.css'

export interface TimePickerProps {
  /** "HH:MM", or '' for no time. */
  value: string
  onChange: (value: string) => void
  label: string
  disabled?: boolean
}

/** 00:00 to 23:30 in 30-minute steps. */
export const TIME_STEPS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  return `${h}:${i % 2 === 0 ? '00' : '30'}`
})

const QUICK_TIMES = [
  { value: '09:00', text: 'Morning' },
  { value: '14:00', text: 'Afternoon' },
  { value: '19:00', text: 'Evening' },
]

/** Formats "HH:MM" for display (12 h in en-US). Returns '' when malformed. */
export function formatTime(value: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  if (!match) return ''
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2000, 0, 1, Number(match[1]), Number(match[2])),
  )
}

/** The list step to highlight on open: the chosen time, else the next half hour from now. */
function initialIndex(value: string, now: Date): number {
  const exact = TIME_STEPS.indexOf(value)
  if (exact >= 0) return exact
  const source = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  const minutes = source ? Number(source[1]) * 60 + Number(source[2]) : now.getHours() * 60 + now.getMinutes()
  return Math.min(47, Math.ceil(minutes / 30))
}

/**
 * Themed time picker: a trigger button that opens a dark glass dropdown with
 * quick picks and a listbox of 30-minute steps. The listbox keeps focus and
 * points at the active option with aria-activedescendant. Values stay "HH:MM".
 * On mobile the dropdown renders inline in the sheet content.
 */
export function TimePicker({ value, onChange, label, disabled = false }: TimePickerProps) {
  const uid = useId()
  const triggerId = `${uid}-trigger`
  const labelId = `${uid}-label`
  const valueId = `${uid}-value`
  const panelId = `${uid}-panel`
  const hintId = `${uid}-hint`
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const reduced = useReducedMotion()
  const mobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useClickOutside(wrapRef, () => close(false), { active: open })

  // Close if the field becomes disabled (the date was cleared).
  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  // Keep the active option in view. Focus moves to the list on open and stays there.
  useEffect(() => {
    if (!open) return
    const list = listRef.current
    if (list && document.activeElement !== list) list.focus()
    const el = list?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    if (list && el) list.scrollTop = Math.max(0, el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2)
  }, [open, active])

  const openPicker = () => {
    setActive(initialIndex(value, new Date()))
    setOpen(true)
  }

  const pick = (next: string) => {
    onChange(next)
    close(true)
  }

  const onListKey = (e: KeyboardEvent) => {
    let next: number | null = null
    if (e.key === 'ArrowDown') next = Math.min(47, active + 1)
    else if (e.key === 'ArrowUp') next = Math.max(0, active - 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = 47
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(TIME_STEPS[active]!)
      return
    }
    if (next !== null) {
      e.preventDefault()
      setActive(next)
    }
  }

  // Escape closes only the picker, not the surrounding dialog.
  const onPanelKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close(true)
    }
  }

  const panelClass = [
    'picker__panel',
    'time-picker__panel',
    mobile ? 'picker__panel--inline' : '',
    reduced ? 'picker__panel--fade' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const shown = formatTime(value)

  return (
    <div className="add-task-form__field picker" ref={wrapRef}>
      <label id={labelId} htmlFor={triggerId} className="add-task-form__label">
        {label}
      </label>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="picker__trigger"
        disabled={disabled}
        aria-disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-labelledby={`${labelId} ${valueId}`}
        aria-describedby={disabled ? hintId : undefined}
        onClick={() => (open ? close(false) : openPicker())}
      >
        <span id={valueId} className={shown ? 'picker__value' : 'picker__value picker__value--empty'}>
          {shown || 'No time'}
        </span>
        <span aria-hidden="true" className="picker__chevron">
          {open ? '\u25B4' : '\u25BE'}
        </span>
      </button>
      {disabled && (
        <p id={hintId} className="picker__hint">
          Pick a date first
        </p>
      )}
      {open && (
        <div id={panelId} className={panelClass} role="dialog" aria-label="Pick a time" onKeyDown={onPanelKey}>
          <div className="time-picker__quick">
            {QUICK_TIMES.map((q) => (
              <button key={q.value} type="button" className="picker__chip" onClick={() => pick(q.value)}>
                {q.text}
              </button>
            ))}
            <button type="button" className="picker__chip" onClick={() => pick('')}>
              No time
            </button>
          </div>
          <ul
            ref={listRef}
            className="time-picker__list"
            role="listbox"
            tabIndex={0}
            aria-label="Times"
            aria-activedescendant={`${uid}-opt-${active}`}
            onKeyDown={onListKey}
          >
            {TIME_STEPS.map((t, i) => {
              const selected = t === value
              return (
                <li
                  key={t}
                  id={`${uid}-opt-${i}`}
                  role="option"
                  aria-selected={selected}
                  data-value={t}
                  data-index={i}
                  className={[
                    'time-picker__option',
                    i === active ? 'time-picker__option--active' : '',
                    selected ? 'time-picker__option--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => pick(t)}
                >
                  {formatTime(t)}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default TimePicker
