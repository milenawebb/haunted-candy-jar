/* eslint-disable react-refresh/only-export-components */
import { useTaskStore } from '../tasks/taskStore';
import type { Task } from '../tasks/taskTypes';
import './EmptyState.css';

/**
 * True when no incomplete, non-sample candy exists. Pure.
 * Validates: Requirements 14.1
 */
export function shouldShowEmptyState(tasks: readonly Task[]): boolean {
  return tasks.every((t) => t.completedAt !== null);
}

export const EMPTY_STATE_TEXT = 'Your jar is empty. Drop in a candy!';

/**
 * Prompt shown inside an empty jar. Rendered as an HTML overlay (pass it to
 * JarScene's `overlay` prop) so the text stays real Inter text at 16px and
 * does not scale with the SVG. It is static, so no reduced-motion fallback
 * is needed. role="status" lets screen readers announce it.
 * Validates: Requirements 14.1, 14.2
 */
export function EmptyState() {
  const {
    state: { tasks },
  } = useTaskStore();
  if (!shouldShowEmptyState(tasks)) return null;
  return (
    <div className="empty-state" data-testid="empty-state">
      <p className="empty-state__text" role="status">
        {EMPTY_STATE_TEXT}
      </p>
    </div>
  );
}
