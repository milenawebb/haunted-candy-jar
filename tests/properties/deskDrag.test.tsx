import { act, fireEvent, render, screen, within } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NUDGE_STEP, NUDGE_STEP_BIG } from '../../src/features/candy/CandyItem';
import { JarPile } from '../../src/features/jar/JarPile';
import {
  SPILL_LEFT_MIN,
  SPILL_RIGHT_MAX,
  SPILL_RIGHT_MAX_COMPACT,
  SPILL_Y_MAX,
  SPILL_Y_MIN,
  clampToDeskBand,
  layoutPile,
  spillPositions,
} from '../../src/features/jar/jarPileLayout';
import { appReducer, initialAppState } from '../../src/features/tasks/taskReducer';
import { TaskStoreProvider, useTaskStore, type AppState } from '../../src/features/tasks/taskStore';
import type { Task } from '../../src/features/tasks/taskTypes';
import { deserializeTaskList, serializeTaskList } from '../../src/utils/exportImport';
import { TASKS_KEY } from '../../src/utils/persistence';
import { TaskSchema } from '../../src/utils/taskSchema';

function makeTask(i: number, extra: Partial<Task> = {}): Task {
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    title: `Task ${i}`,
    dueDate: null,
    monster: 'pumpkin',
    isSample: false,
    createdAt: 1_700_000_000_000 + i,
    completedAt: null,
    ...extra,
  };
}

const tasksOf = (n: number, extra: Record<number, Partial<Task>> = {}) =>
  Array.from({ length: n }, (_, i) => makeTask(i + 1, extra[i + 1]));

describe('clampToDeskBand', () => {
  const pos = fc.record({
    x: fc.double({ min: -5000, max: 5000, noNaN: true }),
    y: fc.double({ min: -5000, max: 5000, noNaN: true }),
  });

  it('always lands inside the desk band. Validates: Requirement 13.3', () => {
    fc.assert(
      fc.property(pos, fc.boolean(), (p, compact) => {
        const c = clampToDeskBand(p, compact);
        expect(c.x).toBeGreaterThanOrEqual(SPILL_LEFT_MIN);
        expect(c.x).toBeLessThanOrEqual(compact ? SPILL_RIGHT_MAX_COMPACT : SPILL_RIGHT_MAX);
        expect(c.y).toBeGreaterThanOrEqual(SPILL_Y_MIN);
        expect(c.y).toBeLessThanOrEqual(SPILL_Y_MAX);
      }),
      { numRuns: 100 },
    );
  });

  it('is idempotent. Validates: Requirement 13.3', () => {
    fc.assert(
      fc.property(pos, fc.boolean(), (p, compact) => {
        const once = clampToDeskBand(p, compact);
        expect(clampToDeskBand(once, compact)).toEqual(once);
      }),
      { numRuns: 100 },
    );
  });

  it('leaves a position that is already on the desk alone', () => {
    expect(clampToDeskBand({ x: 300, y: 560 }, false)).toEqual({ x: 300, y: 560 });
    expect(clampToDeskBand({ x: 450, y: 560 }, true)).toEqual({ x: SPILL_RIGHT_MAX_COMPACT, y: 560 });
  });
});

describe('SET_DESK_POS reducer', () => {
  it('sets deskPos on the task, keeps pendingUndo and other tasks. Validates: Requirement 13.3', () => {
    const [a, b] = tasksOf(2) as [Task, Task];
    const pendingUndo = { kind: 'delete', task: makeTask(9) } as unknown as AppState['pendingUndo'];
    const before: AppState = { ...initialAppState, tasks: [a, b], pendingUndo };
    const after = appReducer(before, { type: 'SET_DESK_POS', taskId: a.id, pos: { x: 100, y: 560 } });
    expect(after.tasks[0]?.deskPos).toEqual({ x: 100, y: 560 });
    expect(after.tasks[1]).toBe(b);
    expect(after.pendingUndo).toBe(pendingUndo);
  });

  it('ignores unknown ids and non-finite positions', () => {
    const [a] = tasksOf(1) as [Task];
    const s: AppState = { ...initialAppState, tasks: [a] };
    expect(appReducer(s, { type: 'SET_DESK_POS', taskId: 'nope', pos: { x: 1, y: 2 } })).toBe(s);
    expect(appReducer(s, { type: 'SET_DESK_POS', taskId: a.id, pos: { x: NaN, y: 2 } })).toBe(s);
  });

  it('IMPORT_TASKS keeps deskPos', () => {
    const t = makeTask(1, { deskPos: { x: 90, y: 550 } });
    const s = appReducer(initialAppState, { type: 'IMPORT_TASKS', tasks: [t] });
    expect(s.tasks[0]?.deskPos).toEqual({ x: 90, y: 550 });
  });
});

describe('TaskSchema deskPos', () => {
  it('accepts tasks with and without deskPos', () => {
    expect(TaskSchema.safeParse(makeTask(1)).success).toBe(true);
    expect(TaskSchema.safeParse(makeTask(1, { deskPos: { x: 1, y: 2 } })).success).toBe(true);
  });

  it('rejects non-finite or malformed deskPos', () => {
    for (const bad of [{ x: Infinity, y: 1 }, { x: 1, y: -Infinity }, { x: 1 }, { x: '1', y: 2 }]) {
      expect(TaskSchema.safeParse({ ...makeTask(1), deskPos: bad }).success).toBe(false);
    }
    expect(TaskSchema.safeParse({ ...makeTask(1), deskPos: { x: NaN, y: 1 } }).success).toBe(false);
  });
});

describe('export and import with deskPos', () => {
  const coord = fc.integer({ min: -100000, max: 100000 }).map((n) => n / 8);
  const taskArb: fc.Arbitrary<Task> = fc.record(
    {
      id: fc.string({ minLength: 1, maxLength: 30 }),
      title: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
      dueDate: fc.option(fc.integer({ min: 0, max: 4_102_444_800_000 }), { nil: null }),
      monster: fc.constantFrom('pumpkin', 'mummy', 'skeleton', 'spider', 'frankenstein', 'vampire', 'bat', 'gravestone'),
      isSample: fc.boolean(),
      createdAt: fc.integer({ min: 0, max: 4_102_444_800_000 }),
      completedAt: fc.option(fc.integer({ min: 0, max: 4_102_444_800_000 }), { nil: null }),
      deskPos: fc.record({ x: coord, y: coord }),
    },
    { requiredKeys: ['id', 'title', 'dueDate', 'monster', 'isSample', 'createdAt', 'completedAt'] },
  );

  it('round-trips with optional deskPos. Validates: Requirement 13.3', () => {
    fc.assert(
      fc.property(fc.array(taskArb, { maxLength: 20 }), (tasks) => {
        expect(deserializeTaskList(serializeTaskList(tasks))).toEqual(tasks);
      }),
      { numRuns: 100 },
    );
  });

  it('loads old JSON that has no deskPos', () => {
    const old = JSON.stringify([makeTask(1)]);
    const [t] = deserializeTaskList(old);
    expect(t?.deskPos).toBeUndefined();
  });
});

describe('layout with deskPos', () => {
  it('uses the saved position for a spilled candy and avoids it for the others', () => {
    const pinned = { x: 300, y: 560 };
    const plain = layoutPile(tasksOf(28));
    const pinnedLayout = layoutPile(tasksOf(28, { 26: { deskPos: pinned } }));
    const entry = pinnedLayout.find((e) => e.task.title === 'Task 26');
    expect(entry?.zone).toBe('desk');
    expect({ x: entry?.x, y: entry?.y }).toEqual(pinned);
    // Determinism, and unpinned desk candies keep clear of the pinned one.
    expect(layoutPile(tasksOf(28, { 26: { deskPos: pinned } }))).toEqual(pinnedLayout);
    for (const e of pinnedLayout.filter((p) => p.zone === 'desk' && p.task.title !== 'Task 26')) {
      expect(Math.hypot(e.x - pinned.x, e.y - pinned.y)).toBeGreaterThan(30);
    }
    expect(plain.filter((e) => e.zone === 'desk')).toHaveLength(4);
  });

  it('clamps a pin that is off the band', () => {
    const [p] = spillPositions(['a'], false, [{ x: 9999, y: 0 }]);
    expect(p).toMatchObject({ x: SPILL_RIGHT_MAX, y: SPILL_Y_MIN });
  });

  it('ignores deskPos for a candy that is in the jar, and keeps it on the task', () => {
    const tasks = tasksOf(5, { 2: { deskPos: { x: 300, y: 560 } } });
    const plain = layoutPile(tasksOf(5));
    expect(layoutPile(tasks)).toEqual(plain.map((e, i) => ({ ...e, task: tasks[i] })));
    expect(tasks[1]?.deskPos).toEqual({ x: 300, y: 560 });
  });
});

let latest: AppState;
function Probe() {
  const { state } = useTaskStore();
  latest = state;
  return null;
}

function setup(tasks: Task[]) {
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  render(
    <TaskStoreProvider>
      <JarPile />
      <Probe />
    </TaskStoreProvider>,
  );
}

const tx = (el: Element) => {
  const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(el.getAttribute('transform') ?? '');
  return { x: Number(m?.[1]), y: Number(m?.[2]) };
};

const deskCandy = (n: number) =>
  within(screen.getByTestId('jar-overflow')).getByRole('button', { name: new RegExp(`Task ${n},`) });

const pos26 = () => latest.tasks.find((x) => x.title === 'Task 26')?.deskPos;

describe('desk candies in JarPile', () => {
  const originalMatchMedia = window.matchMedia;
  beforeEach(() => {
    window.localStorage.clear();
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.useRealTimers();
  });

  it('renders a spilled candy at its saved deskPos, with an unchanged accessible name and a hint', () => {
    setup(tasksOf(26, { 26: { deskPos: { x: 333, y: 560 } } }));
    const el = deskCandy(26);
    expect(tx(el)).toEqual({ x: 333, y: 560 });
    expect(el.getAttribute('aria-label')).toMatch(/^Task 26, \w+$/);
    const hint = document.getElementById(el.getAttribute('aria-describedby') ?? '');
    expect(hint?.textContent).toBe('Arrow keys move it on the desk when selected');
  });

  it('jar candies are not draggable and have no hint', () => {
    setup(tasksOf(26));
    const jarBtn = within(screen.getByTestId('jar-candies')).getAllByRole('button')[0] as Element;
    expect(jarBtn.getAttribute('aria-describedby')).toBeNull();
    expect(jarBtn.getAttribute('class')).not.toContain('candy-item--desk');
  });

  it('a drag past 10 px saves deskPos, and neither completes nor selects', () => {
    setup(tasksOf(26, { 26: { deskPos: { x: 300, y: 560 } } }));
    const el = deskCandy(26);
    fireEvent.pointerDown(el, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 130, clientY: 100 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 160, clientY: 100 });
    // Follows the pointer while dragging (scale is 1 in jsdom).
    expect(tx(el).x).toBeCloseTo(360, 5);
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 160, clientY: 100 });
    fireEvent.click(el);
    expect(pos26()?.x).toBeCloseTo(360, 5);
    expect(pos26()?.y).toBe(560);
    expect(latest.tasks.find((x) => x.title === 'Task 26')?.completedAt).toBeNull();
    expect(latest.selectedTaskId).toBeNull();
  });

  it('a drop past the desk edge is clamped', () => {
    setup(tasksOf(26, { 26: { deskPos: { x: 500, y: 560 } } }));
    const el = deskCandy(26);
    fireEvent.pointerDown(el, { button: 0, pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 400, clientY: -300 });
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 400, clientY: -300 });
    expect(pos26()).toEqual({ x: SPILL_RIGHT_MAX, y: SPILL_Y_MIN });
  });

  it('a movement within 10 px is not a drag', () => {
    setup(tasksOf(26));
    const el = deskCandy(26);
    fireEvent.pointerDown(el, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 105, clientY: 104 });
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 105, clientY: 104 });
    expect(pos26()).toBeUndefined();
  });

  it('a still 800 ms hold on a desk candy still completes', () => {
    vi.useFakeTimers();
    setup(tasksOf(26));
    const el = deskCandy(26);
    fireEvent.pointerDown(el, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    act(() => {
      vi.advanceTimersByTime(850);
    });
    expect(latest.tasks.find((x) => x.title === 'Task 26')?.completedAt).not.toBeNull();
  });

  it('a hold that turns into a drag does not complete', () => {
    vi.useFakeTimers();
    setup(tasksOf(26));
    const el = deskCandy(26);
    fireEvent.pointerDown(el, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 140, clientY: 100 });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(latest.tasks.find((x) => x.title === 'Task 26')?.completedAt).toBeNull();
  });

  it('arrow keys nudge a selected desk candy (Shift for a bigger step), not a jar candy', () => {
    setup(tasksOf(26, { 26: { deskPos: { x: 300, y: 560 } } }));
    const el = deskCandy(26);
    // Not selected yet: the arrow does nothing.
    fireEvent.keyDown(el, { key: 'ArrowRight' });
    expect(pos26()).toEqual({ x: 300, y: 560 });
    fireEvent.click(el);
    expect(latest.selectedTaskId).not.toBeNull();
    fireEvent.keyDown(deskCandy(26), { key: 'ArrowRight' });
    expect(pos26()).toEqual({ x: 300 + NUDGE_STEP, y: 560 });
    fireEvent.keyDown(deskCandy(26), { key: 'ArrowLeft', shiftKey: true });
    expect(pos26()).toEqual({ x: 300 + NUDGE_STEP - NUDGE_STEP_BIG, y: 560 });
    fireEvent.keyDown(deskCandy(26), { key: 'ArrowUp', shiftKey: true });
    expect(pos26()?.y).toBe(SPILL_Y_MIN);

    const jarBtn = within(screen.getByTestId('jar-candies')).getAllByRole('button')[0] as Element;
    fireEvent.click(jarBtn);
    fireEvent.keyDown(jarBtn, { key: 'ArrowRight' });
    expect(latest.tasks.filter((x) => x.deskPos !== undefined)).toHaveLength(1);
  });
});
