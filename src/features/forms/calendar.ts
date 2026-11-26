/**
 * Pure date math for the spooky date picker. Dates are local calendar dates
 * written as "yyyy-mm-dd" strings (the same format the task forms keep in state).
 * No time zones are involved: everything is computed from year, month and day.
 */

/** First day of the week in the month grid: 0 = Sunday. Fixed (not locale based) so the grid is predictable. */
export const WEEK_START = 0

export type QuickPick = 'today' | 'tomorrow' | 'weekend' | 'nextWeek' | 'none'

export interface GridDay {
  /** "yyyy-mm-dd" */
  value: string
  /** Day of month, 1 to 31. */
  day: number
  /** False for the leading and trailing days borrowed from neighbouring months. */
  inMonth: boolean
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0')
}

/** Formats a local year, month (1 to 12) and day as "yyyy-mm-dd". */
export function formatDate(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`
}

/** Local calendar date of a Date as "yyyy-mm-dd". */
export function dateToValue(date: Date): string {
  return formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

/** Parses "yyyy-mm-dd" into a local Date at noon (safe from DST edges). Null when malformed or not a real date. */
export function parseDate(value: string): Date | null {
  const match = DATE_RE.exec(value)
  if (!match) return null
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(y, m - 1, d, 12, 0, 0, 0)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

/** The date `days` after (or before, when negative) `value`. Returns `value` unchanged when it is malformed. */
export function addDays(value: string, days: number): string {
  const date = parseDate(value)
  if (!date) return value
  date.setDate(date.getDate() + days)
  return dateToValue(date)
}

/** Moves a date by whole months, clamping the day to the target month's length (Jan 31 + 1 = Feb 28 or 29). */
export function addMonths(value: string, months: number): string {
  const date = parseDate(value)
  if (!date) return value
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1, 12, 0, 0, 0)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return formatDate(target.getFullYear(), target.getMonth() + 1, Math.min(date.getDate(), last))
}

/** Weekday of a date, 0 = Sunday. Returns 0 for a malformed value. */
export function weekdayOf(value: string): number {
  return parseDate(value)?.getDay() ?? 0
}

/** First date of the week containing `value`. */
export function startOfWeek(value: string, weekStart: number = WEEK_START): string {
  return addDays(value, -((weekdayOf(value) - weekStart + 7) % 7))
}

/** Last date of the week containing `value`. */
export function endOfWeek(value: string, weekStart: number = WEEK_START): string {
  return addDays(startOfWeek(value, weekStart), 6)
}

/**
 * Month grid as full weeks of 7 days. `month` is 1 to 12. Leading and trailing
 * days come from the neighbouring months (inMonth false), so the grid always
 * has 4 to 6 complete rows and every date of the month appears exactly once
 * with inMonth true.
 */
export function monthGrid(year: number, month: number, weekStart: number = WEEK_START): GridDay[][] {
  const first = formatDate(year, month, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const lead = (weekdayOf(first) - weekStart + 7) % 7
  const total = Math.ceil((lead + daysInMonth) / 7) * 7
  const weeks: GridDay[][] = []
  for (let i = 0; i < total; i += 1) {
    const offset = i - lead
    const value = addDays(first, offset)
    const day = Number(value.slice(8, 10))
    const inMonth = offset >= 0 && offset < daysInMonth
    if (i % 7 === 0) weeks.push([])
    weeks[weeks.length - 1]!.push({ value, day, inMonth })
  }
  return weeks
}

/**
 * Quick pick date math, relative to `today`:
 * - today: today.
 * - tomorrow: today + 1.
 * - weekend: the coming Saturday. Saturday and Sunday both pick today.
 * - nextWeek: the next Monday after today (on a Monday, the Monday 7 days later).
 * - none: null, meaning "clear the date (and the time)".
 */
export function quickPickDate(kind: QuickPick, today: Date): string | null {
  const base = dateToValue(today)
  const weekday = weekdayOf(base)
  switch (kind) {
    case 'today':
      return base
    case 'tomorrow':
      return addDays(base, 1)
    case 'weekend':
      return weekday === 0 ? base : addDays(base, (6 - weekday + 7) % 7)
    case 'nextWeek':
      return addDays(base, ((1 - weekday + 7) % 7) || 7)
    case 'none':
      return null
  }
}
