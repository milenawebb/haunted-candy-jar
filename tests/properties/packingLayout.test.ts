import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computePacking, packingRadius } from '../../src/utils/packingLayout';
const idsArb = fc.uniqueArray(fc.uuid(), { minLength: 0, maxLength: 30 });
const dimArb = fc.integer({ min: 200, max: 700 });
/** Max overlap between neighbours, as a fraction of the radius. */
const MAX_OVERLAP = 0.15;
const TOLERANCE = 0.75;
describe('packingLayout', () => {
  // Validates: Requirement 13.1
  it('is deterministic and order independent per id', () => {
    fc.assert(
      fc.property(idsArb, dimArb, dimArb, fc.nat(), (ids, w, h, k) => {
        const rev = [...ids].reverse();
        const cut = ids.length ? k % ids.length : 0;
        const shuffled = [...rev.slice(cut), ...rev.slice(0, cut)];
        const a = computePacking(ids, w, h);
        const b = computePacking(shuffled, w, h);
        expect(computePacking(ids, w, h)).toEqual(a);
        ids.forEach((id, i) => {
          expect(b[shuffled.indexOf(id)]).toEqual(a[i]);
        });
      }),
      { numRuns: 100 },
    );
  });
  // Validates: Requirement 13.1
  it('returns one position per id, rotation within +/-15, inside bounds', () => {
    fc.assert(
      fc.property(idsArb, dimArb, dimArb, (ids, w, h) => {
        const out = computePacking(ids, w, h);
        expect(out).toHaveLength(ids.length);
        for (const p of out) {
          expect(Math.abs(p.rotation)).toBeLessThanOrEqual(15);
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(w);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(h);
        }
      }),
      { numRuns: 100 },
    );
  });
  // Validates: Requirement 13.1
  it('keeps a candy rotation when other candies change', () => {
    fc.assert(
      fc.property(idsArb, fc.uuid(), (ids, extra) => {
        fc.pre(ids.length > 0 && !ids.includes(extra));
        const a = computePacking(ids, 400, 500);
        const b = computePacking([...ids, extra], 400, 500);
        expect(b[0]?.rotation).toBe(a[0]?.rotation);
      }),
      { numRuns: 100 },
    );
  });
  // Validates: Requirement 13.1
  it('fits 24 candies inside the jar with at most 15% overlap', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.uuid(), { minLength: 24, maxLength: 24 }), (ids) => {
        const w = 360;
        const h = 480;
        const radius = packingRadius(w, h);
        const out = computePacking(ids, w, h);
        for (const p of out) {
          expect(p.x).toBeGreaterThanOrEqual(radius - 1e-6);
          expect(p.x).toBeLessThanOrEqual(w - radius + 1e-6);
          expect(p.y).toBeGreaterThanOrEqual(radius - 1e-6);
          expect(p.y).toBeLessThanOrEqual(h - radius + 1e-6);
        }
        for (let i = 0; i < out.length; i++) {
          for (let j = i + 1; j < out.length; j++) {
            const a = out[i];
            const b = out[j];
            if (!a || !b) continue;
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            expect(d).toBeGreaterThanOrEqual(2 * radius - MAX_OVERLAP * radius - 1e-6);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
  // Validates: Requirement 13.1
  it('settles into a pile: every candy rests on the floor or on a neighbour below it', () => {
    const boxes: Array<[number, number]> = [
      [320, 420],
      [360, 480],
      [300, 500],
    ];
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 24 }),
        fc.constantFrom(...boxes),
        (ids, [w, h]) => {
          const r = packingRadius(w, h);
          const out = computePacking(ids, w, h);
          const floorY = h - r;
          out.forEach((p, i) => {
            const onFloor = Math.abs(p.y - floorY) <= TOLERANCE;
            const supported = out.some((q, j) => {
              if (i === j || q.y <= p.y) return false;
              const d = Math.hypot(p.x - q.x, p.y - q.y);
              return d <= 2 * r + TOLERANCE && d >= 2 * r - MAX_OVERLAP * r - 1e-6;
            });
            expect(onFloor || supported).toBe(true);
          });
        },
      ),
      { numRuns: 100 },
    );
  });
  // Validates: Requirement 13.1
  it('fills from the floor up: no candy sits above an unfilled floor gap it fits into', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.uuid(), { minLength: 12, maxLength: 24 }), (ids) => {
        const w = 320;
        const h = 420;
        const r = packingRadius(w, h);
        const out = computePacking(ids, w, h);
        const floorCount = out.filter((p) => Math.abs(p.y - (h - r)) <= TOLERANCE).length;
        // A 320 wide floor holds about 5 candies, and 12 or more candies must fill it first.
        expect(floorCount).toBeGreaterThanOrEqual(4);
      }),
      { numRuns: 100 },
    );
  });
});
