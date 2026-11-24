/**
 * TEMPORARY, DEV ONLY. Seeds demo candies for `npm run dev` with `?demo=N`.
 * Remove this file (and the demo wiring in taskStore.tsx) once task 39
 * (sampleData) lands. Loaded by dynamic import behind import.meta.env.DEV,
 * so it is not part of the production bundle.
 */
import { MONSTER_KINDS } from '../utils/monsterKind';
import type { Task } from '../features/tasks/taskTypes';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
export const DEMO_DEFAULT_COUNT = 8;
export const DEMO_MAX_COUNT = 40;

interface Spec {
  title: string;
  /** Due date offset from now (ms), or null to use the age path. */
  due: number | null;
  /** Age at now (ms). Only matters for the age path. */
  age: number;
}

/** First eight: one per monster, every stage, both decay paths. */
const BASE: readonly Spec[] = [
  { title: 'Water the cobwebs', due: 5 * DAY, age: DAY }, // Fresh (due)
  { title: 'Polish the moon', due: 30 * HOUR, age: 2 * DAY }, // Dull (due)
  { title: 'Feed the ghost a snack', due: 10 * HOUR, age: 3 * DAY }, // Spooky (due), long title
  { title: 'Knit a spider sweater', due: 1 * HOUR, age: 4 * DAY }, // Haunted (due), long title
  { title: 'Return the haunted library book', due: -3 * DAY, age: 6 * DAY }, // Cursed (due), long title
  { title: 'Dust the bats', due: null, age: 5 * DAY }, // Dull (age)
  { title: 'Tune the creaky stairs', due: null, age: 17 * DAY }, // Haunted (age)
  { title: 'Hug a tombstone', due: null, age: 30 * DAY }, // Cursed (age)
];

/** Extra candies cycle these: due offsets (due path) and ages (age path). */
const EXTRA_DUE = [5 * DAY, 30 * HOUR, 10 * HOUR, 1 * HOUR, -3 * DAY];
const EXTRA_AGE = [DAY, 5 * DAY, 10 * DAY, 17 * DAY, 30 * DAY];
const EXTRA_TITLES = [
  'Sort the candy corn',
  'Light a candle',
  'Brew a tiny potion',
  'Wave at the moon',
  'Fluff the ghost pillow',
  'Count the pumpkins',
];

/** Parses `?demo=` from a query string. Null when absent, else 8 to 40 (1 means 8). */
export function parseDemoCount(search: string): number | null {
  const raw = new URLSearchParams(search).get('demo');
  if (raw === null) return null;
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || n <= 1) return DEMO_DEFAULT_COUNT;
  return Math.min(n, DEMO_MAX_COUNT);
}

/** Pure: builds `count` demo tasks relative to `now`, with stable ids demo-1, demo-2, ... */
export function buildDemoTasks(count: number, now: number): Task[] {
  const tasks: Task[] = [];
  for (let i = 0; i < count; i++) {
    let spec: Spec;
    if (i < BASE.length) {
      spec = BASE[i]!;
    } else {
      const k = i - BASE.length;
      spec = {
        title: EXTRA_TITLES[k % EXTRA_TITLES.length]!,
        due: k % 2 === 0 ? EXTRA_DUE[k % EXTRA_DUE.length]! : null,
        age: EXTRA_AGE[k % EXTRA_AGE.length]!,
      };
    }
    tasks.push({
      id: `demo-${i + 1}`,
      title: spec.title,
      dueDate: spec.due === null ? null : now + spec.due,
      monster: MONSTER_KINDS[i % MONSTER_KINDS.length]!,
      isSample: false,
      createdAt: now - spec.age,
      completedAt: null,
    });
  }
  return tasks;
}
