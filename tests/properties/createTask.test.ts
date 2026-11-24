import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { createTask } from '../../src/features/tasks/createTask'
import { decayFunction } from '../../src/features/tasks/decayFunction'
import { MONSTER_KINDS, taskIdToMonster } from '../../src/utils/monsterKind'
import { generateId } from '../../src/utils/idGen'

const monsterArb = fc.constantFrom(...MONSTER_KINDS)
const titleArb = fc
  .string({ minLength: 1 })
  .filter((s) => s.trim().length > 0)

describe('createTask', () => {
  // Feature: haunted-candy-jar, Property 1: Task creation populates all required fields
  it('Property 1: fills all required fields. Validates: Requirement 1.1', () => {
    fc.assert(
      fc.property(
        titleArb,
        fc.option(fc.integer({ min: 0, max: 4_000_000_000_000 }), { nil: null }),
        fc.option(monsterArb, { nil: null }),
        fc.integer({ min: 0, max: 4_000_000_000_000 }),
        (title, dueDate, monster, now) => {
          const task = createTask({ title, dueDate, monster }, now)
          expect(task.id.length).toBeGreaterThan(0)
          expect(task.title).toBe(title.trim())
          expect(task.dueDate).toBe(dueDate)
          expect(task.completedAt).toBeNull()
          expect(task.createdAt).toBe(now)
          expect(task.isSample).toBe(false)
          expect(MONSTER_KINDS).toContain(task.monster)
          if (monster !== null) expect(task.monster).toBe(monster)
          else expect(task.monster).toBe(taskIdToMonster(task.id))
          // Fresh at creation when there is no due date or it is far away (> 49h).
          if (dueDate === null || dueDate - now > 49 * 3_600_000) {
            expect(decayFunction(task, now)).toBe('Fresh')
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  // Feature: haunted-candy-jar, Property 2: Empty-title rejection
  it('Property 2: rejects whitespace-only titles. Validates: Requirement 1.4', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s.trim().length === 0),
        (title) => {
          expect(() =>
            createTask({ title, dueDate: null, monster: null }, 0),
          ).toThrow()
        },
      ),
      { numRuns: 100 },
    )
  })
})

describe('taskIdToMonster', () => {
  it('is deterministic and always returns one of the eight kinds. Validates: Requirement 1.5', () => {
    expect(MONSTER_KINDS).toHaveLength(8)
    fc.assert(
      fc.property(fc.string(), (id) => {
        const m = taskIdToMonster(id)
        expect(MONSTER_KINDS).toContain(m)
        expect(taskIdToMonster(id)).toBe(m)
      }),
      { numRuns: 100 },
    )
  })
})

describe('generateId', () => {
  it('returns unique non-empty ids', () => {
    const a = generateId()
    const b = generateId()
    expect(a.length).toBeGreaterThan(0)
    expect(a).not.toBe(b)
  })
})
