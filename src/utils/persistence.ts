/** localStorage persistence service. Side effects live here; never throws. */
import type { Task } from '../features/tasks/taskTypes';
import { validateTaskList } from './taskSchema';

export const TASKS_KEY = 'hcj_tasks';
export const SOUND_KEY = 'hcj_sound';
export const SEEN_INTRO_KEY = 'hcj_seen_intro';

function getStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Reads and validates the task list. Returns [] on any problem. */
export function loadTasks(): Task[] {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const raw = storage.getItem(TASKS_KEY);
    if (raw === null) return [];
    return validateTaskList(JSON.parse(raw));
  } catch (err) {
    console.warn('Could not load tasks, starting with an empty jar.', err);
    return [];
  }
}

/** Writes the task list. Logs and swallows any failure. */
export function saveTasks(tasks: Task[]): void {
  try {
    const storage = getStorage();
    if (!storage) throw new Error('localStorage is unavailable');
    storage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Could not save tasks.', err);
  }
}

/** Sound is off by default. */
export function loadSoundEnabled(): boolean {
  try {
    return getStorage()?.getItem(SOUND_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveSoundEnabled(enabled: boolean): void {
  try {
    const storage = getStorage();
    if (!storage) throw new Error('localStorage is unavailable');
    storage.setItem(SOUND_KEY, enabled ? 'true' : 'false');
  } catch (err) {
    console.error('Could not save sound setting.', err);
  }
}

/**
 * True once the first-visit intro was dismissed. When storage is unavailable
 * this returns true, so a visitor who cannot remember the choice is not nagged
 * on every load (the help button still reopens the intro).
 */
export function loadSeenIntro(): boolean {
  try {
    const storage = getStorage();
    if (!storage) return true;
    return storage.getItem(SEEN_INTRO_KEY) === 'true';
  } catch {
    return true;
  }
}

export function saveSeenIntro(): void {
  try {
    const storage = getStorage();
    if (!storage) throw new Error('localStorage is unavailable');
    storage.setItem(SEEN_INTRO_KEY, 'true');
  } catch (err) {
    console.error('Could not remember the intro.', err);
  }
}
