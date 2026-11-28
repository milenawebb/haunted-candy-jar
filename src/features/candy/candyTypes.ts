/** Candy is either a Task or a Person. `taskTypes.ts` stays unchanged. */
import type { Task } from '../tasks/taskTypes';
import type { PersonCandy } from '../people/personTypes';

export type { PersonCandy };

/** A v1 Task with a kind tag and the jar it lives in. */
export type TaskCandy = Task & { kind: 'task'; jarId: string };

export type Candy = TaskCandy | PersonCandy;

export type CandyKind = Candy['kind'];
