import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App'
import { dateInputToTimestamp, timestampToDateInput } from '../../src/features/forms/taskFormShared'
import type { Task } from '../../src/features/tasks/taskTypes'
import { TASKS_KEY } from '../../src/utils/persistence'
import { chooseDate } from './pickerHelpers'

// Odd time of day on purpose: an untouched date must not be snapped to end of day.
const DUE = new Date(2030, 4, 17, 10, 30, 15, 250).getTime()

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Water the ferns',
    dueDate: DUE,
    monster: 'mummy',
    isSample: false,
    createdAt: Date.now(),
    completedAt: null,
    ...overrides,
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

function openEditForm() {
  const el = document.querySelector('[data-testid="candy-item"]')
  if (!el) throw new Error('candy not found')
  fireEvent.click(el)
  fireEvent.click(within(screen.getByTestId('context-menu')).getByRole('button', { name: 'Edit' }))
  return screen.getByRole('dialog', { name: 'Edit candy' })
}

describe('EditTaskForm', () => {
  const originalMatchMedia = window.matchMedia
  beforeEach(() => {
    window.localStorage.clear()
    mockMedia()
    seed(makeTask())
  })
  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('opens from the context menu pre-populated, with the monster pressed', () => {
    render(<App />)
    openEditForm()
    expect(screen.queryByTestId('context-menu')).toBeNull()
    expect(screen.getByLabelText('Title')).toHaveValue('Water the ferns')
    expect(screen.getByLabelText('Due date (optional)')).toHaveTextContent('May 17')
    expect(screen.getByRole('button', { name: 'Mummy' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Bat' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('saves a new title, due date and monster, then closes', async () => {
    const user = userEvent.setup()
    render(<App />)
    openEditForm()
    const title = screen.getByLabelText('Title')
    await user.clear(title)
    await user.type(title, '  Feed the cobweb ')
    await chooseDate(user, '2031-01-02')
    await user.click(screen.getByRole('button', { name: 'Bat' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(stored()[0]).toMatchObject({
      title: 'Feed the cobweb',
      monster: 'bat',
      // The pre-filled time (10:30) is kept when only the date changes.
      dueDate: new Date(2031, 0, 2, 10, 30, 0, 0).getTime(),
    })
  })

  it('keeps the exact due timestamp when the date is untouched', async () => {
    const user = userEvent.setup()
    render(<App />)
    openEditForm()
    await user.type(screen.getByLabelText('Title'), '!')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(stored()[0]).toMatchObject({ title: 'Water the ferns!', dueDate: DUE })
  })

  it('clears the due date when "No date" is picked', async () => {
    const user = userEvent.setup()
    render(<App />)
    openEditForm()
    await chooseDate(user, '')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(stored()[0]!.dueDate).toBeNull()
  })

  it('keeps the current monster when the selected one is clicked again', async () => {
    const user = userEvent.setup()
    render(<App />)
    openEditForm()
    await user.click(screen.getByRole('button', { name: 'Mummy' }))
    expect(screen.getByRole('button', { name: 'Mummy' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(stored()[0]!.monster).toBe('mummy')
  })

  it.each(['', '   '])('shows an inline error and applies nothing for title %j', async (text) => {
    const user = userEvent.setup()
    render(<App />)
    openEditForm()
    const title = screen.getByLabelText('Title')
    await user.clear(title)
    if (text) await user.type(title, text)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(stored()[0]).toMatchObject(makeTask({ createdAt: stored()[0]!.createdAt }))
  })

  it('discards changes on Cancel and on Escape', async () => {
    const user = userEvent.setup()
    render(<App />)
    const before = stored()[0]!
    openEditForm()
    await user.type(screen.getByLabelText('Title'), ' changed')
    await user.click(screen.getByRole('button', { name: 'Bat' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(stored()[0]).toEqual(before)

    openEditForm()
    await user.type(screen.getByLabelText('Title'), ' again')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(stored()[0]).toEqual(before)
  })
})

describe('timestampToDateInput', () => {
  it('formats the local date and handles null', () => {
    expect(timestampToDateInput(new Date(2030, 0, 2, 23, 59, 59, 999).getTime())).toBe('2030-01-02')
    expect(timestampToDateInput(null)).toBe('')
  })

  /** Validates: Requirement 6.1 */
  it('round-trips the local date through a timestamp (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 4_000_000_000_000 }), (ts) => {
        const dateStr = timestampToDateInput(ts)
        const back = dateInputToTimestamp(dateStr)
        expect(back).not.toBeNull()
        expect(timestampToDateInput(back)).toBe(dateStr)
        const d = new Date(ts)
        expect(dateStr).toBe(
          `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        )
      }),
      { numRuns: 200 },
    )
  })
})
