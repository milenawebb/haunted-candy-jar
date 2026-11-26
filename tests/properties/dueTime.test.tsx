import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App'
import {
  dateTimeInputToTimestamp,
  formatDueLabel,
  timestampToDateInput,
  timestampToTimeInput,
} from '../../src/features/forms/taskFormShared'
import type { Task } from '../../src/features/tasks/taskTypes'
import { TASKS_KEY } from '../../src/utils/persistence'

const END_OF_DAY = new Date(2030, 4, 17, 23, 59, 59, 999).getTime()
const AFTERNOON = new Date(2030, 4, 17, 15, 0, 0, 0).getTime()
const ODD = new Date(2030, 4, 17, 10, 30, 15, 250).getTime()

function makeTask(dueDate: number | null): Task {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Water the ferns',
    dueDate,
    monster: 'mummy',
    isSample: false,
    createdAt: Date.now(),
    completedAt: null,
  }
}
function seed(task: Task) {
  window.localStorage.setItem(TASKS_KEY, JSON.stringify([task]))
}
function stored(): Task[] {
  const raw = window.localStorage.getItem(TASKS_KEY)
  return raw ? (JSON.parse(raw) as Task[]) : []
}
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
function clickCandy() {
  const el = document.querySelector('[data-testid="candy-item"]')
  if (!el) throw new Error('candy not found')
  fireEvent.click(el)
}
function openEditForm() {
  clickCandy()
  fireEvent.click(within(screen.getByTestId('context-menu')).getByRole('button', { name: 'Edit' }))
  return screen.getByRole('dialog', { name: 'Edit candy' })
}
const dateField = () => screen.getByLabelText('Due date (optional)')
const timeField = () => screen.getByLabelText('Time (optional)')

describe('AddTaskForm due time', () => {
  const originalMatchMedia = window.matchMedia
  beforeEach(() => {
    window.localStorage.clear()
    mockMedia()
  })
  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('date only stores local end of day', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add a candy' }))
    await user.type(screen.getByLabelText('Title'), 'Feed')
    fireEvent.change(dateField(), { target: { value: '2030-05-17' } })
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(stored()[0]!.dueDate).toBe(END_OF_DAY)
  })

  it('date plus time stores that local date and time', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add a candy' }))
    await user.type(screen.getByLabelText('Title'), 'Feed')
    fireEvent.change(dateField(), { target: { value: '2030-05-17' } })
    fireEvent.change(timeField(), { target: { value: '15:00' } })
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(stored()[0]!.dueDate).toBe(AFTERNOON)
  })

  it('disables the time until a date is chosen and clears it with the date', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add a candy' }))
    expect(timeField()).toBeDisabled()
    expect(timeField()).toHaveAttribute('type', 'time')
    fireEvent.change(dateField(), { target: { value: '2030-05-17' } })
    expect(timeField()).toBeEnabled()
    fireEvent.change(timeField(), { target: { value: '15:00' } })
    expect(timeField()).toHaveValue('15:00')
    fireEvent.change(dateField(), { target: { value: '' } })
    expect(timeField()).toBeDisabled()
    expect(timeField()).toHaveValue('')
    fireEvent.change(dateField(), { target: { value: '2030-05-18' } })
    expect(timeField()).toHaveValue('')
  })
})

describe('EditTaskForm due time', () => {
  const originalMatchMedia = window.matchMedia
  beforeEach(() => {
    window.localStorage.clear()
    mockMedia()
  })
  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('pre-fills the time for a non-end-of-day due date', () => {
    seed(makeTask(AFTERNOON))
    render(<App />)
    openEditForm()
    expect(timeField()).toHaveValue('15:00')
  })

  it('leaves the time empty for an end-of-day due date', () => {
    seed(makeTask(END_OF_DAY))
    render(<App />)
    openEditForm()
    expect(dateField()).toHaveValue('2030-05-17')
    expect(timeField()).toHaveValue('')
    expect(timeField()).toBeEnabled()
  })

  it('recomputes when only the time changes', async () => {
    const user = userEvent.setup()
    seed(makeTask(AFTERNOON))
    render(<App />)
    openEditForm()
    fireEvent.change(timeField(), { target: { value: '18:45' } })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(stored()[0]!.dueDate).toBe(new Date(2030, 4, 17, 18, 45, 0, 0).getTime())
  })

  it('keeps the original timestamp when date and time are unchanged', async () => {
    const user = userEvent.setup()
    seed(makeTask(ODD))
    render(<App />)
    openEditForm()
    expect(timeField()).toHaveValue('10:30')
    await user.type(screen.getByLabelText('Title'), '!')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(stored()[0]!.dueDate).toBe(ODD)
  })
})

describe('context menu due label', () => {
  const originalMatchMedia = window.matchMedia
  beforeEach(() => {
    window.localStorage.clear()
    mockMedia()
  })
  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('shows date and time for a timed due date', () => {
    seed(makeTask(AFTERNOON))
    render(<App />)
    clickCandy()
    const expected = `Due ${new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(AFTERNOON))}`
    expect(within(screen.getByTestId('context-menu')).getByText(expected)).toBeInTheDocument()
  })

  it('shows only the date for end of day, and nothing without a due date', () => {
    seed(makeTask(END_OF_DAY))
    const { unmount } = render(<App />)
    clickCandy()
    const expected = `Due ${new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(END_OF_DAY))}`
    expect(within(screen.getByTestId('context-menu')).getByText(expected)).toBeInTheDocument()
    unmount()
    window.localStorage.clear()
    seed(makeTask(null))
    render(<App />)
    clickCandy()
    expect(within(screen.getByTestId('context-menu')).queryByText(/^Due /)).toBeNull()
  })
})

describe('formatDueLabel', () => {
  it('formats with a pinned locale, independent of the machine time zone', () => {
    const timed = new Date(2030, 0, 22, 15, 0, 0, 0).getTime()
    const endOfDay = new Date(2030, 0, 22, 23, 59, 59, 999).getTime()
    expect(formatDueLabel(timed, 'en-US')).toBe('Due Jan 22, 3:00 PM')
    expect(formatDueLabel(endOfDay, 'en-US')).toBe('Due Jan 22')
    expect(formatDueLabel(null, 'en-US')).toBe('')
  })
})

describe('dateTimeInputToTimestamp', () => {
  it('handles empty and malformed input', () => {
    expect(dateTimeInputToTimestamp('', '10:00')).toBeNull()
    expect(dateTimeInputToTimestamp('2030-05-17', '')).toBe(END_OF_DAY)
    expect(dateTimeInputToTimestamp('2030-05-17', '25:99')).toBe(END_OF_DAY)
    expect(timestampToTimeInput(null)).toBe('')
    expect(timestampToTimeInput(END_OF_DAY)).toBe('')
  })

  // Validates: Requirement 6.1
  it('round-trips a random local date and HH:MM', () => {
    const dateArb = fc
      .date({ min: new Date(2000, 0, 1), max: new Date(2090, 11, 31), noInvalidDate: true })
      .map((d) => timestampToDateInput(d.getTime()))
    const timeArb = fc
      .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
      .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    fc.assert(
      fc.property(dateArb, timeArb, (date, time) => {
        const ts = dateTimeInputToTimestamp(date, time)
        expect(ts).not.toBeNull()
        expect(timestampToDateInput(ts)).toBe(date)
        // A time skipped by a DST gap lands on the shifted hour, so only compare when the local clock agrees.
        const d = new Date(ts as number)
        const requested = Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
        if (d.getHours() * 60 + d.getMinutes() === requested) {
          expect(timestampToTimeInput(ts)).toBe(time)
        }
      }),
      { numRuns: 200 },
    )
  })
})
