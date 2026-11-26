import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JarPile } from '../../src/features/jar/JarPile';
import { JAR_CAPACITY } from '../../src/features/jar/jarGeometry';
import { TaskStoreProvider, useTaskStore } from '../../src/features/tasks/taskStore';
import type { Task } from '../../src/features/tasks/taskTypes';
import { TASKS_KEY } from '../../src/utils/persistence';

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

/** SVG elements expose className as an object, so read the attribute. */
function cls(el: Element): string {
  return el.getAttribute('class') ?? '';
}

function Adder() {
  const { dispatch } = useTaskStore();
  return (
    <button
      type="button"
      onClick={() =>
        dispatch({ type: 'CREATE_TASK', payload: { title: 'Brand new', dueDate: null, monster: null } })
      }
    >
      add
    </button>
  );
}

function setup() {
  return render(
    <TaskStoreProvider>
      <JarPile />
      <Adder />
    </TaskStoreProvider>,
  );
}

function mockReducedMotion(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('JarPile', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
    mockReducedMotion(false);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('renders 3 tasks as 3 candy buttons inside the jar clip group', () => {
    seed(3);
    setup();
    const jar = screen.getByTestId('jar-candies');
    expect(within(jar).getAllByRole('button')).toHaveLength(3);
    expect(within(screen.getByTestId('jar-overflow')).queryAllByRole('button')).toHaveLength(0);
  });

  it('puts 40 candies in the jar and 1 on the desk when 41 tasks exist, all selectable', () => {
    seed(JAR_CAPACITY + 1);
    setup();
    const jar = screen.getByTestId('jar-candies');
    const overflow = screen.getByTestId('jar-overflow');
    expect(within(jar).getAllByRole('button')).toHaveLength(JAR_CAPACITY);
    const spilled = within(overflow).getAllByRole('button');
    expect(spilled).toHaveLength(1);
    for (const btn of [...within(jar).getAllByRole('button'), ...spilled]) {
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    }
    // Desk candies are drawn sorted by y, so pick one by name, not by DOM order.
    fireEvent.click(within(overflow).getByRole('button', { name: /Task 41/ }));
    expect(within(overflow).getByRole('button', { name: /Task 41/ }).getAttribute('aria-pressed')).toBe('true');
  });

  it('draws a selected in-jar candy last, in the overflow layer', () => {
    seed(3);
    setup();
    fireEvent.click(within(screen.getByTestId('jar-candies')).getAllByRole('button')[0]!);
    expect(within(screen.getByTestId('jar-candies')).getAllByRole('button')).toHaveLength(2);
    const overflow = screen.getByTestId('jar-overflow');
    expect(within(overflow).getAllByRole('button')).toHaveLength(1);
    expect(overflow.querySelector('[aria-pressed="true"]')).toBeTruthy();
  });

  it('does not animate candies present on first render', () => {
    seed(3);
    setup();
    for (const el of screen.getAllByTestId('jar-pile-candy')) {
      expect(cls(el)).not.toContain('--drop');
      expect(cls(el)).not.toContain('--fade');
    }
  });

  it('drops a new candy in from the lid once the lid is open', () => {
    vi.useFakeTimers();
    seed(2);
    setup();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'add' }));
    });
    // The new candy waits, hidden, while the lid lifts (350 ms).
    expect(
      screen.getAllByTestId('jar-pile-candy').some((el) => cls(el).includes('--drop')),
    ).toBe(false);
    act(() => void vi.advanceTimersByTime(350));
    vi.useRealTimers();
    const dropping = screen
      .getAllByTestId('jar-pile-candy')
      .filter((el) => cls(el).includes('jar-pile__candy--drop'));
    expect(dropping).toHaveLength(1);
    expect(dropping[0]!.style.getPropertyValue('--drop-y')).toMatch(/px$/);
  });

  it('adds no drop transform under reduced motion, only a fade', () => {
    mockReducedMotion(true);
    seed(2);
    setup();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'add' }));
    });
    const all = screen.getAllByTestId('jar-pile-candy');
    expect(all.some((el) => cls(el).includes('--drop'))).toBe(false);
    const fading = all.filter((el) => cls(el).includes('jar-pile__candy--fade'));
    expect(fading).toHaveLength(1);
    expect(fading[0]!.style.getPropertyValue('--drop-y')).toBe('');
  });
});
