import { act, fireEvent, render, screen, within } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { chooseNextFocusId } from '../../src/features/candy/focusHandoff';
import type { Task } from '../../src/features/tasks/taskTypes';
import { TASKS_KEY } from '../../src/utils/persistence';

/**
 * After a candy is completed nothing of it stays visible or focusable, and
 * focus moves on to the next candy (or the Add button) when it was on the candy.
 * Validates: Requirements 3.1, 4.3 (completion) and the accessible element rules.
 */
const NOW = 1_700_000_000_000;

function makeTask(id: string, title: string, offset: number): Task {
  return {
    id,
    title,
    dueDate: null,
    monster: 'pumpkin',
    isSample: false,
    createdAt: NOW - 3_600_000 + offset,
    completedAt: null,
  };
}

function seed(...tasks: Task[]) {
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) act(() => void vi.advanceTimersByTime(Math.min(100, ms - t)));
}

const candyEl = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title},`) });
const byTitle = (title: string): Element => {
  const el = Array.from(document.querySelectorAll('[data-testid="candy-item"]')).find((e) =>
    (e.getAttribute('aria-label') ?? '').startsWith(`${title},`),
  );
  if (!el) throw new Error(`no candy ${title}`);
  return el;
};

function hold(el: HTMLElement, ms: number) {
  fireEvent.pointerDown(el, { button: 0, pointerId: 1 });
  advance(ms);
  fireEvent.pointerUp(el, { pointerId: 1 });
  fireEvent.click(el);
}

/** Nothing of the completed candy is left to see, hear or tab to. */
function expectGone(el: Element) {
  expect(el.querySelector('[data-testid="candy-focus-ring"]')).toBeNull();
  expect(el.getAttribute('aria-hidden')).toBe('true');
  expect(el.getAttribute('tabindex')).toBe('-1');
  expect(el.getAttribute('data-completing')).toBe('true');
  expect(el.querySelector('[data-testid="candy-note"]')).toBeNull();
}

describe('chooseNextFocusId', () => {
  it('picks the next id, else the previous one, else null (property)', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 12 }), fc.nat(), (ids, n) => {
        const i = n % ids.length;
        const next = chooseNextFocusId(ids, ids[i]!);
        if (ids.length === 1) expect(next).toBeNull();
        else expect(next).toBe(i < ids.length - 1 ? ids[i + 1] : ids[i - 1]);
        expect(next).not.toBe(ids[i]);
      }),
      { numRuns: 100 },
    );
  });

  it('returns null for an unknown id', () => {
    expect(chooseNextFocusId(['a', 'b'], 'z')).toBeNull();
  });
});

describe('completing a candy', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('hcj_seen_intro', 'true');
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hold: hides the ring, makes the candy inert and moves focus to another candy', () => {
    seed(makeTask('a', 'Alpha', 1), makeTask('b', 'Bravo', 2), makeTask('c', 'Charlie', 3));
    render(<App />);
    const el = candyEl('Bravo');
    el.focus();
    expect(document.activeElement).toBe(el);
    expect(el.querySelector('[data-testid="candy-focus-ring"]')).not.toBeNull();
    hold(el, 900);
    expectGone(byTitle('Bravo'));
    const active = document.activeElement as Element;
    expect(active).not.toBe(byTitle('Bravo'));
    expect(active.getAttribute('data-testid')).toBe('candy-item');
    expect(active.getAttribute('data-completing')).toBeNull();
    advance(2500);
    expect(screen.queryAllByTestId('candy-item')).toHaveLength(2);
    expect((document.activeElement as Element).getAttribute('data-testid')).toBe('candy-item');
  });

  it('menu Complete: same result, focus lands on another candy', () => {
    seed(makeTask('a', 'Alpha', 1), makeTask('b', 'Bravo', 2));
    render(<App />);
    const el = candyEl('Alpha');
    el.focus();
    fireEvent.click(el);
    fireEvent.click(within(screen.getByTestId('context-menu')).getByRole('button', { name: 'Complete' }));
    expect(screen.queryByTestId('context-menu')).toBeNull();
    expectGone(byTitle('Alpha'));
    const active = document.activeElement as Element;
    expect(active.getAttribute('data-testid')).toBe('candy-item');
    expect(active.getAttribute('aria-label')).toMatch(/^Bravo,/);
    advance(2500);
    expect(screen.queryAllByTestId('candy-item')).toHaveLength(1);
  });

  it('the only candy: focus lands on the Add button', () => {
    seed(makeTask('a', 'Alpha', 1));
    render(<App />);
    const add = screen.getByRole('button', { name: 'Add a candy' });
    const el = candyEl('Alpha');
    el.focus();
    fireEvent.click(el);
    fireEvent.click(within(screen.getByTestId('context-menu')).getByRole('button', { name: 'Complete' }));
    expectGone(byTitle('Alpha'));
    expect(document.activeElement).toBe(add);
    advance(2500);
    expect(screen.queryAllByTestId('candy-item')).toHaveLength(0);
    expect(document.activeElement).toBe(add);
  });

  it('the only candy completed by hold: focus lands on the Add button', () => {
    seed(makeTask('a', 'Alpha', 1));
    render(<App />);
    const el = candyEl('Alpha');
    el.focus();
    hold(el, 900);
    expectGone(byTitle('Alpha'));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add a candy' }));
  });

  it('does not steal focus when it was somewhere else', () => {
    seed(makeTask('a', 'Alpha', 1), makeTask('b', 'Bravo', 2));
    render(<App />);
    const add = screen.getByRole('button', { name: 'Add a candy' });
    add.focus();
    hold(candyEl('Alpha'), 900);
    expectGone(byTitle('Alpha'));
    expect(document.activeElement).toBe(add);
  });
});
