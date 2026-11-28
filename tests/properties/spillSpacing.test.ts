import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  SPILL_LEFT_MAX,
  SPILL_LEFT_MIN,
  SPILL_MIN_DISTANCE,
  SPILL_RADIUS,
  SPILL_RIGHT_MAX,
  SPILL_RIGHT_MAX_COMPACT,
  SPILL_RIGHT_MIN,
  SPILL_RIGHT_MIN_COMPACT,
  SPILL_Y_MAX,
  SPILL_Y_MIN,
  deskSlotPositions,
  deskSlots,
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
  it('uses the full spilled candy width (2 x radius) as the minimum distance', () => {
    expect(SPILL_RADIUS).toBeCloseTo(27.2, 6);
    expect(SPILL_MIN_DISTANCE).toBeCloseTo(54.4, 6);
  });

  it('Validates: Requirement 13.2 (deskSlots counts the non-overlapping desk slots: 9 desktop, 7 compact)', () => {
    expect(deskSlots(false)).toBe(9);
    expect(deskSlots(true)).toBe(7);
    expect(deskSlots()).toBe(deskSlots(false));
  });

  for (const compact of [false, true]) {
    const label = compact ? 'compact' : 'desktop';
    const xMax = compact ? SPILL_RIGHT_MAX_COMPACT : SPILL_RIGHT_MAX;

    it(`Validates: Requirement 13.2 (${label}, the slots are apart, in the band, and the band holds no more)`, () => {
      const slots = deskSlotPositions(compact);
      expect(slots).toHaveLength(deskSlots(compact));
      expect(minPairDistance(slots)).toBeGreaterThanOrEqual(SPILL_MIN_DISTANCE - EPS);
      for (const s of slots) {
        expect(s.x).toBeGreaterThanOrEqual(SPILL_LEFT_MIN - EPS);
        expect(s.x).toBeLessThanOrEqual(xMax + EPS);
        expect(s.y).toBeGreaterThanOrEqual(SPILL_Y_MIN);
        expect(s.y).toBeLessThanOrEqual(SPILL_Y_MAX);
      }
      // The row cannot take one more: no 2 unit grid point of the band is free of every slot.
      let free = 0;
      for (let x = SPILL_LEFT_MIN; x <= xMax; x += 2) {
        for (let y = SPILL_Y_MIN; y <= SPILL_Y_MAX; y += 2) {
          if (Math.min(...slots.map((s) => Math.hypot(s.x - x, s.y - y))) >= SPILL_MIN_DISTANCE - EPS) free++;
        }
      }
      expect(free).toBe(0);
    });

    it(`Validates: Requirement 13.2 (${label}, 1 to deskSlots candies never overlap, stay in the band, and keep their prefix)`, () => {
      const n = deskSlots(compact);
      fc.assert(
        fc.property(ids(n, n), fc.integer({ min: 1, max: n }), (list, count) => {
          const all = spillPositions(list, compact);
          expect(spillPositions(list, compact)).toEqual(all);
          const part = spillPositions(list.slice(0, count), compact);
          expect(part).toEqual(all.slice(0, count));
          expect(minPairDistance(part)).toBeGreaterThanOrEqual(SPILL_MIN_DISTANCE - EPS);
          for (const p of part) {
            expect(p.y).toBeGreaterThanOrEqual(SPILL_Y_MIN - EPS);
            expect(p.y).toBeLessThanOrEqual(SPILL_Y_MAX + EPS);
            expect(p.x).toBeGreaterThanOrEqual(SPILL_LEFT_MIN - EPS);
            expect(p.x).toBeLessThanOrEqual(xMax + EPS);
          }
        }),
        { numRuns: 100 },
      );
    });
  }

  it('Validates: Requirement 13.2 (right of the jar first, then the left, the gap in front of the jar last)', () => {
    for (const compact of [false, true]) {
      const rightMin = compact ? SPILL_RIGHT_MIN_COMPACT : SPILL_RIGHT_MIN;
      const side = (x: number) => (x >= rightMin ? 'right' : x <= SPILL_LEFT_MAX ? 'left' : 'gap');
      const kinds = deskSlotPositions(compact).map((s) => side(s.x));
      // Every fourth candy goes left while the left has room, so 75 percent right.
      expect(kinds.slice(0, 3)).toEqual(['right', 'right', 'right']);
      expect(kinds[3]).toBe('left');
      // The gap in front of the jar is used only after every right and left slot.
      const firstGap = kinds.indexOf('gap');
      expect(firstGap).toBeGreaterThan(-1);
      expect(kinds.slice(firstGap).every((k) => k === 'gap')).toBe(true);
    }
  });

  it('Validates: Requirement 13.2 (pins are occupied, others keep clear of them)', () => {
    fc.assert(
      fc.property(ids(4, 4), fc.boolean(), (list, compact) => {
        const pin = { x: 300, y: SPILL_Y_MAX };
        const out = spillPositions(list, compact, [pin, undefined, undefined, undefined]);
        expect(out[0]).toMatchObject(pin);
        expect(minPairDistance(out)).toBeGreaterThanOrEqual(SPILL_MIN_DISTANCE - EPS);
      }),
      { numRuns: 100 },
    );
  });

  it('Validates: Requirement 13.2 (beyond deskSlots the layout never throws and stays in the band)', () => {
    fc.assert(
      fc.property(ids(1, 40), fc.boolean(), (list, compact) => {
        const xMax = compact ? SPILL_RIGHT_MAX_COMPACT : SPILL_RIGHT_MAX;
        const all = spillPositions(list, compact);
        expect(all).toHaveLength(list.length);
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
