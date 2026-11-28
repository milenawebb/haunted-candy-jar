/** Pure migration and parse helpers for stored and imported data. No clock, no random ids. */
import type { DataV2 } from '../features/jars/jarTypes';
import {
  DEFAULT_JAR_IDS,
  DEFAULT_JARS,
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
} from '../features/jars/jarTypes';
import type { Task } from '../features/tasks/taskTypes';
import { DataV2Schema } from './dataSchema';
import { validateTaskList } from './taskSchema';

export type ParsedStored = { version: 1; tasks: Task[] } | { version: 2; data: DataV2 };

function describeIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues
    .slice(0, 5)
    .map((i) => `${i.path.length > 0 ? i.path.join('.') : '(root)'}: ${i.message}`)
    .join('; ');
}

/** Maps a v1 Task list to a v2 document: every Task goes to the To-dos jar. */
export function migrateV1(tasks: Task[]): DataV2 {
  return {
    version: 2,
    candies: tasks.map((t) => ({ ...t, kind: 'task' as const, jarId: DEFAULT_JAR_IDS.todos })),
    jars: DEFAULT_JARS.map((j) => ({
      ...j,
      defaultRhythm: j.defaultRhythm ? { ...j.defaultRhythm } : null,
    })),
    settings: { ...DEFAULT_SETTINGS },
    stats: { ...DEFAULT_STATS },
  };
}

/** Validates a parsed JSON value as a v1 Task array or a v2 object. Throws on anything else. */
export function parseStored(raw: unknown): ParsedStored {
  if (Array.isArray(raw)) {
    return { version: 1, tasks: validateTaskList(raw) };
  }
  if (typeof raw === 'object' && raw !== null && (raw as { version?: unknown }).version === 2) {
    const result = DataV2Schema.safeParse(raw);
    if (!result.success) throw new Error(`Invalid data: ${describeIssues(result.error)}`);
    return { version: 2, data: result.data as DataV2 };
  }
  throw new Error('Unknown data format. Expected a task list or a version 2 file.');
}

/** Serializes the v2 document for export. */
export function toExport(data: DataV2): string {
  return JSON.stringify(data);
}

/** Parses an imported file. Accepts a v1 array or a v2 object. Throws a descriptive Error. */
export function fromImport(raw: string): DataV2 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not read file as JSON: ${reason}`);
  }
  const stored = parseStored(parsed);
  return stored.version === 1 ? migrateV1(stored.tasks) : stored.data;
}
