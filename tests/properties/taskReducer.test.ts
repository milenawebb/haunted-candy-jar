import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  appReducer,
  initialAppState,
  type AppState,
} from '../../src/features/tasks/taskReducer'
import type { Task } from '../../src/features/tasks/taskTypes'
import { MONSTER_KINDS } from '../../src/utils/monsterKind'

const taskArb = (id: string): fc.Arbitrary<Task> =>
  fc.record({
    id: fc.constant(id),
    title: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
    dueDate: fc.option(fc.integer({ min: 0, max: 4_000_000_000_000 }), { nil: null }),
    monster: fc.constantFrom(...MONSTER_KINDS),
    isSample: fc.boolean(),
    createdAt: fc.integer({ min: 0, max: 4_000_000_000_000 }),
    completedAt: fc.constant(null),
  })

const tasksArb = fc
  .integer({ min: 1, max: 12 })
  .chain((n) =>
    fc.tuple(...Array.from({ length: n }, (_, i) => taskArb(`task-${i}`))),
  )

const mk = (over: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Brew',
  dueDate: null,
  monster: 'bat',
  isSample: false,
  createdAt: 1,
  completedAt: null,
  ...over,
})

describe('appReducer', () => {
  // Feature: haunted-candy-jar, Property 7: Undo restores the prior task state
  it('Property 7: complete or delete then UNDO restores the exact tasks list. Validates: Requirement 5.2', () => {
    fc.assert(
      fc.property(
        tasksArb,
        fc.nat(),
        fc.constantFrom('COMPLETE_TASK', 'DELETE_TASK' as const),
        fc.integer({ min: 0, max: 4_000_000_000_000 }),
        (tasks, pick, kind, now) => {
          const state: AppState = { ...initialAppState, tasks }
          const taskId = tasks[pick % tasks.length]!.id
          const after =
            kind === 'COMPLETE_TASK'
              ? appReducer(state, { type: 'COMPLETE_TASK', taskId, now })
              : appReducer(state, { type: 'DELETE_TASK', taskId })
          expect(after.pendingUndo).not.toBeNull()
          const restored = appReducer(after, { type: 'UNDO' })
          expect(restored.tasks).toEqual(tasks)
          expect(restored.pendingUndo).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('CREATE_TASK with an empty trimmed title is a no-op', () => {
    const next = appReducer(initialAppState, {
      type: 'CREATE_TASK',
      payload: { title: '   ', dueDate: null, monster: null },
    })
    expect(next).toBe(initialAppState)
  })

  it('CREATE_TASK appends a trimmed task', () => {
    const next = appReducer(initialAppState, {
      type: 'CREATE_TASK',
      payload: { title: ' Boo ', dueDate: null, monster: 'bat' },
      now: 5,
    })
    expect(next.tasks).toHaveLength(1)
    expect(next.tasks[0]).toMatchObject({ title: 'Boo', monster: 'bat', createdAt: 5 })
  })

  it('UNDO with null pendingUndo is a no-op', () => {
    expect(appReducer(initialAppState, { type: 'UNDO' })).toBe(initialAppState)
  })

  it('EDIT_TASK ignores an empty title and updates a valid one', () => {
    const state: AppState = { ...initialAppState, tasks: [mk()] }
    const bad = appReducer(state, {
      type: 'EDIT_TASK',
      taskId: 't1',
      payload: { title: ' ', dueDate: null, monster: 'mummy' },
    })
    expect(bad).toBe(state)
    const ok = appReducer(state, {
      type: 'EDIT_TASK',
      taskId: 't1',
      payload: { title: 'New', dueDate: 9, monster: 'mummy' },
    })
    expect(ok.tasks[0]).toMatchObject({ title: 'New', dueDate: 9, monster: 'mummy' })
  })

  it('DELETE_TASK of the focused task clears focusSession', () => {
    const state: AppState = {
      ...initialAppState,
      tasks: [mk()],
      focusSession: { taskId: 't1', durationSeconds: 60, startedAt: 0 },
    }
    const next = appReducer(state, { type: 'DELETE_TASK', taskId: 't1' })
    expect(next.focusSession).toBeNull()
    expect(next.tasks).toHaveLength(0)
    expect(next.pendingUndo?.action).toBe('delete')
  })

  it('COMPLETE_TASK sets completedAt and UNDO_EXPIRED commits it', () => {
    const state: AppState = { ...initialAppState, tasks: [mk()] }
    const done = appReducer(state, { type: 'COMPLETE_TASK', taskId: 't1', now: 77 })
    expect(done.tasks[0]?.completedAt).toBe(77)
    const committed = appReducer(done, { type: 'UNDO_EXPIRED' })
    expect(committed.tasks).toHaveLength(0)
    expect(committed.pendingUndo).toBeNull()
  })

  it('a second complete commits the first pending action', () => {
    const state: AppState = {
      ...initialAppState,
      tasks: [mk(), mk({ id: 't2' })],
    }
    const a = appReducer(state, { type: 'COMPLETE_TASK', taskId: 't1', now: 1 })
    const b = appReducer(a, { type: 'COMPLETE_TASK', taskId: 't2', now: 2 })
    expect(b.tasks.map((t) => t.id)).toEqual(['t2'])
    expect(b.pendingUndo?.task.id).toBe('t2')
  })

  it('START_FOCUS, END_FOCUS, settings, import and CLEAR_SAMPLES behave', () => {
    let s: AppState = {
      ...initialAppState,
      tasks: [mk(), mk({ id: 's1', isSample: true })],
    }
    s = appReducer(s, { type: 'START_FOCUS', taskId: 't1', durationMinutes: 25, now: 3 })
    expect(s.focusSession).toEqual({ taskId: 't1', durationSeconds: 1500, startedAt: 3 })
    s = appReducer(s, { type: 'END_FOCUS', markComplete: true, now: 4 })
    expect(s.focusSession).toBeNull()
    expect(s.tasks.find((t) => t.id === 't1')?.completedAt).toBe(4)
    s = appReducer(s, { type: 'SET_SOUND', enabled: true })
    s = appReducer(s, { type: 'SET_HAUNT_SPEED', speed: 60 })
    expect(s.soundEnabled).toBe(true)
    expect(s.hauntSpeed).toBe(60)
    s = appReducer(s, { type: 'SELECT_TASK', taskId: 's1' })
    expect(s.selectedTaskId).toBe('s1')
    s = appReducer(s, { type: 'CLEAR_SAMPLES' })
    expect(s.tasks.some((t) => t.isSample)).toBe(false)
    expect(s.selectedTaskId).toBeNull()
    s = appReducer(s, { type: 'IMPORT_TASKS', tasks: [mk({ id: 'x' })] })
    expect(s.tasks.map((t) => t.id)).toEqual(['x'])
  })
})
