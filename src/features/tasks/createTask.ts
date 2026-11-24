import { generateId } from '../../utils/idGen'
import { taskIdToMonster } from '../../utils/monsterKind'
import type { CreateTaskInput, Task } from './taskTypes'

/**
 * Builds a new Task. Pure aside from calling generateId().
 * Throws an Error if the title is empty or whitespace-only.
 */
export function createTask(input: CreateTaskInput, now: number): Task {
  const title = input.title.trim()
  if (title.length === 0) {
    throw new Error('Task title must not be empty')
  }
  const id = generateId()
  return {
    id,
    title,
    dueDate: input.dueDate,
    monster: input.monster ?? taskIdToMonster(id),
    isSample: false,
    createdAt: now,
    completedAt: null,
  }
}
