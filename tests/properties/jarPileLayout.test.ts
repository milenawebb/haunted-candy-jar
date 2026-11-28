import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  JAR_CANDY_RADIUS,
  JAR_CAPACITY,
  JAR_PACK_BOX,
  JAR_SHOULDER_Y,
} from '../../src/features/jar/jarGeometry';
import {
  NEAR_WALL_DISTANCE,
  SPILL_CENTER_X,
  SPILL_LEFT_MIN,
  SPILL_MAX_ROTATION,
  SPILL_RIGHT_MAX,
  SPILL_RIGHT_MAX_COMPACT,
  SPILL_SIZE_FACTOR,
  SPILL_Y_MAX,
  SPILL_Y_MIN,
  deskSlots,
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

const taskCount = fc.integer({ min: 0, max: 80 });
const idList = (min: number, max: number) =>
  fc.uniqueArray(fc.uuid(), { minLength: min, maxLength: max });

describe('partitionTasks', () => {
  it('keeps the oldest 40 in the jar and spills the rest', () => {
    const total = JAR_CAPACITY + 2;
    const tasks = Array.from({ length: total }, (_, i) => makeTask(i, 1000 - i));
    const { inJar, spilled } = partitionTasks(tasks);
    expect(JAR_CAPACITY).toBe(40);
    expect(inJar).toHaveLength(JAR_CAPACITY);
    expect(spilled).toHaveLength(2);
    // Highest index has the oldest createdAt in this fixture.
    expect(inJar[0]?.id).toBe(`task-${String(total - 1).padStart(4, '0')}`);
    expect(spilled.map((t) => t.id)).toEqual(['task-0001', 'task-0000']);
  });

  it('Validates: Requirement 13.2 (jar holds min(n, 40), the rest spill)', () => {
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
    expect(spillPositions([])).toEqual([]);
    expect(spillPositions(['a', 'b', 'c'])).toHaveLength(3);
  });

  it('Validates: Requirement 13.2 (deterministic per id, unaffected by later ids)', () => {
    fc.assert(
      fc.property(idList(1, 30), idList(0, 10), fc.boolean(), (ids, more, compact) => {
        const a = spillPositions(ids, compact);
        expect(spillPositions(ids, compact)).toEqual(a);
        const extended = spillPositions([...ids, ...more.filter((m) => !ids.includes(m))], compact);
        expect(extended.slice(0, ids.length)).toEqual(a);
      }),
      { numRuns: 100 },
    );
  });

  it('Validates: Requirement 13.2 (every spill sits inside the desk band, rotation <= 25 degrees)', () => {
    fc.assert(
      fc.property(idList(0, 40), fc.boolean(), (ids, compact) => {
        const xMax = compact ? SPILL_RIGHT_MAX_COMPACT : SPILL_RIGHT_MAX;
        for (const p of spillPositions(ids, compact)) {
          expect(p.y).toBeGreaterThanOrEqual(SPILL_Y_MIN);
          expect(p.y).toBeLessThanOrEqual(SPILL_Y_MAX);
          expect(p.x).toBeGreaterThanOrEqual(SPILL_LEFT_MIN);
          expect(p.x).toBeLessThanOrEqual(xMax);
          expect(Math.abs(p.rotation)).toBeLessThanOrEqual(SPILL_MAX_ROTATION);
        }
      }),
      { numRuns: 100 },
    );
  });

  // The desk is one row, so the meaningful property is where the first candies
  // go: about 75 percent right of the jar centre while slots allow (the left
  // side and the gap in front of the jar come after).
  const checkMostlyRight = (ids: string[]) => {
    const pos = spillPositions(ids.slice(0, deskSlots(false)));
    const right = pos.filter((p) => p.x > SPILL_CENTER_X).length;
    expect(right / pos.length).toBeGreaterThanOrEqual(0.6);
  };

  it('Validates: Requirement 13.2 (mostly right of the jar centre)', () => {
    fc.assert(
      fc.property(idList(20, 20), (ids) => {
        checkMostlyRight(ids);
      }),
      { numRuns: 100 },
    );
  });

  it('Validates: Requirement 13.2 (regression: seed 1078746940, mostly right)', () => {
    fc.assert(
      fc.property(idList(20, 20), (ids) => {
        checkMostlyRight(ids);
      }),
      { seed: 1078746940, numRuns: 100 },
    );
  });

  it('Validates: Requirement 13.2 (regression: shrunk counterexample ids, mostly right)', () => {
    checkMostlyRight([
      '82e17400-5dab-54a8-aec8-f443d5cd464f',
      '47faabad-6e81-2a5f-bfff-eff900000003',
      '0000009b-0000-1000-8000-000000000000',
      '00000000-5433-4416-8dea-012fc928d3ad',
      '00000000-0000-1000-8000-000000000000',
      '00000000-0000-1000-8000-000008678acf',
      '00000000-0000-1000-8000-00000000113a',
      '2d844b80-1088-2d6e-8000-0000a9b61a79',
      '00000000-0000-1000-8000-000800000000',
      '00000000-0000-1000-86ba-6a2d00000000',
      '00000000-0000-1000-8000-000025c68804',
      '00000002-0000-1000-8000-00008b476739',
      '00000000-0000-1000-8000-00005649bd8f',
      '00000000-0000-1000-8000-000000000001',
      '00000000-0000-1000-8000-000000000002',
      '00000000-0000-1000-8000-000000000003',
      '00000000-0000-1000-8000-000000000004',
      '00000000-0000-1000-8000-000000000005',
      '00000000-0000-1000-8000-000000000006',
      '00000000-0000-1000-8000-000000000007',
    ]);
  });

  it('Validates: Requirement 13.2 (compact spread is narrower than desktop)', () => {
    const ids = Array.from({ length: 30 }, (_, i) => `id-${i}`);
    const wide = Math.max(...spillPositions(ids).map((p) => p.x));
    const narrow = Math.max(...spillPositions(ids, true).map((p) => p.x));
    expect(narrow).toBeLessThanOrEqual(SPILL_RIGHT_MAX_COMPACT);
    expect(narrow).toBeLessThan(wide);
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
            expect(e.sizeFactor).toBe(1);
          } else {
            expect(e.nearWall).toBe(false);
            expect(e.sizeFactor).toBe(SPILL_SIZE_FACTOR);
          }
        }
        expect(entries.filter((e) => e.zone === 'jar').length).toBe(Math.min(n, JAR_CAPACITY));
      }),
      { numRuns: 100 },
    );
    expect(SPILL_SIZE_FACTOR).toBe(0.85);
  });

  it('Validates: Requirement 13.1 (a full jar of 40 never rises above the shoulder)', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.uuid(), { minLength: JAR_CAPACITY, maxLength: JAR_CAPACITY }), (ids) => {
        const tasks = ids.map((id, i) => ({ ...makeTask(i), id }));
        const jar = layoutPile(tasks).filter((e) => e.zone === 'jar');
        expect(jar).toHaveLength(JAR_CAPACITY);
        // Top edge of the highest candy (smallest y) must be at or below the shoulder.
        const top = Math.min(...jar.map((e) => e.y - JAR_CANDY_RADIUS));
        expect(top).toBeGreaterThanOrEqual(JAR_SHOULDER_Y);
      }),
      { numRuns: 300 },
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
