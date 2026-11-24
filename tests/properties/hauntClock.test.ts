import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { computeLogicalNow, type HauntSpeed } from '../../src/features/settings/hauntClock'

const speedArb = fc.constantFrom<HauntSpeed>(1, 60, 3600)
const fastSpeedArb = fc.constantFrom<HauntSpeed>(60, 3600)
const timeArb = fc.integer({ min: 0, max: 4_000_000_000_000 })
const deltaArb = fc.integer({ min: 0, max: 10_000_000 })

describe('hauntClock', () => {
  // "1x equals wall time" means: at speed 1 the result is wallNow itself,
  // regardless of the session anchors (the anchors only matter above 1x).
  it('Validates: Requirement 15.5 (1x returns wall time, ignoring anchors)', () => {
    fc.assert(
      fc.property(timeArb, timeArb, timeArb, (wall, startWall, startLogical) => {
        expect(computeLogicalNow(wall, 1, startWall, startLogical)).toBe(wall)
      }),
      { numRuns: 100 },
    )
  })

  it('Validates: Requirement 15.6 (higher speeds advance proportionally from the anchor)', () => {
    fc.assert(
      fc.property(fastSpeedArb, timeArb, timeArb, deltaArb, (speed, startWall, startLogical, d) => {
        const logical = computeLogicalNow(startWall + d, speed, startWall, startLogical)
        expect(logical).toBe(startLogical + d * speed)
        expect(computeLogicalNow(startWall, speed, startWall, startLogical)).toBe(startLogical)
      }),
      { numRuns: 100 },
    )
  })

  it('Validates: Requirement 15.7 (logical time never decreases as wall time increases)', () => {
    fc.assert(
      fc.property(speedArb, timeArb, timeArb, deltaArb, deltaArb, (speed, startWall, startLogical, d1, d2) => {
        const w1 = startWall + d1
        const w2 = w1 + d2
        expect(computeLogicalNow(w2, speed, startWall, startLogical)).toBeGreaterThanOrEqual(
          computeLogicalNow(w1, speed, startWall, startLogical),
        )
      }),
      { numRuns: 100 },
    )
  })
})
