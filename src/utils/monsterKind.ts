import type { MonsterKind } from '../features/tasks/taskTypes'

/** The eight monster kinds, in fixed order. */
export const MONSTER_KINDS: readonly MonsterKind[] = [
  'pumpkin',
  'mummy',
  'skeleton',
  'spider',
  'frankenstein',
  'vampire',
  'bat',
  'gravestone',
]

/** Deterministic default monster for a task id (FNV-1a hash modulo 8). */
export function taskIdToMonster(id: string): MonsterKind {
  let hash = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return MONSTER_KINDS[hash % MONSTER_KINDS.length] as MonsterKind
}
