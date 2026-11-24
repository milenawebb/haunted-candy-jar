import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskStoreProvider, useTaskStore } from '../../src/features/tasks/taskStore'
import type { Task } from '../../src/features/tasks/taskTypes'
import { UNDO_DURATION_MS, UndoToast } from '../../src/features/undo/UndoToast'
import { MONSTER_KINDS } from '../../src/utils/monsterKind'
import { TASKS_KEY } from '../../src/utils/persistence'

function makeTask(i: number): Task {
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    title: `Task ${i}`,
    dueDate: null,
    monster: 'pumpkin',
    isSample: false,
    createdAt: 1000 + i,
    completedAt: null,
  }
}

/** Exposes the store so tests can dispatch and read the task list. */
function Probe() {
  const { state, dispatch } = useTaskStore()
  return (
    <div>
      <button onClick={() => dispatch({ type: 'COMPLETE_TASK', taskId: makeTask(1).id })}>
        probe-complete-1
      </button>
      <button onClick={() => dispatch({ type: 'DELETE_TASK', taskId: makeTask(1).id })}>
        probe-delete-1
      </button>
      <button onClick={() => dispatch({ type: 'DELETE_TASK', taskId: makeTask(2).id })}>
        probe-delete-2
      </button>
      <button onClick={() => dispatch({ type: 'IMPORT_TASKS', tasks: [makeTask(1)] })}>
        probe-import
      </button>
      <div data-testid="tasks">{JSON.stringify(state.tasks)}</div>
    </div>
  )
}

function renderApp() {
  return render(
    <TaskStoreProvider>
      <Probe />
      <UndoToast />
    </TaskStoreProvider>,
  )
}

const listed = (): Task[] => JSON.parse(screen.getByTestId('tasks').textContent ?? '[]')
const stored = (): unknown => JSON.parse(window.localStorage.getItem(TASKS_KEY) ?? 'null')
const click = (name: string) => fireEvent.click(screen.getByText(name))
const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

describe('UndoToast', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(TASKS_KEY, JSON.stringify([makeTask(1), makeTask(2)]))
    vi.useFakeTimers()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('keeps an empty polite live region mounted with no toast', () => {
    renderApp()
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toBeEmptyDOMElement()
  })

  it('shows the completing text after Complete', () => {
    renderApp()
    click('probe-complete-1')
    expect(screen.getByRole('status')).toHaveTextContent('Task completed (a ghost cheers)')
  })

  it('shows the deleting text after Delete', () => {
    renderApp()
    click('probe-delete-1')
    expect(screen.getByRole('status')).toHaveTextContent('Candy tossed')
    expect(UNDO_DURATION_MS).toBe(6000)
  })

  it('auto-expires at 6000 ms and commits a completion', () => {
    renderApp()
    click('probe-complete-1')
    expect(listed().map((t) => t.id)).toContain(makeTask(1).id)
    tick(UNDO_DURATION_MS - 1)
    expect(screen.getByTestId('undo-toast')).toBeInTheDocument()
    expect(listed().map((t) => t.id)).toContain(makeTask(1).id)
    tick(1)
    expect(screen.queryByTestId('undo-toast')).toBeNull()
    expect(listed().map((t) => t.id)).toEqual([makeTask(2).id])
    expect((stored() as Task[]).map((t) => t.id)).toEqual([makeTask(2).id])
  })

  it('Undo restores the exact prior list, saves it, and never expires later', () => {
    renderApp()
    const before = listed()
    click('probe-delete-1')
    expect(listed()).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(listed()).toEqual(before)
    expect(stored()).toEqual(before)
    expect(screen.queryByTestId('undo-toast')).toBeNull()
    tick(UNDO_DURATION_MS * 2)
    expect(listed()).toEqual(before)
  })

  it('a second action commits the first at once and restarts the timer', () => {
    renderApp()
    click('probe-complete-1')
    tick(4000)
    click('probe-delete-2')
    // First action committed immediately: task 1 is gone, task 2 is pending.
    expect(listed()).toEqual([])
    expect(screen.getAllByTestId('undo-toast')).toHaveLength(1)
    tick(5999)
    expect(screen.getByTestId('undo-toast')).toBeInTheDocument()
    tick(1)
    expect(screen.queryByTestId('undo-toast')).toBeNull()
    // Undo after expiry has nothing to restore.
    expect(listed()).toEqual([])
  })

  it('dismiss commits the action', () => {
    renderApp()
    click('probe-complete-1')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByTestId('undo-toast')).toBeNull()
    expect(listed().map((t) => t.id)).toEqual([makeTask(2).id])
  })

  it('clears its timer on unmount', () => {
    const setSpy = vi.spyOn(window, 'setTimeout')
    const clearSpy = vi.spyOn(window, 'clearTimeout')
    const { unmount } = renderApp()
    click('probe-complete-1')
    const call = setSpy.mock.calls.findIndex(([, ms]) => ms === UNDO_DURATION_MS)
    expect(call).toBeGreaterThanOrEqual(0)
    const timerId = setSpy.mock.results[call]?.value
    expect(clearSpy).not.toHaveBeenCalledWith(timerId)
    unmount()
    expect(clearSpy).toHaveBeenCalledWith(timerId)
    setSpy.mockRestore()
    clearSpy.mockRestore()
  })

  it('Validates: Requirement 5.2 undo leaves the list and storage unchanged', () => {
    const taskArb = fc.record({
      id: fc.uuid(),
      title: fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,20}$/),
      dueDate: fc.option(fc.integer({ min: 0, max: 4_000_000_000_000 }), { nil: null }),
      monster: fc.constantFrom(...MONSTER_KINDS),
      isSample: fc.boolean(),
      createdAt: fc.integer({ min: 0, max: 4_000_000_000_000 }),
      completedAt: fc.constant(null),
    })
    fc.assert(
      fc.property(
        fc.uniqueArray(taskArb, { minLength: 1, maxLength: 10, selector: (t) => t.id }),
        fc.nat(),
        fc.constantFrom('COMPLETE_TASK', 'DELETE_TASK' as const),
        (tasks, pick, type) => {
          function Driver() {
            const { state, dispatch } = useTaskStore()
            return (
              <div>
                <button onClick={() => dispatch({ type: 'IMPORT_TASKS', tasks })}>load</button>
                <button
                  onClick={() =>
                    dispatch({
                      type: type as 'COMPLETE_TASK' | 'DELETE_TASK',
                      taskId: tasks[pick % tasks.length]!.id,
                    })
                  }
                >
                  act
                </button>
                <div data-testid="tasks">{JSON.stringify(state.tasks)}</div>
              </div>
            )
          }
          window.localStorage.clear()
          const view = render(
            <TaskStoreProvider>
              <Driver />
              <UndoToast />
            </TaskStoreProvider>,
          )
          fireEvent.click(screen.getByText('load'))
          fireEvent.click(screen.getByText('act'))
          fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
          const ok =
            JSON.stringify(listed()) === JSON.stringify(tasks) &&
            window.localStorage.getItem(TASKS_KEY) === JSON.stringify(tasks)
          view.unmount()
          return ok
        },
      ),
      { numRuns: 100 },
    )
  })
})
