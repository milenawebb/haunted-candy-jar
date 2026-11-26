import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JarPile } from '../../src/features/jar/JarPile';
import { JAR_CAPACITY } from '../../src/features/jar/jarGeometry';
import { TaskStoreProvider, useTaskStore } from '../../src/features/tasks/taskStore';
import type { Task } from '../../src/features/tasks/taskTypes';
import {
  AnnounceProvider,
  CANDY_BACK_IN_JAR_MESSAGE,
  CANDY_ESCAPED_MESSAGE,
} from '../../src/features/undo/announce';
import { UndoToast } from '../../src/features/undo/UndoToast';
import { TASKS_KEY } from '../../src/utils/persistence';

/**
 * JarPile: a candy that turns Cursed leaves the jar and hops onto the desk.
 * Validates: Requirement 7.9 (Cursed look) and Requirement 13.2 (jar capacity and overflow).
 * The requirements have no 7.10, so these are tagged with the closest existing ones.
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

/** A due-date candy that is Cursed once more than 24 h past due, so it crosses over `minutes` from now. */
function crossesIn(minutes: number, extra: Partial<Task> = {}): Task {
  return makeTask(99, {
    title: ESCAPEE,
    dueDate: Date.now() - 24 * HOUR + minutes * 60_000,
    createdAt: Date.now() - 2 * DAY,
    ...extra,
  });
}

function Controls({ task }: { task: Task }) {
  const { dispatch } = useTaskStore();
  return (
    <button
      type="button"
      onClick={() =>
        dispatch({
          type: 'EDIT_TASK',
          taskId: task.id,
          payload: { title: task.title, dueDate: Date.now() + 10 * DAY, monster: task.monster },
        })
      }
    >
      later
    </button>
  );
}

function setup(tasks: Task[], escapee: Task) {
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  return render(
    <TaskStoreProvider>
      <AnnounceProvider>
        <JarPile />
        <Controls task={escapee} />
        <UndoToast />
      </AnnounceProvider>
    </TaskStoreProvider>,
  );
}

function mockReducedMotion(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/** The wrapper group of the candy with this title. */
function wrapper(title: string): Element {
  const el = screen
    .getAllByTestId('jar-pile-candy')
    .find((g) => g.querySelector(`[aria-label^="${title},"]`));
  if (!el) throw new Error(`no candy named ${title}`);
  return el;
}
const cls = (el: Element) => el.getAttribute('class') ?? '';
const announced = () => screen.getByTestId('announce').textContent;
const lidOpen = () => screen.getByTestId('lid-animation').getAttribute('data-lid-open');
const tick = (ms: number) => {
  for (let t = 0; t < ms; t += 50) act(() => void vi.advanceTimersByTime(Math.min(50, ms - t)));
};

describe('Cursed escape in JarPile', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    mockReducedMotion(false);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('places a Cursed candy on the desk on first render, silently', () => {
    const escapee = crossesIn(-60); // already Cursed
    setup([makeTask(1), makeTask(2), escapee], escapee);
    tick(2000);
    const el = wrapper(ESCAPEE);
    expect(el.getAttribute('data-zone')).toBe('desk');
    expect(el.getAttribute('data-escaped')).toBe('true');
    expect(cls(el)).not.toMatch(/--(hop|fade|drop)/);
    expect(lidOpen()).toBe('false');
    expect(announced()).toBe('');
  });

  it('Validates: Requirements 7.9, 13.2 (a jar candy that turns Cursed opens the lid, hops out and is announced)', () => {
    const escapee = crossesIn(5);
    setup([makeTask(1), makeTask(2), escapee], escapee);
    expect(wrapper(ESCAPEE).getAttribute('data-zone')).toBe('jar');
    // The haunt clock ticks once a minute at 1x. The tick at 6 minutes is past the threshold.
    tick(5 * 60_000);
    expect(wrapper(ESCAPEE).getAttribute('data-zone')).toBe('jar');
    expect(announced()).toBe('');
    tick(60_000);
    // On the desk now, hidden while the lid lifts.
    const waiting = wrapper(ESCAPEE);
    expect(waiting.getAttribute('data-zone')).toBe('desk');
    expect(waiting.getAttribute('data-escaped')).toBe('true');
    expect(lidOpen()).toBe('true');
    expect((waiting as HTMLElement).style.visibility).toBe('hidden');
    expect(cls(waiting)).not.toContain('--hop');
    expect(announced()).toBe(CANDY_ESCAPED_MESSAGE);
    // Once the lid is open the hop starts, from the old jar slot (offsets are set).
    tick(350);
    const hopping = wrapper(ESCAPEE) as HTMLElement;
    expect(cls(hopping)).toContain('jar-pile__candy--hop');
    expect(hopping.style.visibility).not.toBe('hidden');
    for (const v of ['--hop-sx', '--hop-sy', '--hop-mx', '--hop-my']) {
      expect(hopping.style.getPropertyValue(v)).toMatch(/px$/);
    }
    // The lid closes after the hop.
    tick(1500);
    expect(lidOpen()).toBe('false');
  });

  it('Validates: Requirements 7.9, 13.2 (reduced motion: no hop, the lid stays shut, a short fade, still announced)', () => {
    mockReducedMotion(true);
    const escapee = crossesIn(5);
    setup([makeTask(1), makeTask(2), escapee], escapee);
    tick(6 * 60_000);
    const el = wrapper(ESCAPEE) as HTMLElement;
    expect(el.getAttribute('data-zone')).toBe('desk');
    expect(cls(el)).toContain('jar-pile__candy--fade');
    expect(cls(el)).not.toContain('--hop');
    expect(el.style.getPropertyValue('--hop-sx')).toBe('');
    expect(el.style.visibility).not.toBe('hidden');
    expect(lidOpen()).toBe('false');
    expect(screen.getByTestId('lid-animation').getAttribute('style')).toBeNull();
    expect(announced()).toBe(CANDY_ESCAPED_MESSAGE);
  });

  it('Validates: Requirements 7.9, 13.2 (a cursed candy goes back into the jar when its due date moves later)', () => {
    const escapee = crossesIn(-60);
    setup([makeTask(1), makeTask(2), escapee], escapee);
    expect(wrapper(ESCAPEE).getAttribute('data-zone')).toBe('desk');
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'later' }));
    });
    const el = wrapper(ESCAPEE) as HTMLElement;
    expect(el.getAttribute('data-zone')).toBe('jar');
    expect(el.getAttribute('data-escaped')).toBe('false');
    expect(lidOpen()).toBe('true');
    expect(el.style.visibility).toBe('hidden');
    expect(announced()).toBe(CANDY_BACK_IN_JAR_MESSAGE);
    tick(350);
    expect(cls(wrapper(ESCAPEE))).toContain('jar-pile__candy--drop');
  });

  it('keeps a returning candy on the desk as overflow when the jar is full', () => {
    // The escapee is the newest candy, so with 40 others it is the one past capacity.
    const escapee = crossesIn(-60, { createdAt: Date.now() });
    const others = Array.from({ length: JAR_CAPACITY }, (_, i) => makeTask(i + 1));
    setup([...others, escapee], escapee);
    expect(wrapper(ESCAPEE).getAttribute('data-escaped')).toBe('true');
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'later' }));
    });
    const el = wrapper(ESCAPEE);
    expect(el.getAttribute('data-zone')).toBe('desk');
    expect(el.getAttribute('data-escaped')).toBe('false');
    tick(1000);
    expect(lidOpen()).toBe('false');
    expect(announced()).toBe('');
    // The jar still holds exactly its capacity.
    expect(
      screen.getAllByTestId('jar-pile-candy').filter((g) => g.getAttribute('data-zone') === 'jar'),
    ).toHaveLength(JAR_CAPACITY);
  });

  it('Cursed candies do not count toward the jar capacity', () => {
    const cursed = Array.from({ length: 5 }, (_, i) => crossesIn(-60, { id: `cursed-${i}`, title: `Cursed ${i}` }));
    const others = Array.from({ length: JAR_CAPACITY }, (_, i) => makeTask(i + 1));
    setup([...others, ...cursed], cursed[0]!);
    const all = screen.getAllByTestId('jar-pile-candy');
    expect(all.filter((g) => g.getAttribute('data-zone') === 'jar')).toHaveLength(JAR_CAPACITY);
    expect(all.filter((g) => g.getAttribute('data-escaped') === 'true')).toHaveLength(5);
    expect(all.filter((g) => g.getAttribute('data-zone') === 'desk')).toHaveLength(5);
  });
});
