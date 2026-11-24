import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JarPile } from '../../src/features/jar/JarPile';
import { TaskStoreProvider, useTaskStore, type TaskStore } from '../../src/features/tasks/taskStore';

let store: TaskStore | undefined;
function Probe() {
  store = useTaskStore();
  return null;
}

function mockReducedMotion(reduced: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function setup() {
  const onLidOpen = vi.fn();
  const onLidClose = vi.fn();
  const { unmount } = render(
    <TaskStoreProvider>
      <Probe />
      <JarPile onLidOpen={onLidOpen} onLidClose={onLidClose} />
    </TaskStoreProvider>,
  );
  return { onLidOpen, onLidClose, unmount };
}

function addTask(title: string) {
  act(() => {
    store!.dispatch({
      type: 'CREATE_TASK',
      payload: { title, dueDate: null, monster: null },
      now: 1000,
    });
  });
}

const lid = () => screen.getByTestId('lid-animation');
/** Steps time in 50 ms slices so React can schedule each next phase timer. */
const tick = (ms: number) => {
  for (let t = 0; t < ms; t += 50) act(() => void vi.advanceTimersByTime(Math.min(50, ms - t)));
};

describe('LidAnimation in JarPile', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    mockReducedMotion(false);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not move the lid on first render', () => {
    const { onLidOpen, onLidClose } = setup();
    expect(lid().getAttribute('data-lid-open')).toBe('false');
    tick(5000);
    expect(onLidOpen).not.toHaveBeenCalled();
    expect(onLidClose).not.toHaveBeenCalled();
  });

  it('opens and closes the lid once when a task is added, hiding the candy until open', () => {
    const { onLidOpen, onLidClose } = setup();
    addTask('Brew tea');
    expect(onLidOpen).toHaveBeenCalledTimes(1);
    expect(onLidClose).not.toHaveBeenCalled();
    expect(lid().getAttribute('data-lid-open')).toBe('true');
    expect(lid().style.transform).toContain('rotate(');
    expect(screen.getByTestId('jar-pile-candy').style.visibility).toBe('hidden');

    tick(350);
    expect(screen.getByTestId('jar-pile-candy').style.visibility).toBe('');
    tick(500);
    expect(onLidClose).toHaveBeenCalledTimes(1);
    expect(lid().getAttribute('data-lid-open')).toBe('false');
    tick(350);
    expect(onLidOpen).toHaveBeenCalledTimes(1);
    expect(onLidClose).toHaveBeenCalledTimes(1);
  });

  it('runs two quick adds one after the other', () => {
    const { onLidOpen, onLidClose } = setup();
    addTask('One');
    addTask('Two');
    expect(onLidOpen).toHaveBeenCalledTimes(1);
    tick(350 + 500 + 350);
    expect(onLidOpen).toHaveBeenCalledTimes(2);
    expect(onLidClose).toHaveBeenCalledTimes(1);
    tick(350 + 500 + 350);
    expect(onLidOpen).toHaveBeenCalledTimes(2);
    expect(onLidClose).toHaveBeenCalledTimes(2);
  });

  it('opens the lid when a task is completed', () => {
    const { onLidOpen, onLidClose } = setup();
    addTask('Brew tea');
    tick(2000);
    const id = store!.state.tasks[0]!.id;
    act(() => store!.dispatch({ type: 'COMPLETE_TASK', taskId: id, now: 2000 }));
    expect(onLidOpen).toHaveBeenCalledTimes(2);
    tick(350 + 400 + 350);
    expect(onLidClose).toHaveBeenCalledTimes(2);
  });

  it('stays silent on import', () => {
    const { onLidOpen } = setup();
    act(() => {
      store!.dispatch({
        type: 'IMPORT_TASKS',
        tasks: ['a', 'b', 'c'].map((id) => ({
          id,
          title: id,
          dueDate: null,
          monster: 'bat' as const,
          isSample: false,
          createdAt: 1,
          completedAt: null,
        })),
      });
    });
    tick(3000);
    expect(onLidOpen).not.toHaveBeenCalled();
  });

  it('clears its timers on unmount', () => {
    const { onLidClose, unmount } = setup();
    addTask('Brew tea');
    unmount();
    vi.advanceTimersByTime(3000);
    expect(onLidClose).not.toHaveBeenCalled();
  });

  it('keeps the lid still under reduced motion but still calls the callbacks', () => {
    mockReducedMotion(true);
    const { onLidOpen, onLidClose } = setup();
    addTask('Brew tea');
    expect(onLidOpen).toHaveBeenCalledTimes(1);
    expect(lid().getAttribute('data-lid-open')).toBe('false');
    expect(lid().style.transform).toBe('');
    // The candy fades in at once instead of waiting for the lid.
    expect(screen.getByTestId('jar-pile-candy').style.visibility).toBe('');
    tick(150 * 2);
    expect(onLidClose).toHaveBeenCalledTimes(1);
  });
});
