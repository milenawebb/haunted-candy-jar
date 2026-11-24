import type { DecayStage, Task } from './taskTypes'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/**
 * Pure: maps a task and the current logical time to a decay stage.
 *
 * Due-date path (Requirement 7.2), with remaining = dueDate - logicalNow:
 *   Fresh   remaining > 48 h
 *   Dull    24 h < remaining <= 48 h
 *   Spooky  2 h < remaining <= 24 h
 *   Haunted remaining <= 2 h, up to 24 h past due
 *   Cursed  more than 24 h past due
 *
 * Age path (Requirement 7.3, no due date), with age = logicalNow - createdAt:
 *   Fresh < 3 d, Dull < 7 d, Spooky < 14 d, Haunted < 21 d, Cursed >= 21 d.
 */
export function decayFunction(task: Task, logicalNow: number): DecayStage {
  if (task.dueDate !== null) {
    const remaining = task.dueDate - logicalNow
    if (remaining > 48 * HOUR_MS) return 'Fresh'
    if (remaining > 24 * HOUR_MS) return 'Dull'
    if (remaining > 2 * HOUR_MS) return 'Spooky'
    if (remaining >= -24 * HOUR_MS) return 'Haunted'
    return 'Cursed'
  }

  const age = logicalNow - task.createdAt
  if (age < 3 * DAY_MS) return 'Fresh'
  if (age < 7 * DAY_MS) return 'Dull'
  if (age < 14 * DAY_MS) return 'Spooky'
  if (age < 21 * DAY_MS) return 'Haunted'
  return 'Cursed'
}
