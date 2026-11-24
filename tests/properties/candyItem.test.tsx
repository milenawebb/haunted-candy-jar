import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CandyItem, HIT_MIN_PX } from '../../src/features/candy/CandyItem';
import { TaskStoreProvider, useTaskStore, type AppState } from '../../src/features/tasks/taskStore';
import type { Task } from '../../src/features/tasks/taskTypes';

const NOW = 1_700_000_000_000;
const HOUR = 3_600_000;

const task: Task = {
  id: 't1',
  title: 'Write report',
  dueDate: NOW - 3 * HOUR, // up to 24 h overdue: Haunted
  monster: 'pumpkin',
  isSample: false,
  createdAt: NOW - 10 * HOUR,
  completedAt: null,
};

let latest: AppState;

function Harness({ onDone }: { onDone?: () => void }) {
  const { state, dispatch } = useTaskStore();
  latest = state;
  useEffect(() => {
    dispatch({ type: 'IMPORT_TASKS', tasks: [task] });
  }, [dispatch]);
  return (
    <svg>
      {state.tasks.map((t) => (
        <CandyItem key={t.id} task={t} x={100} y={100} rotation={8} onDone={onDone} />
      ))}
    </svg>
  );
}

function setup(onDone?: () => void) {
  render(
    <TaskStoreProvider>
      <Harness onDone={onDone} />
    </TaskStoreProvider>,
  );
  return screen.getByRole('button', { name: 'Write report, Haunted' });
}

describe('CandyItem', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('exposes title and decay stage in the accessible name, focusable', () => {
    const el = setup();
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.getAttribute('aria-pressed')).toBe('false');
    expect(el.getAttribute('data-decay-stage')).toBe('Haunted');
  });

  it('has a hit area of at least 44 CSS px', () => {
    const el = setup();
    const rect = el.querySelector('[data-testid="candy-hit-area"]')!;
    expect(Number(rect.getAttribute('width'))).toBeGreaterThanOrEqual(HIT_MIN_PX);
    expect(Number(rect.getAttribute('height'))).toBeGreaterThanOrEqual(HIT_MIN_PX);
  });

  it('click selects, shows the note and lifts; click again deselects', () => {
    const el = setup();
    fireEvent.click(el);
    expect(latest.selectedTaskId).toBe('t1');
    expect(el.getAttribute('aria-pressed')).toBe('true');
    expect(el.querySelector('[data-testid="bandage-note"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="candy-lift"]')!.getAttribute('style')).toContain('translateY(-');
    fireEvent.click(el);
    expect(latest.selectedTaskId).toBeNull();
  });

  it('Enter selects', () => {
    const el = setup();
    fireEvent.keyDown(el, { key: 'Enter' });
    expect(latest.selectedTaskId).toBe('t1');
  });

  it('completes after an 800 ms hold, shows the ghost, then unmounts via onDone', () => {
    const onDone = vi.fn();
    const el = setup(onDone);
    fireEvent.pointerDown(el);
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(latest.tasks[0]!.completedAt).toBe(NOW + 800);
    expect(screen.getByTestId('ghost-cheer')).toBeTruthy();
    fireEvent.pointerUp(el);
    fireEvent.click(el);
    expect(latest.selectedTaskId).toBeNull();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('candy-item')).toBeNull();
  });

  it('does not complete or select when released before 800 ms', () => {
    const el = setup();
    fireEvent.pointerDown(el);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(el);
    fireEvent.click(el);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(latest.tasks[0]!.completedAt).toBeNull();
    expect(latest.selectedTaskId).toBeNull();
    expect(screen.queryByTestId('ghost-cheer')).toBeNull();
  });

  it('completes on a Space hold', () => {
    const el = setup();
    fireEvent.keyDown(el, { key: ' ', code: 'Space' });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(latest.tasks[0]!.completedAt).not.toBeNull();
  });

  it('uses no lift transition under reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const el = setup();
    expect(el.querySelector('[data-testid="candy-lift"]')!.getAttribute('class')).toContain(
      'candy-item__lift--instant',
    );
  });

  it('keeps the lift transition when motion is allowed', () => {
    const el = setup();
    expect(el.querySelector('[data-testid="candy-lift"]')!.getAttribute('class')).not.toContain(
      'candy-item__lift--instant',
    );
  });
});
