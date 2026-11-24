import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  JAR_CANDY_RADIUS,
  JAR_CAPACITY,
  JAR_PACK_BOX,
} from '../../src/features/jar/jarGeometry';
import {
  NEAR_WALL_DISTANCE,
  SPILL_STEP_X,
  isNearWall,
  layoutPile,
  partitionTasks,
  spillPositions,
} from '../../src/features/jar/jarPileLayout';
import type { Task } from '../../src/features/tasks/taskTypes';

function makeTask(i: number, createdAt = i): Task {
  return {
    id: `task-${String(i).padStart(4, '0')}`,
    title: `Task ${i}`,
    dueDate: null,
    monster: 'pumpkin',
    isSample: false,
    createdAt,
    completedAt: null,
  };
}

const taskCount = fc.integer({ min: 0, max: 60 });

describe('partitionTasks', () => {
  it('keeps the oldest 24 in the jar and spills the rest', () => {
    const tasks = Array.from({ length: 26 }, (_, i) => makeTask(i, 1000 - i));
    const { inJar, spilled } = partitionTasks(tasks);
    expect(inJar).toHaveLength(JAR_CAPACITY);
    expect(spilled).toHaveLength(2);
    // Highest index has the oldest createdAt in this fixture.
    expect(inJar[0]?.id).toBe('task-0025');
    expect(spilled.map((t) => t.id)).toEqual(['task-0001', 'task-0000']);
  });

  it('Validates: Requirement 13.2 (jar holds min(n, 24), the rest spill)', () => {
    fc.assert(
      fc.property(taskCount, (n) => {
        const tasks = Array.from({ length: n }, (_, i) => makeTask(i));
        const { inJar, spilled } = partitionTasks(tasks);
        expect(inJar.length).toBe(Math.min(n, JAR_CAPACITY));
        expect(inJar.length + spilled.length).toBe(n);
        const ids = new Set([...inJar, ...spilled].map((t) => t.id));
        expect(ids.size).toBe(n);
      }),
      { numRuns: 100 },
    );
  });
});

describe('spillPositions', () => {
  it('returns one position per spilled candy', () => {
    expect(spillPositions(0)).toEqual([]);
    expect(spillPositions(9)).toHaveLength(9);
  });

  it('Validates: Requirement 13.2/13.3 (spilled candies never overlap, so each stays tappable)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 40 }), (n) => {
        const pos = spillPositions(n);
        const diameter = JAR_CANDY_RADIUS * 2;
        for (let i = 0; i < pos.length; i++) {
          const a = pos[i]!;
          expect(Math.abs(a.rotation)).toBeLessThanOrEqual(15);
          // In front of or below the jar base (base is at y 532), never inside the jar body.
          expect(a.y).toBeGreaterThan(532);
          for (let j = i + 1; j < pos.length; j++) {
            const b = pos[j]!;
            expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(diameter - 1);
          }
        }
      }),
      { numRuns: 100 },
    );
    expect(SPILL_STEP_X).toBeGreaterThanOrEqual(JAR_CANDY_RADIUS * 2);
  });
});

describe('isNearWall', () => {
  it('flags candies hugging a wall and not those in the middle', () => {
    const r = JAR_CANDY_RADIUS;
    expect(isNearWall(r, 100)).toBe(true);
    expect(isNearWall(JAR_PACK_BOX.width - r, 100)).toBe(true);
    expect(isNearWall(JAR_PACK_BOX.width / 2, JAR_PACK_BOX.height / 2)).toBe(false);
  });

  it('Validates: Requirement 13.1 (near-wall means edge within 12 units of a wall)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: JAR_PACK_BOX.width, noNaN: true }),
        fc.double({ min: 0, max: JAR_PACK_BOX.height, noNaN: true }),
        (x, y) => {
          const edgeGap = Math.min(x, JAR_PACK_BOX.width - x, JAR_PACK_BOX.height - y) - JAR_CANDY_RADIUS;
          expect(isNearWall(x, y)).toBe(edgeGap <= NEAR_WALL_DISTANCE);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('layoutPile', () => {
  it('Validates: Requirement 13.1 (in-jar candies stay inside the pack box, desk candies do not)', () => {
    fc.assert(
      fc.property(taskCount, (n) => {
        const tasks = Array.from({ length: n }, (_, i) => makeTask(i));
        const entries = layoutPile(tasks);
        expect(entries).toHaveLength(n);
        for (const e of entries) {
          if (e.zone === 'jar') {
            expect(e.x).toBeGreaterThanOrEqual(JAR_PACK_BOX.x);
            expect(e.x).toBeLessThanOrEqual(JAR_PACK_BOX.x + JAR_PACK_BOX.width);
            expect(e.y).toBeGreaterThanOrEqual(JAR_PACK_BOX.y);
            expect(e.y).toBeLessThanOrEqual(JAR_PACK_BOX.y + JAR_PACK_BOX.height);
          } else {
            expect(e.nearWall).toBe(false);
          }
        }
        expect(entries.filter((e) => e.zone === 'jar').length).toBe(Math.min(n, JAR_CAPACITY));
      }),
      { numRuns: 100 },
    );
  });

  it('is independent of input order', () => {
    const tasks = Array.from({ length: 10 }, (_, i) => makeTask(i));
    const a = layoutPile(tasks);
    const b = layoutPile(tasks.slice().reverse());
    const byId = (es: typeof a) => new Map(es.map((e) => [e.task.id, [e.x, e.y, e.rotation]]));
    expect(byId(b)).toEqual(byId(a));
  });
});
