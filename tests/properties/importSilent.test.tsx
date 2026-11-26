import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JarPile } from '../../src/features/jar/JarPile';
import { appReducer, initialAppState } from '../../src/features/tasks/taskReducer';
import { TaskStoreProvider, useTaskStore } from '../../src/features/tasks/taskStore';
import type { Task } from '../../src/features/tasks/taskTypes';
import { AnnounceProvider, CANDY_ESCAPED_MESSAGE } from '../../src/features/undo/announce';
import { UndoToast } from '../../src/features/undo/UndoToast';
import { TASKS_KEY } from '../../src/utils/persistence';

/**
 * Imports are silent: IMPORT_TASKS bumps importGeneration, and the jar treats
 * the new list as a fresh baseline (no lid, escape, return or announcement).
 * Normal edits still animate.
 * Validates: Requirement 13.2 (jar capacity and overflow), Requirement 7.9 (Cursed look).
 */
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ESCAPEE = 'Escapee';

function makeTask(i: number, extra: Partial<Task> = {}): Task {
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    title: `Task ${i}`,
    dueDate: null,
    monster: 'pumpkin',
    isSample: false,
    createdAt: Date.now() - 60_000 + i,
    completedAt: null,
    ...extra,
  };
}

/** Same id every time, so an import can change only its due date. */
function escapee(dueDate: number): Task {
  return makeTask(99, { title: ESCAPEE, dueDate, createdAt: Date.now() - 2 * DAY });
}

const cursedDue = () => Date.now() - 2 * DAY;
const freshDue = () => Date.now() + 10 * DAY;

function Controls({ importTasks, edited }: { importTasks: Task[]; edited: Task }) {
  const { dispatch } = useTaskStore();
  return (
    <>
      <button type="button" onClick={() => dispatch({ type: 'IMPORT_TASKS', tasks: importTasks })}>
        import
      </button>
      <button
        type="button"
        onClick={() =>
          dispatch({
            type: 'EDIT_TASK',
            taskId: edited.id,
            payload: { title: edited.title, dueDate: cursedDue(), monster: edited.monster },
          })
        }
      >
        edit
      </button>
    </>
  );
}

function setup(initial: Task[], importTasks: Task[]) {
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(initial));
  const edited = initial.find((t) => t.title === ESCAPEE)!;
  return render(
    <TaskStoreProvider>
      <AnnounceProvider>
        <JarPile />
        <Controls importTasks={importTasks} edited={edited} />
        <UndoToast />
      </AnnounceProvider>
    </TaskStoreProvider>,
  );
}

function wrapper(title: string): HTMLElement {
  const el = screen
    .getAllByTestId('jar-pile-candy')
    .find((g) => g.querySelector(`[aria-label^="${title},"]`));
  if (!el) throw new Error(`no candy named ${title}`);
  return el as HTMLElement;
}

const cls = (el: Element) => el.getAttribute('class') ?? '';
const announced = () => screen.getByTestId('announce').textContent;
const lidOpen = () => screen.getByTestId('lid-animation').getAttribute('data-lid-open');
const tick = (ms: number) => {
  for (let t = 0; t < ms; t += 50) act(() => void vi.advanceTimersByTime(Math.min(50, ms - t)));
};
const click = (name: string) => act(() => void fireEvent.click(screen.getByRole('button', { name })));

describe('imports never animate', () => {
  const originalMatchMedia = window.matchMedia;
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('IMPORT_TASKS bumps importGeneration and nothing else does', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom('SELECT', 'SOUND', 'UNDO_EXPIRED', 'CLEAR_SAMPLES')), (kinds) => {
        let s = initialAppState;
        for (const k of kinds) {
          if (k === 'SELECT') s = appReducer(s, { type: 'SELECT_TASK', taskId: null });
          else if (k === 'SOUND') s = appReducer(s, { type: 'SET_SOUND', enabled: true });
          else if (k === 'UNDO_EXPIRED') s = appReducer(s, { type: 'UNDO_EXPIRED' });
          else s = appReducer(s, { type: 'CLEAR_SAMPLES' });
        }
        expect(s.importGeneration).toBe(0);
        expect(appReducer(s, { type: 'IMPORT_TASKS', tasks: [] }).importGeneration).toBe(1);
      }),
      { numRuns: 100 },
    );
  });

  it('a jar candy that an import makes Cursed goes to the desk silently', () => {
    setup([makeTask(1), makeTask(2), escapee(freshDue())], [makeTask(1), makeTask(2), escapee(cursedDue())]);
    expect(wrapper(ESCAPEE).getAttribute('data-zone')).toBe('jar');
    click('import');
    const el = wrapper(ESCAPEE);
    expect(el.getAttribute('data-zone')).toBe('desk');
    expect(el.getAttribute('data-escaped')).toBe('true');
    expect(cls(el)).not.toMatch(/--(hop|fade|drop)/);
    expect(el.style.visibility).not.toBe('hidden');
    expect(lidOpen()).toBe('false');
    expect(announced()).toBe('');
    tick(3000);
    expect(lidOpen()).toBe('false');
    expect(announced()).toBe('');
    expect(cls(wrapper(ESCAPEE))).not.toMatch(/--(hop|fade|drop)/);
    expect(wrapper(ESCAPEE).querySelector('.jar-pile__glow')).toBeNull();
  });

  it('importing a non-cursed version of an escaped candy returns it silently', () => {
    setup([makeTask(1), makeTask(2), escapee(cursedDue())], [makeTask(1), makeTask(2), escapee(freshDue())]);
    expect(wrapper(ESCAPEE).getAttribute('data-zone')).toBe('desk');
    click('import');
    const el = wrapper(ESCAPEE);
    expect(el.getAttribute('data-zone')).toBe('jar');
    expect(el.getAttribute('data-escaped')).toBe('false');
    expect(cls(el)).not.toMatch(/--(hop|fade|drop)/);
    expect(el.style.visibility).not.toBe('hidden');
    expect(lidOpen()).toBe('false');
    expect(announced()).toBe('');
    tick(3000);
    expect(lidOpen()).toBe('false');
    expect(announced()).toBe('');
  });

  it('a normal edit that makes a candy Cursed still opens the lid and hops', () => {
    setup([makeTask(1), makeTask(2), escapee(freshDue())], []);
    click('edit');
    const el = wrapper(ESCAPEE);
    expect(el.getAttribute('data-zone')).toBe('desk');
    expect(lidOpen()).toBe('true');
    expect(announced()).toBe(CANDY_ESCAPED_MESSAGE);
    expect(el.style.visibility).toBe('hidden');
    tick(350);
    expect(cls(wrapper(ESCAPEE))).toContain('jar-pile__candy--hop');
  });

  it('a normal change after an import animates again', () => {
    setup([makeTask(1), makeTask(2), escapee(freshDue())], [makeTask(1), makeTask(2), escapee(freshDue())]);
    click('import');
    tick(1000);
    expect(lidOpen()).toBe('false');
    click('edit');
    expect(lidOpen()).toBe('true');
    expect(announced()).toBe(CANDY_ESCAPED_MESSAGE);
  });
});
