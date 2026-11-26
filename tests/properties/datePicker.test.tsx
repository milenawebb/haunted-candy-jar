import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App'
import {
  addDays,
  addMonths,
  dateToValue,
  endOfWeek,
  monthGrid,
  quickPickDate,
  startOfWeek,
} from '../../src/features/forms/calendar'
import type { Task } from '../../src/features/tasks/taskTypes'
import { TASKS_KEY } from '../../src/utils/persistence'
import { chooseDate, chooseTime } from './pickerHelpers'

function mockMedia() {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

function stored(): Task[] {
  const raw = window.localStorage.getItem(TASKS_KEY)
  return raw ? (JSON.parse(raw) as Task[]) : []
}

const day = (value: string) => document.querySelector(`[data-date="${value}"]`) as HTMLElement
const trigger = () => screen.getByLabelText('Due date (optional)')

describe('calendar month grid', () => {
  /** Validates: Requirement 1.1 */
  it('shows every date of the month exactly once, in complete weeks (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1971, max: 2090 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 0, max: 6 }), (y, m, ws) => {
        const weeks = monthGrid(y, m, ws)
        const days = weeks.flat()
        const inMonth = days.filter((d) => d.inMonth).map((d) => d.value)
        const expected = new Date(y, m, 0).getDate()
        expect(inMonth).toHaveLength(expected)
        expect(new Set(inMonth).size).toBe(expected)
        for (let d = 1; d <= expected; d += 1) {
          expect(inMonth).toContain(`${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
        }
        expect(weeks.every((w) => w.length === 7)).toBe(true)
        expect(new Set(days.map((d) => d.value)).size).toBe(days.length)
        expect(new Date(days[0]!.value + 'T12:00:00').getDay()).toBe(ws)
      }),
      { numRuns: 200 },
    )
  })

  it('has the right leading days for known months', () => {
    // May 2030 starts on a Wednesday: Sunday-first grid leads with Apr 28, 29, 30.
    const weeks = monthGrid(2030, 5)
    expect(weeks[0]!.slice(0, 4).map((d) => d.value)).toEqual(['2030-04-28', '2030-04-29', '2030-04-30', '2030-05-01'])
    expect(weeks[0]!.filter((d) => !d.inMonth)).toHaveLength(3)
    // Feb 2026 starts on a Sunday and has 28 days: exactly four rows.
    expect(monthGrid(2026, 2)).toHaveLength(4)
  })

  it('moves days, months and weeks', () => {
    expect(addDays('2030-12-31', 1)).toBe('2031-01-01')
    expect(addMonths('2030-01-31', 1)).toBe('2030-02-28')
    expect(addMonths('2030-01-15', -1)).toBe('2029-12-15')
    expect(startOfWeek('2030-05-17')).toBe('2030-05-12')
    expect(endOfWeek('2030-05-17')).toBe('2030-05-18')
  })
})

describe('quick picks', () => {
  // 2030-05-12 is a Sunday. Index = weekday (0 = Sunday).
  const sunday = new Date(2030, 4, 12, 9, 0)
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const expected = [
    // [today, tomorrow, weekend, nextWeek]
    ['2030-05-12', '2030-05-13', '2030-05-12', '2030-05-13'],
    ['2030-05-13', '2030-05-14', '2030-05-18', '2030-05-20'],
    ['2030-05-14', '2030-05-15', '2030-05-18', '2030-05-20'],
    ['2030-05-15', '2030-05-16', '2030-05-18', '2030-05-20'],
    ['2030-05-16', '2030-05-17', '2030-05-18', '2030-05-20'],
    ['2030-05-17', '2030-05-18', '2030-05-18', '2030-05-20'],
    ['2030-05-18', '2030-05-19', '2030-05-18', '2030-05-20'],
  ]
  it.each(names.map((n, i) => [n, i] as const))('computes picks for a %s', (_name, i) => {
    const today = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i, 15, 30)
    const [t, tm, we, nw] = expected[i]!
    expect(dateToValue(today)).toBe(t)
    expect(quickPickDate('today', today)).toBe(t)
    expect(quickPickDate('tomorrow', today)).toBe(tm)
    expect(quickPickDate('weekend', today)).toBe(we)
    expect(quickPickDate('nextWeek', today)).toBe(nw)
    expect(quickPickDate('none', today)).toBeNull()
  })

  it('next week is always a Monday strictly after today (property)', () => {
    fc.assert(
      fc.property(fc.date({ min: new Date(2000, 0, 1), max: new Date(2090, 0, 1), noInvalidDate: true }), (d) => {
        const next = quickPickDate('nextWeek', d)!
        expect(new Date(next + 'T12:00:00').getDay()).toBe(1)
        expect(next > dateToValue(d)).toBe(true)
        expect(next <= addDays(dateToValue(d), 7)).toBe(true)
      }),
      { numRuns: 100 },
    )
  })
})

describe('DatePicker in the Add form', () => {
  const originalMatchMedia = window.matchMedia
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('hcj_seen_intro', 'true')
    mockMedia()
  })
  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  async function openAdd(user: ReturnType<typeof userEvent.setup>) {
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add a candy' }))
  }

  it('opens on click, focuses today, and marks today by name', async () => {
    const user = userEvent.setup()
    await openAdd(user)
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger()).toHaveTextContent('No date')
    await user.click(trigger())
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    const today = dateToValue(new Date())
    expect(day(today)).toHaveFocus()
    expect(day(today).getAttribute('aria-label')).toMatch(/, Today$/)
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument()
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })

  it('picks a day with a click and closes, marking it selected', async () => {
    const user = userEvent.setup()
    await openAdd(user)
    await chooseDate(user, '2030-05-17')
    expect(screen.queryByRole('grid')).toBeNull()
    expect(trigger()).toHaveTextContent('May 17')
    expect(trigger()).toHaveFocus()
    await user.click(trigger())
    expect(day('2030-05-17').closest('[role="gridcell"]')).toHaveAttribute('aria-selected', 'true')
    expect(day('2030-05-17')).toHaveFocus()
  })

  it('picks with arrow keys plus Enter, crossing into the next month', async () => {
    const user = userEvent.setup()
    await openAdd(user)
    await chooseDate(user, '2030-05-31')
    await user.click(trigger())
    expect(day('2030-05-31')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(day('2030-06-01')).toHaveFocus()
    expect(screen.getByRole('grid', { name: /June 2030/ })).toBeInTheDocument()
    await user.keyboard('{ArrowDown}{ArrowLeft}{Enter}')
    expect(trigger()).toHaveTextContent('Jun 7')
    await user.type(screen.getByLabelText('Title'), 'Feed')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(stored()[0]!.dueDate).toBe(new Date(2030, 5, 7, 23, 59, 59, 999).getTime())
  })

  it('supports Home, End and PageUp and PageDown', async () => {
    const user = userEvent.setup()
    await openAdd(user)
    await chooseDate(user, '2030-05-17')
    await user.click(trigger())
    await user.keyboard('{Home}')
    expect(day('2030-05-12')).toHaveFocus()
    await user.keyboard('{End}')
    expect(day('2030-05-18')).toHaveFocus()
    await user.keyboard('{PageDown}')
    expect(day('2030-06-18')).toHaveFocus()
    await user.keyboard('{PageUp}{PageUp}')
    expect(day('2030-04-18')).toHaveFocus()
  })

  it('previous and next arrows change the visible month', async () => {
    const user = userEvent.setup()
    await openAdd(user)
    await chooseDate(user, '2030-05-17')
    await user.click(trigger())
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByRole('heading', { name: /June 2030/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByRole('heading', { name: /April 2030/ })).toBeInTheDocument()
  })

  it('Escape closes only the picker and restores focus to the trigger', async () => {
    const user = userEvent.setup()
    await openAdd(user)
    await user.click(trigger())
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('grid')).toBeNull()
    expect(trigger()).toHaveFocus()
    expect(screen.getByRole('dialog', { name: 'Add a candy' })).toBeInTheDocument()
  })

  it('closes on an outside click', async () => {
    const user = userEvent.setup()
    await openAdd(user)
    await user.click(trigger())
    await user.click(screen.getByLabelText('Title'))
    expect(screen.queryByRole('grid')).toBeNull()
  })

  it('quick picks set the date and No date clears date and time', async () => {
    const user = userEvent.setup()
    await openAdd(user)
    await user.click(trigger())
    await user.click(screen.getByRole('button', { name: 'Tomorrow' }))
    const tomorrow = quickPickDate('tomorrow', new Date())!
    await user.click(trigger())
    expect(day(tomorrow).closest('[role="gridcell"]')).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Escape}')
    await chooseTime(user, '09:00')
    expect(screen.getByLabelText('Time (optional)')).toHaveTextContent(/9:00/)
    await user.click(trigger())
    await user.click(screen.getByRole('button', { name: 'No date' }))
    expect(trigger()).toHaveTextContent('No date')
    expect(screen.getByLabelText('Time (optional)')).toBeDisabled()
    expect(screen.getByLabelText('Time (optional)')).toHaveTextContent('No time')
  })

  it('renders inline inside the BottomSheet on mobile', async () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('max-width: 767px'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    const user = userEvent.setup()
    await openAdd(user)
    await user.click(trigger())
    const sheet = screen.getByTestId('bottom-sheet')
    expect(within(sheet).getByRole('grid')).toBeInTheDocument()
  })
})
