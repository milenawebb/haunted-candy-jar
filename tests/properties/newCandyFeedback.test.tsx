import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JAR_CAPACITY } from '../../src/features/jar/jarGeometry';
import { JarPile, NEW_CANDY_GLOW_MS } from '../../src/features/jar/JarPile';
import { TaskStoreProvider, useTaskStore } from '../../src/features/tasks/taskStore';
import type { Task } from '../../src/features/tasks/taskTypes';
import {
  ADDED_TO_DESK_MESSAGE,
  ADDED_TO_JAR_MESSAGE,
  ANNOUNCE_CLEAR_MS,
  AnnounceProvider,
} from '../../src/features/undo/announce';
import { UndoToast } from '../../src/features/undo/UndoToast';
import { TASKS_KEY } from '../../src/utils/persistence';

/**
 * New candy feedback: glow and screen reader announcement.
 * Validates: Requirement 13.1 (new candy feedback, polish)
 */

/** Recent, so the age path keeps every fixture Fresh (Cursed candies leave the jar). */
const BASE_TIME = Date.now() - 60_000;

function makeTask(i: number): Task {
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    title: `Task ${i}`,
    dueDate: null,
    monster: 'pumpkin',
    isSample: false,
    createdAt: BASE_TIME + i,
    completedAt: null,
  };
}

function seed(n: number) {
  window.localStorage.setItem(
    TASKS_KEY,
    JSON.stringify(Array.from({ length: n }, (_, i) => makeTask(i + 1))),
  );
}

function cls(el: Element | undefined): string {
  return el?.getAttribute('class') ?? '';
}

function Controls() {
  const { dispatch } = useTaskStore();
  return (
    <>
      <button
        type="button"
        onClick={() =>
          dispatch({ type: 'CREATE_TASK', payload: { title: 'Brand new', dueDate: null, monster: null } })
        }
      >
        add
      </button>
      <button type="button" onClick={() => dispatch({ type: 'COMPLETE_TASK', taskId: makeTask(1).id })}>
        complete-1
      </button>
    </>
  );
}

function setup() {
  return render(
    <TaskStoreProvider>
      <AnnounceProvider>
        <JarPile />
        <Controls />
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

const glowEls = () =>
  screen.queryAllByTestId('jar-pile-glow').filter((el) => /jar-pile__glow/.test(cls(el)));

/** Advance in small steps until a glow shows (the lid may hold the candy first). */
function waitForGlow() {
  for (let i = 0; i < 40 && glowEls().length === 0; i++) {
    act(() => {
      vi.advanceTimersByTime(50);
    });
  }
}

describe('new candy feedback', () => {
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

  it('does not glow or announce on first render', () => {
    seed(3);
    setup();
    expect(glowEls()).toHaveLength(0);
    expect(screen.getByTestId('announce').textContent).toBe('');
  });

  it('glows a new candy for about 2 s, then removes the class', () => {
    seed(3);
    setup();
    fireEvent.click(screen.getByText('add'));
    waitForGlow();
    const els = glowEls();
    expect(els).toHaveLength(1);
    expect(cls(els[0])).toContain('jar-pile__glow');
    expect(cls(els[0])).not.toContain('jar-pile__glow-static');
    act(() => {
      vi.advanceTimersByTime(NEW_CANDY_GLOW_MS - 100);
    });
    expect(glowEls()).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(glowEls()).toHaveLength(0);
  });

  it('uses the static glow under reduced motion', () => {
    mockReducedMotion(true);
    seed(3);
    setup();
    fireEvent.click(screen.getByText('add'));
    waitForGlow();
    const els = glowEls();
    expect(els).toHaveLength(1);
    expect(cls(els[0])).toContain('jar-pile__glow-static');
    act(() => {
      vi.advanceTimersByTime(NEW_CANDY_GLOW_MS + 100);
    });
    expect(glowEls()).toHaveLength(0);
  });

  it('announces a jar add', () => {
    seed(2);
    setup();
    fireEvent.click(screen.getByText('add'));
    expect(screen.getByTestId('announce').textContent).toBe(ADDED_TO_JAR_MESSAGE);
  });

  it('announces a desk add when the jar is full, and the desk candy glows', () => {
    seed(JAR_CAPACITY);
    setup();
    fireEvent.click(screen.getByText('add'));
    expect(screen.getByTestId('announce').textContent).toBe(ADDED_TO_DESK_MESSAGE);
    waitForGlow();
    expect(glowEls()).toHaveLength(1);
  });

  it('keeps the visible undo text next to the announcement', () => {
    seed(3);
    setup();
    fireEvent.click(screen.getByText('complete-1'));
    fireEvent.click(screen.getByText('add'));
    expect(screen.getByText('Done! A ghost cheers you on 👻')).toBeTruthy();
    expect(screen.getByText(ADDED_TO_JAR_MESSAGE)).toBeTruthy();
  });

  it('clears the announcement after 4 s', () => {
    seed(2);
    setup();
    fireEvent.click(screen.getByText('add'));
    expect(screen.getByTestId('announce').textContent).toBe(ADDED_TO_JAR_MESSAGE);
    act(() => {
      vi.advanceTimersByTime(ANNOUNCE_CLEAR_MS - 1);
    });
    expect(screen.getByTestId('announce').textContent).toBe(ADDED_TO_JAR_MESSAGE);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByTestId('announce').textContent).toBe('');
  });
});
