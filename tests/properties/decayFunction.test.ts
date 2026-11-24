import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { decayFunction } from '../../src/features/tasks/decayFunction'
import {
  DECAY_STAGE_ORDER,
  type DecayStage,
  type Task,
} from '../../src/features/tasks/taskTypes'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const BASE = 1_700_000_000_000

const ordinal = (s: DecayStage) => DECAY_STAGE_ORDER.indexOf(s)

function makeTask(dueDate: number | null, createdAt: number): Task {
  return {
    id: 't',
    title: 'x',
    dueDate,
    monster: 'pumpkin',
    isSample: false,
    createdAt,
    completedAt: null,
  }
}

// Offsets (ms) biased toward threshold boundaries, with +-1 ms neighbours.
const dueBoundaries = [-24 * HOUR, 2 * HOUR, 24 * HOUR, 48 * HOUR]
const ageBoundaries = [3 * DAY, 7 * DAY, 14 * DAY, 21 * DAY]

const nearBoundary = (boundaries: number[]) =>
  fc
    .tuple(fc.constantFrom(...boundaries), fc.integer({ min: -2, max: 2 }))
    .map(([b, d]) => b + d)

const dueOffset = fc.oneof(
  nearBoundary(dueBoundaries),
  fc.integer({ min: -60 * DAY, max: 60 * DAY }),
)
const ageOffset = fc.oneof(
  nearBoundary(ageBoundaries),
  fc.integer({ min: -DAY, max: 60 * DAY }),
)

function expectedDue(remaining: number): DecayStage {
  if (remaining > 48 * HOUR) return 'Fresh'
  if (remaining > 24 * HOUR) return 'Dull'
  if (remaining > 2 * HOUR) return 'Spooky'
  if (remaining >= -24 * HOUR) return 'Haunted'
  return 'Cursed'
}

function expectedAge(age: number): DecayStage {
  if (age < 3 * DAY) return 'Fresh'
  if (age < 7 * DAY) return 'Dull'
  if (age < 14 * DAY) return 'Spooky'
  if (age < 21 * DAY) return 'Haunted'
  return 'Cursed'
}

describe('decayFunction properties', () => {
  it('Property 4: due-date path correctness. Validates: Requirement 7.2', () => {
    fc.assert(
      fc.property(dueOffset, (remaining) => {
        const task = makeTask(BASE + remaining, BASE - 100 * DAY)
        expect(decayFunction(task, BASE)).toBe(expectedDue(remaining))
      }),
      { numRuns: 200 },
    )
  })

  it('Property 5: age-based path correctness. Validates: Requirement 7.3', () => {
    fc.assert(
      fc.property(ageOffset, (age) => {
        const task = makeTask(null, BASE - age)
        expect(decayFunction(task, BASE)).toBe(expectedAge(age))
      }),
      { numRuns: 200 },
    )
  })

  it('Property 6: monotonic non-decrease. Validates: Requirements 8.2, 8.3', () => {
    const timeline = fc.record({
      createdAt: fc.integer({ min: 0, max: 100 * DAY }),
      dueOffset: fc.option(dueOffset, { nil: null }),
      t1: fc.oneof(nearBoundary([...dueBoundaries, ...ageBoundaries]), fc.integer({ min: -60 * DAY, max: 60 * DAY })),
      gap: fc.oneof(fc.constant(0), fc.integer({ min: 0, max: 90 * DAY })),
    })
    fc.assert(
      fc.property(timeline, ({ createdAt, dueOffset: off, t1, gap }) => {
        const due = off === null ? null : createdAt + off
        const task = makeTask(due, createdAt)
        const now1 = createdAt + t1
        const now2 = now1 + gap
        expect(ordinal(decayFunction(task, now2))).toBeGreaterThanOrEqual(
          ordinal(decayFunction(task, now1)),
        )
      }),
      { numRuns: 300 },
    )
  })
})
