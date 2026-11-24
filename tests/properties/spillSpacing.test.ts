import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  SPILL_LEFT_MIN,
  SPILL_MIN_DISTANCE,
  SPILL_RADIUS,
  SPILL_RIGHT_MAX,
  SPILL_RIGHT_MAX_COMPACT,
  SPILL_Y_MAX,
  SPILL_Y_MIN,
  spillPositions,
} from '../../src/features/jar/jarPileLayout';

const EPS = 1e-6;
const ids = (min: number, max: number) =>
  fc.uniqueArray(fc.uuid(), { minLength: min, maxLength: max });

function minPairDistance(pos: readonly { x: number; y: number }[]): number {
  let best = Infinity;
  for (let i = 0; i < pos.length; i++) {
    for (let j = i + 1; j < pos.length; j++) {
      const a = pos[i]!;
      const b = pos[j]!;
      best = Math.min(best, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  return best;
}

describe('spill spacing', () => {
  it('uses 1.4 x the spilled radius as the minimum distance', () => {
    expect(SPILL_RADIUS).toBeCloseTo(27.2, 6);
    expect(SPILL_MIN_DISTANCE).toBeCloseTo(38.08, 6);
  });

  it('Validates: Requirement 13.2 (desktop, 1 to 12 spills keep the minimum distance)', () => {
    fc.assert(
      fc.property(ids(1, 12), (list) => {
        expect(minPairDistance(spillPositions(list, false))).toBeGreaterThanOrEqual(
          SPILL_MIN_DISTANCE - EPS,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('Validates: Requirement 13.2 (mobile compact, 1 to 8 spills keep the minimum distance)', () => {
    fc.assert(
      fc.property(ids(1, 8), (list) => {
        expect(minPairDistance(spillPositions(list, true))).toBeGreaterThanOrEqual(
          SPILL_MIN_DISTANCE - EPS,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('Validates: Requirement 13.2 (4 spills on mobile never stack in one spot)', () => {
    fc.assert(
      fc.property(ids(4, 4), (list) => {
        expect(minPairDistance(spillPositions(list, true))).toBeGreaterThanOrEqual(
          SPILL_MIN_DISTANCE - EPS,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('Validates: Requirement 13.2 (deterministic, prefix stable, inside the band, never throws when full)', () => {
    fc.assert(
      fc.property(ids(1, 40), fc.integer({ min: 0, max: 40 }), fc.boolean(), (list, cut, compact) => {
        const all = spillPositions(list, compact);
        expect(spillPositions(list, compact)).toEqual(all);
        const n = Math.min(cut, list.length);
        expect(spillPositions(list.slice(0, n), compact)).toEqual(all.slice(0, n));
        const xMax = compact ? SPILL_RIGHT_MAX_COMPACT : SPILL_RIGHT_MAX;
        for (const p of all) {
          expect(p.y).toBeGreaterThanOrEqual(SPILL_Y_MIN - EPS);
          expect(p.y).toBeLessThanOrEqual(SPILL_Y_MAX + EPS);
          expect(p.x).toBeGreaterThanOrEqual(SPILL_LEFT_MIN - EPS);
          expect(p.x).toBeLessThanOrEqual(xMax + EPS);
        }
      }),
      { numRuns: 100 },
    );
  });
});
