/** Pure types for tasks. Decay stage is derived, never stored on a Task. */

export type DecayStage = 'Fresh' | 'Dull' | 'Spooky' | 'Haunted' | 'Cursed';

export type MonsterKind =
  | 'pumpkin'
  | 'mummy'
  | 'skeleton'
  | 'spider'
  | 'frankenstein'
  | 'vampire'
  | 'bat'
  | 'gravestone';

export interface Task {
  id: string; // crypto.randomUUID()
  title: string; // non-empty after trim
  dueDate: number | null; // Unix timestamp ms (real wall-clock), or null
  monster: MonsterKind; // user-chosen or auto-assigned at creation; always set
  isSample: boolean; // true for seeded demo candies
  createdAt: number; // real wall-clock timestamp at creation (ms)
  completedAt: number | null; // real wall-clock timestamp on completion, or null
}

export interface FocusSession {
  taskId: string;
  durationSeconds: number;
  startedAt: number; // wall-clock Date.now()
}

export interface CreateTaskInput {
  title: string;
  dueDate: number | null;
  monster: MonsterKind | null; // null means auto-assign via taskIdToMonster(id)
}

export interface EditTaskInput {
  title: string;
  dueDate: number | null;
  monster: MonsterKind;
}

/** Ascending severity order. */
export const DECAY_STAGE_ORDER: DecayStage[] = [
  'Fresh',
  'Dull',
  'Spooky',
  'Haunted',
  'Cursed',
];
