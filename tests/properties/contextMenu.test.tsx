import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';
import { placePopover } from '../../src/features/contextMenu/ContextMenu';
import type { Task } from '../../src/features/tasks/taskTypes';
import { TASKS_KEY } from '../../src/utils/persistence';

const LONG_TITLE = 'Water the haunted ferns and then feed the very hungry cobweb';

function makeTask(i: number, title = `Task ${i}`): Task {
  return {
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    title,
    dueDate: null,
    monster: 'pumpkin',
    isSample: false,
    createdAt: Date.now(),
    completedAt: null,
  };
}

function seed(tasks: Task[]) {
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function mockMedia(mobile: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: mobile && query.includes('max-width: 767px'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function candy(i: number): Element {
  const id = makeTask(i).id;
  const el = document.querySelector(`[data-testid="candy-item"][data-task-id="${id}"]`);
  if (!el) throw new Error('candy not found');
  return el;
}

function openMenu(i = 1) {
  fireEvent.click(candy(i));
  return screen.getByTestId('context-menu');
}

describe('ContextMenu', () => {
  const originalMatchMedia = window.matchMedia;
  beforeEach(() => {
    window.localStorage.clear();
    mockMedia(false);
    seed([makeTask(1, LONG_TITLE), makeTask(2)]);
  });
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('opens on candy click with the full title and decay stage', () => {
    render(<App />);
    expect(screen.queryByTestId('context-menu')).toBeNull();
    const menu = openMenu();
    expect(within(menu).getByRole('heading', { name: LONG_TITLE })).toBeInTheDocument();
    expect(within(menu).getByText('Stage: Fresh')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: LONG_TITLE })).toBeInTheDocument();
  });

  it('gives each action button an accessible name', () => {
    render(<App />);
    const menu = openMenu();
    for (const name of ['Complete', 'Focus', 'Edit', 'Delete']) {
      expect(within(menu).getByRole('button', { name })).toBeEnabled();
    }
  });

  it('closes on Escape and clears the selection', () => {
    render(<App />);
    openMenu();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('context-menu')).toBeNull();
    expect(candy(1).getAttribute('data-selected')).toBe('false');
  });

  it('closes on an outside press', () => {
    render(<App />);
    openMenu();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByTestId('context-menu')).toBeNull();
  });

  it('stays open on a press inside the menu', () => {
    render(<App />);
    const menu = openMenu();
    fireEvent.pointerDown(within(menu).getByRole('heading'));
    expect(screen.getByTestId('context-menu')).toBeInTheDocument();
  });

  it('Complete completes the task and closes the menu', () => {
    render(<App />);
    const menu = openMenu();
    fireEvent.click(within(menu).getByRole('button', { name: 'Complete' }));
    expect(screen.queryByTestId('context-menu')).toBeNull();
    const stored = JSON.parse(window.localStorage.getItem(TASKS_KEY) ?? '[]') as Task[];
    expect(stored.find((t) => t.id === makeTask(1).id)?.completedAt).not.toBeNull();
  });

  it('Delete removes the task and closes the menu', () => {
    render(<App />);
    const menu = openMenu();
    fireEvent.click(within(menu).getByRole('button', { name: 'Delete' }));
    expect(screen.queryByTestId('context-menu')).toBeNull();
    expect(screen.getAllByTestId('candy-item')).toHaveLength(1);
    const stored = JSON.parse(window.localStorage.getItem(TASKS_KEY) ?? '[]') as Task[];
    expect(stored.map((t) => t.id)).toEqual([makeTask(2).id]);
  });

  it('Focus and Edit close the menu even without callbacks', () => {
    render(<App />);
    fireEvent.click(within(openMenu()).getByRole('button', { name: 'Focus' }));
    expect(screen.queryByTestId('context-menu')).toBeNull();
    fireEvent.click(within(openMenu()).getByRole('button', { name: 'Edit' }));
    expect(screen.queryByTestId('context-menu')).toBeNull();
  });

  it('traps Tab and Shift+Tab inside the menu and restores focus on close', () => {
    render(<App />);
    const menu = openMenu();
    const buttons = within(menu).getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(document.activeElement).toBe(buttons[0]);
    buttons[3]!.focus();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Tab' });
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(buttons[3]);
    // A stray focus outside is pulled back in.
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document.body, { key: 'Tab' });
    expect(menu.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(candy(1));
  });

  it('shows a bottom sheet at max-width 767px', () => {
    mockMedia(true);
    render(<App />);
    openMenu();
    const sheet = screen.getByTestId('bottom-sheet');
    expect(within(sheet).getByRole('button', { name: 'Complete' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('places the popover beside the candy, flipping and clamping to the viewport', () => {
    const vp = { width: 1000, height: 700 };
    const size = { width: 200, height: 200 };
    const right = placePopover({ left: 100, right: 160, top: 300, bottom: 360 }, size, vp);
    expect(right.left).toBe(172);
    const flipped = placePopover({ left: 800, right: 900, top: 300, bottom: 360 }, size, vp);
    expect(flipped.left).toBe(588);
    const clamped = placePopover({ left: 100, right: 160, top: -50, bottom: 0 }, size, vp);
    expect(clamped.top).toBe(8);
  });

  it('renders the popover without a backdrop so other candies stay tappable', () => {
    render(<App />);
    openMenu(1);
    act(() => {
      fireEvent.pointerDown(candy(2));
      fireEvent.click(candy(2));
    });
    expect(candy(2).getAttribute('data-selected')).toBe('true');
    expect(screen.getByRole('dialog', { name: 'Task 2' })).toBeInTheDocument();
  });
});
