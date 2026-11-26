import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import type { Task } from '../../src/features/tasks/taskTypes'
import { TASKS_KEY } from '../../src/utils/persistence'

/**
 * End-to-end interaction checks on the whole <App /> (real store, jar, menu,
 * toast and add form). Timers are faked so holds and the undo window are exact.
 *
 * Validates: Requirements 3.1, 4.1, 4.3, 5.1, 5.2
 */

const NOW = 1_700_000_000_000
const HOUR = 3_600_000

function makeTask(id: string, title: string): Task {
  return {
    id,
    title,
    dueDate: null,
    monster: 'pumpkin',
    isSample: false,
    createdAt: NOW - HOUR,
    completedAt: null,
  }
}

function seed(...tasks: Task[]) {
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

function stored(): Task[] {
  const raw = window.localStorage.getItem(TASKS_KEY)
  return raw ? (JSON.parse(raw) as Task[]) : []
}

function candy(title: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${title},`) })
}

function candies(): HTMLElement[] {
  return screen.queryAllByTestId('candy-item')
}

/** Advances fake time in 100 ms steps so effect-driven timer chains (the lid) can re-arm. */
function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) {
    act(() => {
      vi.advanceTimersByTime(Math.min(100, ms - t))
    })
  }
}

function hold(el: HTMLElement, ms: number) {
  fireEvent.pointerDown(el, { button: 0, pointerId: 1 })
  advance(ms)
  fireEvent.pointerUp(el, { pointerId: 1 })
  // A real browser fires a click after a press; it must not toggle selection.
  fireEvent.click(el)
}

describe('App interactions', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('hcj_seen_intro', 'true')
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('tapping a candy opens the context menu with its title', () => {
    seed(makeTask('a', 'Write report'))
    render(<App />)
    expect(screen.queryByTestId('context-menu')).toBeNull()
    fireEvent.click(candy('Write report'))
    const menu = screen.getByTestId('context-menu')
    expect(within(menu).getByRole('heading', { name: 'Write report' })).toBeInTheDocument()
    for (const name of ['Complete', 'Focus', 'Edit', 'Delete']) {
      expect(within(menu).getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('tapping the selected candy again closes the menu', () => {
    seed(makeTask('a', 'Write report'))
    render(<App />)
    fireEvent.click(candy('Write report'))
    fireEvent.click(candy('Write report'))
    expect(screen.queryByTestId('context-menu')).toBeNull()
  })

  it('holding a candy for more than 800 ms completes it and shows the undo toast', () => {
    seed(makeTask('a', 'Write report'))
    render(<App />)
    expect(screen.queryByTestId('undo-toast')).toBeNull()
    hold(candy('Write report'), 900)
    expect(screen.getByTestId('undo-toast')).toHaveTextContent('Done! A ghost cheers you on 👻')
    expect(screen.getByTestId('ghost-cheer')).toBeInTheDocument()
    expect(stored()[0]!.completedAt).not.toBeNull()
    // The hold's own click must not have selected the candy or opened the menu.
    expect(screen.queryByTestId('context-menu')).toBeNull()
  })

  it('releasing before 800 ms completes nothing and opens no menu', () => {
    seed(makeTask('a', 'Write report'))
    render(<App />)
    hold(candy('Write report'), 500)
    advance(2000)
    expect(screen.queryByTestId('undo-toast')).toBeNull()
    expect(screen.queryByTestId('context-menu')).toBeNull()
    expect(stored()[0]!.completedAt).toBeNull()
  })

  it('a quick tap (press and release at once) selects but does not complete', () => {
    seed(makeTask('a', 'Write report'))
    render(<App />)
    const el = candy('Write report')
    fireEvent.pointerDown(el, { button: 0, pointerId: 1 })
    fireEvent.pointerUp(el, { pointerId: 1 })
    fireEvent.click(el)
    advance(2000)
    expect(screen.getByTestId('context-menu')).toBeInTheDocument()
    expect(screen.queryByTestId('undo-toast')).toBeNull()
  })

  it('holding an already selected candy completes it and does not deselect first', () => {
    seed(makeTask('a', 'Write report'))
    render(<App />)
    fireEvent.click(candy('Write report'))
    expect(screen.getByTestId('context-menu')).toBeInTheDocument()
    // The selected candy has remounted in the overflow layer; query it afresh.
    hold(candy('Write report'), 900)
    expect(screen.getByTestId('undo-toast')).toHaveTextContent('Done!')
    expect(screen.queryByTestId('context-menu')).toBeNull()
    expect(stored()[0]!.completedAt).not.toBeNull()
  })

  it('a short press on a selected candy only deselects it', () => {
    seed(makeTask('a', 'Write report'))
    render(<App />)
    fireEvent.click(candy('Write report'))
    hold(candy('Write report'), 300)
    expect(screen.queryByTestId('undo-toast')).toBeNull()
    // A 300 ms press counts as a hold attempt, so its click is ignored and the menu stays.
    expect(screen.getByTestId('context-menu')).toBeInTheDocument()
  })

  it('Delete from the menu removes the candy and shows the undo toast; Undo brings it back', () => {
    seed(makeTask('a', 'Write report'), makeTask('b', 'Feed the cat'))
    render(<App />)
    fireEvent.click(candy('Write report'))
    fireEvent.click(within(screen.getByTestId('context-menu')).getByRole('button', { name: 'Delete' }))
    expect(screen.getByTestId('undo-toast')).toHaveTextContent('Candy tossed')
    expect(screen.queryByTestId('context-menu')).toBeNull()
    expect(candies()).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /^Write report,/ })).toBeNull()

    fireEvent.click(within(screen.getByTestId('undo-toast')).getByRole('button', { name: 'Undo' }))
    expect(screen.queryByTestId('undo-toast')).toBeNull()
    advance(5000) // lid opens and the restored candy drops back in
    expect(candies()).toHaveLength(2)
    expect(candy('Write report')).toBeInTheDocument()
    expect(stored().map((t) => t.id).sort()).toEqual(['a', 'b'])
  })

  it('Undo after a hold completion restores the candy as unfinished', () => {
    seed(makeTask('a', 'Write report'))
    render(<App />)
    hold(candy('Write report'), 900)
    advance(2500) // ghost finishes and the candy leaves the jar
    expect(candies()).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(candy('Write report')).toBeInTheDocument()
    expect(stored()[0]!.completedAt).toBeNull()
  })

  it('the Complete button in the menu completes the task, shows the toast and clears the candy', () => {
    seed(makeTask('a', 'Write report'))
    render(<App />)
    fireEvent.click(candy('Write report'))
    fireEvent.click(within(screen.getByTestId('context-menu')).getByRole('button', { name: 'Complete' }))
    expect(screen.getByTestId('undo-toast')).toHaveTextContent('Done!')
    expect(screen.queryByTestId('context-menu')).toBeNull()
    expect(screen.getByTestId('ghost-cheer')).toBeInTheDocument()
    advance(2500)
    expect(candies()).toHaveLength(0)
  })

  it('the undo toast expires after 6 seconds and the completed task is committed', () => {
    seed(makeTask('a', 'Write report'))
    render(<App />)
    hold(candy('Write report'), 900)
    advance(6000)
    expect(screen.queryByTestId('undo-toast')).toBeNull()
    expect(stored()).toHaveLength(0)
  })

  it('add flow: Add a candy, type a title, submit, and a candy appears in the jar', () => {
    render(<App />)
    expect(candies()).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Add a candy' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a candy' })
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Brew a potion' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
    expect(screen.queryByRole('dialog', { name: 'Add a candy' })).toBeNull()
    advance(3000) // lid opens and the new candy drops in
    expect(candies()).toHaveLength(1)
    expect(candy('Brew a potion')).toBeInTheDocument()
    expect(stored()[0]!.title).toBe('Brew a potion')
  })
})
