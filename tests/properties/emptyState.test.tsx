import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EmptyState, shouldShowEmptyState } from '../../src/features/jar/EmptyState';
import { JarScene } from '../../src/features/jar/JarScene';
import { TaskStoreProvider, useTaskStore, type TaskStore } from '../../src/features/tasks/taskStore';
import type { Task } from '../../src/features/tasks/taskTypes';

function task(over: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Brew tea',
    dueDate: null,
    monster: 'pumpkin',
    isSample: false,
    createdAt: 1000,
    completedAt: null,
    ...over,
  };
}

describe('shouldShowEmptyState', () => {
  it('is true for an empty list', () => {
    expect(shouldShowEmptyState([])).toBe(true);
  });
  it('is false when sample candies are present (Req 14.1)', () => {
    expect(shouldShowEmptyState([task({ isSample: true })])).toBe(false);
  });
  it('is true when only completed tasks exist', () => {
    expect(shouldShowEmptyState([task({ completedAt: 2000 })])).toBe(true);
  });
  it('is false with one active task', () => {
    expect(shouldShowEmptyState([task()])).toBe(false);
  });
});

describe('EmptyState', () => {
  beforeEach(() => localStorage.clear());

  it('shows the prompt, then hides it once a task is added', () => {
    let store: TaskStore | undefined;
    function Probe() {
      store = useTaskStore();
      return null;
    }
    render(
      <TaskStoreProvider>
        <Probe />
        <JarScene overlay={<EmptyState />} />
      </TaskStoreProvider>,
    );
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Your jar is empty. Drop in a candy!');
    expect(status.textContent).not.toContain('\u2014');

    act(() => {
      store!.dispatch({
        type: 'CREATE_TASK',
        payload: { title: 'Brew tea', dueDate: null, monster: null },
        now: 1000,
      });
    });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
