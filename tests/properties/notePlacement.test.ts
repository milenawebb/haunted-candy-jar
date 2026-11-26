import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  DESK_NOTE_RIGHT,
  DESK_NOTE_RIGHT_COMPACT,
  NOTE_HALF_HEIGHT,
  NOTE_HALF_WIDTH,
  NOTE_LIFT_SCALE,
  NOTE_MARGIN,
  NOTE_STRIP_WIDTH,
  noteOffset,
  noteRestY,
} from '../../src/features/candy/notePlacement';
import { DEFAULT_CANDY_SIZE, LIFT_SCALE } from '../../src/features/candy/CandyItem';
import { JAR_PACK_BOX, JAR_SHOULDER_Y, JAR_VIEWBOX_WIDTH } from '../../src/features/jar/jarGeometry';
import { deskBandBounds } from '../../src/features/jar/jarPileLayout';

const EPS = 1e-9;
const HALF = DEFAULT_CANDY_SIZE / 2;
const jarX = fc.double({ min: JAR_PACK_BOX.x, max: JAR_PACK_BOX.x + JAR_PACK_BOX.width, noNaN: true });
const jarY = fc.double({ min: JAR_PACK_BOX.y, max: JAR_PACK_BOX.y + JAR_PACK_BOX.height, noNaN: true });
const opts = { numRuns: 200 };

describe('noteOffset', () => {
  // Validates: Requirement 3.8
  it('keeps the lift scale in sync with CandyItem', () => {
    expect(NOTE_LIFT_SCALE).toBe(LIFT_SCALE);
  });

  // Validates: Requirement 3.8
  it('in-jar note lies inside the inner walls with margin and below the shoulder', () => {
    fc.assert(
      fc.property(jarX, jarY, (x, y) => {
        const { dx, dy } = noteOffset(x, y, 'jar', false, false, HALF);
        const cx = x + dx;
        const cy = y + noteRestY(HALF) + dy;
        expect(cx - NOTE_HALF_WIDTH).toBeGreaterThanOrEqual(JAR_PACK_BOX.x + NOTE_MARGIN - EPS);
        expect(cx + NOTE_HALF_WIDTH).toBeLessThanOrEqual(JAR_PACK_BOX.x + JAR_PACK_BOX.width - NOTE_MARGIN + EPS);
        expect(cy - NOTE_HALF_HEIGHT).toBeGreaterThanOrEqual(JAR_SHOULDER_Y - EPS);
        expect(dy).toBeGreaterThanOrEqual(0);
      }),
      opts,
    );
  });

  // Validates: Requirement 3.8
  it('tail stays on the strip and is as close to the candy x as possible', () => {
    fc.assert(
      fc.property(jarX, jarY, fc.constantFrom<'jar' | 'desk'>('jar', 'desk'), fc.boolean(), fc.boolean(), (x, y, zone, compact, sel) => {
        const { dx, tailX } = noteOffset(x, y, zone, compact, sel, HALF);
        const limit = NOTE_STRIP_WIDTH / 2;
        expect(Math.abs(tailX)).toBeLessThanOrEqual(limit);
        // Candy x in strip coordinates is -dx; the tail is the nearest on-strip point.
        const nearest = Math.min(limit - 16, Math.max(-(limit - 16), -dx));
        expect(tailX).toBeCloseTo(nearest, 9);
      }),
      opts,
    );
  });

  // Validates: Requirement 3.8
  it('desk notes stay inside the desk range for desktop and compact', () => {
    for (const compact of [false, true]) {
      const b = deskBandBounds(compact);
      const right = compact ? DESK_NOTE_RIGHT_COMPACT : DESK_NOTE_RIGHT;
      expect(right).toBeGreaterThanOrEqual(b.xMax);
      for (const selected of [false, true]) {
        const s = selected ? LIFT_SCALE : 1;
        fc.assert(
          fc.property(
            fc.double({ min: b.xMin, max: b.xMax, noNaN: true }),
            fc.double({ min: b.yMin, max: b.yMax, noNaN: true }),
            (x, y) => {
              const { dx, dy } = noteOffset(x, y, 'desk', compact, selected, HALF);
              const cx = x + dx * s;
              expect(cx - NOTE_HALF_WIDTH * s).toBeGreaterThanOrEqual(-EPS);
              expect(cx + NOTE_HALF_WIDTH * s).toBeLessThanOrEqual(right + EPS);
              expect(dy).toBe(0);
            },
          ),
          opts,
        );
      }
    }
  });

  // Validates: Requirement 3.8
  it('lifted jar candy note stays inside the viewBox', () => {
    fc.assert(
      fc.property(jarX, jarY, (x, y) => {
        const { dx, dy } = noteOffset(x, y, 'jar', false, true, HALF);
        const cx = x + dx * NOTE_LIFT_SCALE;
        expect(cx - NOTE_HALF_WIDTH * NOTE_LIFT_SCALE).toBeGreaterThanOrEqual(-EPS);
        expect(cx + NOTE_HALF_WIDTH * NOTE_LIFT_SCALE).toBeLessThanOrEqual(JAR_VIEWBOX_WIDTH + EPS);
        expect(dy).toBe(0);
      }),
      opts,
    );
  });

  // Validates: Requirement 3.8
  it('a candy in the middle gets no horizontal shift', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 130, max: 270, noNaN: true }),
        fc.double({ min: 300, max: 600, noNaN: true }),
        (x, y) => {
          const { dx, dy, tailX } = noteOffset(x, y, 'jar', false, false, HALF);
          expect(dx).toBe(0);
          expect(dy).toBe(0);
          expect(tailX).toBeCloseTo(0, 9);
        },
      ),
      opts,
    );
  });
});
