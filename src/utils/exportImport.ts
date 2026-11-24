/** Task list export and import helpers. Serialize and deserialize are pure. */
import type { Task } from '../features/tasks/taskTypes';
import { validateTaskList } from './taskSchema';

export function serializeTaskList(tasks: Task[]): string {
  return JSON.stringify(tasks);
}

/** Parses and validates a JSON string. Throws a descriptive Error on failure. */
export function deserializeTaskList(raw: string): Task[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not read file as JSON: ${reason}`);
  }
  return validateTaskList(parsed);
}

/** DOM-touching helper. Only touches the DOM when called. */
export function downloadJson(filename: string, data: string): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
