import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App'
import { dateInputToTimestamp } from '../../src/features/forms/AddTaskForm'
import type { Task } from '../../src/features/tasks/taskTypes'
import { MONSTER_KINDS, taskIdToMonster } from '../../src/utils/monsterKind'
import { TASKS_KEY } from '../../src/utils/persistence'
import { chooseDate } from './pickerHelpers'

function mockMedia(mobile: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: mobile && query.includes('max-width: 767px'),
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

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Add a candy' }))
  return screen.getByRole('dialog', { name: 'Add a candy' })
}

describe('AddTaskForm', () => {
  const originalMatchMedia = window.matchMedia
  beforeEach(() => {
    window.localStorage.clear()
    mockMedia(false)
  })
  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('opens as a labelled modal with focus on the title', async () => {
    const user = userEvent.setup()
    render(<App />)
    const dialog = await openForm(user)
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByLabelText('Title')).toHaveFocus()
    expect(screen.getByLabelText('Title')).toHaveAttribute('maxlength', '120')
    // The date field is the themed picker trigger (a popup button), not a native date input.
    expect(screen.getByLabelText('Due date (optional)')).toHaveAttribute('aria-haspopup', 'dialog')
    expect(within(dialog).getByRole('group', { name: 'Choose a monster' })).toBeInTheDocument()
  })

  it.each(['', '   '])('shows an inline error and creates nothing for title %j', async (text) => {
    const user = userEvent.setup()
    render(<App />)
    await openForm(user)
    if (text) await user.type(screen.getByLabelText('Title'), text)
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-describedby', screen.getByRole('alert').id)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(stored()).toHaveLength(0)
  })

  it('creates a task with the chosen due date and monster, then closes', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openForm(user)
    await user.type(screen.getByLabelText('Title'), '  Feed the cobweb ')
    await chooseDate(user, '2030-05-17')
    await user.click(screen.getByRole('button', { name: 'Bat' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    const tasks = stored()
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({
      title: 'Feed the cobweb',
      monster: 'bat',
      dueDate: new Date(2030, 4, 17, 23, 59, 59, 999).getTime(),
      completedAt: null,
    })
  })

  it('auto-assigns a monster when none is chosen and leaves due date null', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openForm(user)
    await user.type(screen.getByLabelText('Title'), 'Surprise')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    const task = stored()[0]!
    expect(task.dueDate).toBeNull()
    expect(MONSTER_KINDS).toContain(task.monster)
    expect(task.monster).toBe(taskIdToMonster(task.id))
  })

  it('closes on Escape and on Cancel without creating a task', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openForm(user)
    await user.type(screen.getByLabelText('Title'), 'Nope')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    await openForm(user)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(stored()).toHaveLength(0)
  })

  it('traps focus and restores it to the opener on close', async () => {
    const user = userEvent.setup()
    render(<App />)
    const opener = screen.getByRole('button', { name: 'Add a candy' })
    const dialog = await openForm(user)
    for (let i = 0; i < 15; i++) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
    await user.tab({ shift: true })
    expect(dialog.contains(document.activeElement)).toBe(true)
    await user.keyboard('{Escape}')
    expect(opener).toHaveFocus()
  })

  it('renders inside the BottomSheet on mobile', async () => {
    mockMedia(true)
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add a candy' }))
    const sheet = screen.getByTestId('bottom-sheet')
    expect(within(sheet).getByRole('heading', { name: 'Add a candy' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveFocus()
    expect(screen.queryByTestId('add-task-modal')).toBeNull()
  })
})

describe('dateInputToTimestamp', () => {
  it('uses local end of day and rejects bad input', () => {
    expect(dateInputToTimestamp('2030-01-02')).toBe(new Date(2030, 0, 2, 23, 59, 59, 999).getTime())
    expect(dateInputToTimestamp('')).toBeNull()
    expect(dateInputToTimestamp('nope')).toBeNull()
  })
})
