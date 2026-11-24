/** Pure Zod schemas for Task validation (used by import and persistence). */
import { z } from 'zod';
import type { Task } from '../features/tasks/taskTypes';

export const MonsterKindSchema = z.enum([
  'pumpkin',
  'mummy',
  'skeleton',
  'spider',
  'frankenstein',
  'vampire',
  'bat',
  'gravestone',
]);

export const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().refine((s) => s.trim().length > 0, {
    message: 'title must not be empty',
  }),
  dueDate: z.number().finite().nullable(),
  monster: MonsterKindSchema,
  isSample: z.boolean(),
  createdAt: z.number().finite(),
  completedAt: z.number().finite().nullable(),
});

export const PersistedTaskListSchema = z.array(TaskSchema);

/** Validates unknown input as a Task list. Throws a descriptive Error on mismatch. */
export function validateTaskList(input: unknown): Task[] {
  const result = PersistedTaskListSchema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.length > 0 ? i.path.join('.') : '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid task list: ${details}`);
  }
  return result.data;
}
