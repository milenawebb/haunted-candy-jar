import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildDemoTasks } from '../../src/dev/demoSeed';
import {
  JAR_CANDY_RADIUS,
  JAR_CAPACITY,
  JAR_EDGE_INSET,
  JAR_GLASS_MARGIN,
  JAR_INSIDE_CORNER_RADIUS,
  JAR_INSIDE_FLOOR,
  JAR_INSIDE_LEFT,
  JAR_INSIDE_RIGHT,
  JAR_PACK_BOX,
  JAR_REST_OVERLAP,
  JAR_SHOULDER_Y,
  JAR_VISUAL_RADIUS,
  insideGlass,
} from '../../src/features/jar/jarGeometry';
import { layoutPile } from '../../src/features/jar/jarPileLayout';
import type { Task } from '../../src/features/tasks/taskTypes';

const TOLERANCE = 0.75;

function taskWithId(id: string): Task {
  return {
    id,
    title: id,
    dueDate: null,
    monster: 'pumpkin',
    isSample: false,
    createdAt: 0,
    completedAt: null,
  };
}

describe('insideGlass', () => {
  // Validates: Requirement 13.1
  it('uses the packing radius 32, a visual radius of at least 32, and a positive margin', () => {
    expect(JAR_CANDY_RADIUS).toBe(32);
    expect(JAR_VISUAL_RADIUS).toBeGreaterThanOrEqual(JAR_CANDY_RADIUS);
    expect(JAR_GLASS_MARGIN).toBeGreaterThan(0);
  });

  // Validates: Requirement 13.1
  it('accepts a circle in the middle and rejects ones that touch a wall or the floor', () => {
    const r = JAR_VISUAL_RADIUS + JAR_GLASS_MARGIN;
    expect(insideGlass(200, 400)).toBe(true);
    expect(insideGlass(JAR_INSIDE_LEFT + r, 400)).toBe(true);
    expect(insideGlass(JAR_INSIDE_LEFT + r - 0.5, 400)).toBe(false);
    expect(insideGlass(JAR_INSIDE_RIGHT - r, 400)).toBe(true);
    expect(insideGlass(JAR_INSIDE_RIGHT - r + 0.5, 400)).toBe(false);
    expect(insideGlass(200, JAR_INSIDE_FLOOR - r)).toBe(true);
    expect(insideGlass(200, JAR_INSIDE_FLOOR - r + 0.5)).toBe(false);
  });

  // Validates: Requirement 13.1
  it('rejects a circle that fits the straight walls but pokes out of a rounded bottom corner', () => {
    // A small circle tucked into the corner: wall and floor distances pass,
    // the corner arc (radius 28) does not.
    const rv = 10;
    const m = 0;
    const x = JAR_INSIDE_LEFT + rv;
    const y = JAR_INSIDE_FLOOR - rv;
    expect(x - rv).toBeGreaterThanOrEqual(JAR_INSIDE_LEFT);
    expect(insideGlass(x, y, rv, m)).toBe(false);
    // Pushed along the arc so it just touches it from inside.
    const cx = JAR_INSIDE_LEFT + JAR_INSIDE_CORNER_RADIUS;
    const cy = JAR_INSIDE_FLOOR - JAR_INSIDE_CORNER_RADIUS;
    const d = JAR_INSIDE_CORNER_RADIUS - rv;
    const k = Math.SQRT1_2;
    expect(insideGlass(cx - d * k, cy + d * k, rv, m)).toBe(true);
    expect(insideGlass(cx - (d + 0.5) * k, cy + (d + 0.5) * k, rv, m)).toBe(false);
  });
});

describe('jar pile stays inside the glass', () => {
  // Validates: Requirement 13.1
  it('keeps every in-jar visual circle inside the glass, resting on the floor or a neighbour, below the shoulder', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: JAR_CAPACITY }), (ids) => {
        const entries = layoutPile(ids.map(taskWithId)).filter((e) => e.zone === 'jar');
        expect(entries).toHaveLength(ids.length);
        const floorY = JAR_PACK_BOX.y + JAR_PACK_BOX.height - JAR_CANDY_RADIUS - JAR_EDGE_INSET;
        const restDist = 2 * JAR_CANDY_RADIUS * (1 - JAR_REST_OVERLAP / 2);
        entries.forEach((e, i) => {
          expect(insideGlass(e.x, e.y)).toBe(true);
          expect(Math.abs(e.rotation)).toBeLessThanOrEqual(15);
          expect(e.y - JAR_CANDY_RADIUS).toBeGreaterThanOrEqual(JAR_SHOULDER_Y);
          const onFloor = Math.abs(e.y - floorY) <= TOLERANCE;
          const supported = entries.some((q, j) => {
            if (i === j || q.y <= e.y) return false;
            const d = Math.hypot(e.x - q.x, e.y - q.y);
            return d <= restDist + TOLERANCE && d >= 2 * JAR_CANDY_RADIUS * 0.85 - 1e-6;
          });
          expect(onFloor || supported).toBe(true);
        });
      }),
      { numRuns: 150 },
    );
  });

  // Validates: Requirement 13.1
  it('puts every in-jar candy of the ?demo=45 seed inside the glass (desktop and compact)', () => {
    const tasks = buildDemoTasks(45, Date.UTC(2025, 9, 31, 12));
    for (const compact of [false, true]) {
      const jar = layoutPile(tasks, compact, Date.UTC(2025, 9, 31, 12)).filter((e) => e.zone === 'jar');
      expect(jar.length).toBeGreaterThan(0);
      for (const e of jar) {
        expect(insideGlass(e.x, e.y)).toBe(true);
      }
    }
  });
});
