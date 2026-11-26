import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App'
import { TIME_STEPS, formatTime } from '../../src/features/forms/TimePicker'
import type { Task } from '../../src/features/tasks/taskTypes'
import { TASKS_KEY } from '../../src/utils/persistence'
import { chooseDate } from './pickerHelpers'

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

const timeTrigger = () => screen.getByLabelText('Time (optional)')

describe('TimePicker', () => {
  const originalMatchMedia = window.matchMedia
  beforeEach(() => {
    window.localStorage.clear()
    mockMedia()
  })
  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  async function openAddWithDate(user: ReturnType<typeof userEvent.setup>) {
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add a candy' }))
    await chooseDate(user, '2030-05-17')
  }

  it('lists 48 half-hour steps and formats them in 12 hour time', () => {
    expect(TIME_STEPS).toHaveLength(48)
    expect(TIME_STEPS[0]).toBe('00:00')
    expect(TIME_STEPS[47]).toBe('23:30')
    expect(formatTime('15:00').replace(/\s/g, ' ')).toBe('3:00 PM')
    expect(formatTime('nope')).toBe('')
  })

  it('is disabled until a date is chosen', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add a candy' }))
    expect(timeTrigger()).toBeDisabled()
    expect(timeTrigger()).toHaveAttribute('aria-disabled', 'true')
    expect(timeTrigger()).toHaveTextContent('No time')
    await chooseDate(user, '2030-05-17')
    expect(timeTrigger()).toBeEnabled()
    expect(timeTrigger()).toHaveAttribute('aria-disabled', 'false')
  })

  it.each([
    ['Morning', '09:00'],
    ['Afternoon', '14:00'],
    ['Evening', '19:00'],
  ])('%s quick pick stores %s', async (name, value) => {
    const user = userEvent.setup()
    await openAddWithDate(user)
    await user.click(timeTrigger())
    expect(timeTrigger()).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('button', { name }))
    expect(timeTrigger()).toHaveFocus()
    await user.click(timeTrigger())
    expect(document.querySelector(`[data-value="${value}"]`)).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Escape}')
    await user.type(screen.getByLabelText('Title'), 'Feed')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    const [h, m] = value.split(':').map(Number)
    expect(stored()[0]!.dueDate).toBe(new Date(2030, 4, 17, h, m, 0, 0).getTime())
  })

  it('arrow keys plus Enter pick from the list, Home and End jump', async () => {
    const user = userEvent.setup()
    await openAddWithDate(user)
    await user.click(timeTrigger())
    const list = screen.getByRole('listbox')
    expect(list).toHaveFocus()
    expect(screen.getAllByRole('option')).toHaveLength(48)
    await user.keyboard('{Home}')
    expect(list.getAttribute('aria-activedescendant')).toBe(document.querySelector('[data-value="00:00"]')!.id)
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowUp}{Enter}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(timeTrigger()).toHaveFocus()
    expect(timeTrigger()).toHaveTextContent(/1:00/)
    await user.click(timeTrigger())
    await user.keyboard('{End}{Enter}')
    expect(timeTrigger()).toHaveTextContent(/11:30/)
    await user.type(screen.getByLabelText('Title'), 'Late')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(stored()[0]!.dueDate).toBe(new Date(2030, 4, 17, 23, 30, 0, 0).getTime())
  })

  it('Escape closes only the picker and restores focus', async () => {
    const user = userEvent.setup()
    await openAddWithDate(user)
    await user.click(timeTrigger())
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(timeTrigger()).toHaveFocus()
    expect(screen.getByRole('dialog', { name: 'Add a candy' })).toBeInTheDocument()
  })

  it('"No time" clears the time and the task falls back to end of day', async () => {
    const user = userEvent.setup()
    await openAddWithDate(user)
    await user.click(timeTrigger())
    await user.click(screen.getByRole('button', { name: 'Evening' }))
    expect(timeTrigger()).toHaveTextContent(/7:00/)
    await user.click(timeTrigger())
    await user.click(screen.getByRole('button', { name: 'No time' }))
    expect(timeTrigger()).toHaveTextContent('No time')
    await user.type(screen.getByLabelText('Title'), 'Feed')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(stored()[0]!.dueDate).toBe(new Date(2030, 4, 17, 23, 59, 59, 999).getTime())
  })
})
