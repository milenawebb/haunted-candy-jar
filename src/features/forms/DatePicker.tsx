import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import {
  WEEK_START,
  addDays,
  addMonths,
  dateToValue,
  endOfWeek,
  monthGrid,
  parseDate,
  quickPickDate,
  startOfWeek,
  type QuickPick,
} from './calendar'
import './Picker.css'
import './DatePicker.css'

export interface DatePickerProps {
  /** "yyyy-mm-dd", or '' for no date. */
  value: string
  onChange: (value: string) => void
  label: string
}

const QUICK_PICKS: { kind: QuickPick; text: string }[] = [
  { kind: 'today', text: 'Today' },
  { kind: 'tomorrow', text: 'Tomorrow' },
  { kind: 'weekend', text: 'This weekend' },
  { kind: 'nextWeek', text: 'Next week' },
  { kind: 'none', text: 'No date' },
]

function formatTrigger(value: string): string {
  const date = parseDate(value)
  if (!date) return 'No date'
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(date)
}

/**
 * Themed date picker. The trigger button shows the chosen date; it opens a
 * dark glass dropdown with quick picks and a month grid.
 *
 * Accessibility pattern: ARIA grid (role="grid", rows, gridcells) with a roving
 * tabindex. Each gridcell holds one 44px button. Arrow keys move by day or week
 * (crossing months), Home and End jump to the week start and end (weeks start
 * on Sunday), PageUp and PageDown move a month, Enter or Space picks, Escape
 * closes and returns focus to the trigger. On mobile the dropdown renders
 * inline in the sheet content instead of floating.
 */
export function DatePicker({ value, onChange, label }: DatePickerProps) {
  const uid = useId()
  const triggerId = `${uid}-trigger`
  const labelId = `${uid}-label`
  const valueId = `${uid}-value`
  const panelId = `${uid}-panel`
  const headingId = `${uid}-heading`
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const gridRef = useRef<HTMLTableElement>(null)
  const moveFocus = useRef(false)
  const reduced = useReducedMotion()
  const mobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState('')

  const today = dateToValue(new Date())
  const view = parseDate(focused) ?? new Date()
  const year = view.getFullYear()
  const month = view.getMonth() + 1
  const weeks = useMemo(() => monthGrid(year, month), [year, month])
  const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(view)

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useClickOutside(wrapRef, () => close(false), { active: open })

  useEffect(() => {
    if (!open || !moveFocus.current) return
    moveFocus.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus()
  }, [open, focused])

  const openPicker = () => {
    moveFocus.current = true
    setFocused(parseDate(value) ? value : today)
    setOpen(true)
  }

  const moveTo = (next: string) => {
    moveFocus.current = true
    setFocused(next)
  }

  const pick = (next: string) => {
    onChange(next)
    close(true)
  }

  const onGridKey = (e: KeyboardEvent) => {
    const keys: Record<string, string> = {
      ArrowLeft: addDays(focused, -1),
      ArrowRight: addDays(focused, 1),
      ArrowUp: addDays(focused, -7),
      ArrowDown: addDays(focused, 7),
      Home: startOfWeek(focused, WEEK_START),
      End: endOfWeek(focused, WEEK_START),
      PageUp: addMonths(focused, -1),
      PageDown: addMonths(focused, 1),
    }
    const next = keys[e.key]
    if (next) {
      e.preventDefault()
      moveTo(next)
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

  const weekdayLabels = weeks[0]!.map((d) => {
    const date = parseDate(d.value)!
    return {
      narrow: new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(date),
      long: new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date),
    }
  })

  const dayName = (v: string) => {
    const text = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(parseDate(v)!)
    return v === today ? `${text}, Today` : text
  }

  const panelClass = [
    'picker__panel',
    'date-picker__panel',
    mobile ? 'picker__panel--inline' : '',
    reduced ? 'picker__panel--fade' : '',
  ]
    .filter(Boolean)
    .join(' ')

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
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-labelledby={`${labelId} ${valueId}`}
        onClick={() => (open ? close(false) : openPicker())}
      >
        <span id={valueId} className={value ? 'picker__value' : 'picker__value picker__value--empty'}>
          {formatTrigger(value)}
        </span>
        <span aria-hidden="true" className="picker__chevron">
          {open ? '\u25B4' : '\u25BE'}
        </span>
      </button>
      {open && (
        <div id={panelId} className={panelClass} role="dialog" aria-labelledby={headingId} onKeyDown={onPanelKey}>
          <div className="date-picker__quick">
            {QUICK_PICKS.map((q) => (
              <button
                key={q.kind}
                type="button"
                className="picker__chip"
                onClick={() => {
                  const next = quickPickDate(q.kind, new Date())
                  pick(next ?? '')
                }}
              >
                {q.text}
              </button>
            ))}
          </div>
          <div className="date-picker__nav">
            <button
              type="button"
              className="picker__chip date-picker__arrow"
              aria-label="Previous month"
              onClick={() => setFocused(addMonths(focused, -1))}
            >
              <span aria-hidden="true">&lsaquo;</span>
            </button>
            <h3 id={headingId} className="date-picker__heading" aria-live="polite">
              {monthName}
            </h3>
            <button
              type="button"
              className="picker__chip date-picker__arrow"
              aria-label="Next month"
              onClick={() => setFocused(addMonths(focused, 1))}
            >
              <span aria-hidden="true">&rsaquo;</span>
            </button>
          </div>
          <table ref={gridRef} className="date-picker__grid" role="grid" aria-labelledby={headingId} onKeyDown={onGridKey}>
            <thead>
              <tr role="row">
                {weekdayLabels.map((w) => (
                  <th key={w.long} role="columnheader" scope="col" abbr={w.long} className="date-picker__dow">
                    <span aria-hidden="true">{w.narrow}</span>
                    <span className="picker__sr">{w.long}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0]!.value} role="row">
                  {week.map((d) => {
                    const selected = d.value === value
                    const isToday = d.value === today
                    const cls = [
                      'date-picker__day',
                      d.inMonth ? '' : 'date-picker__day--outside',
                      isToday ? 'date-picker__day--today' : '',
                      selected ? 'date-picker__day--selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                    return (
                      <td key={d.value} role="gridcell" aria-selected={selected} className="date-picker__cell">
                        <button
                          type="button"
                          className={cls}
                          data-date={d.value}
                          tabIndex={d.value === focused ? 0 : -1}
                          aria-label={dayName(d.value)}
                          onClick={() => pick(d.value)}
                        >
                          {d.day}
                          {isToday && (
                            <span aria-hidden="true" className="date-picker__today-dot" />
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default DatePicker
