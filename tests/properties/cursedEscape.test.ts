import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { JAR_CAPACITY } from '../../src/features/jar/jarGeometry';
import { layoutPile, partitionTasks } from '../../src/features/jar/jarPileLayout';
import {
  advance,
  diffZoneEvents,
  enqueue,
  initialLidQueue,
  runQueue,
  type LidEvent,
  type ZoneSnapshot,
} from '../../src/features/jar/lidQueue';
import { decayFunction } from '../../src/features/tasks/decayFunction';
import type { Task } from '../../src/features/tasks/taskTypes';

/**
 * Cursed candies escape the jar onto the desk.
 * Validates: Requirement 7.9 (Cursed look) and Requirement 13.2 (jar capacity and overflow).
 * The requirements have no 7.10, so these are tagged with the closest existing ones.
 */

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

const taskArb = (i: number): fc.Arbitrary<Task> =>
  fc.record({
    id: fc.constant(`task-${String(i).padStart(4, '0')}`),
    title: fc.constant(`Task ${i}`),
    dueDate: fc.option(fc.integer({ min: -10 * DAY, max: 10 * DAY }).map((d) => NOW + d), { nil: null }),
    monster: fc.constant('pumpkin' as const),
    isSample: fc.constant(false),
    createdAt: fc.integer({ min: 0, max: 40 * DAY }).map((a) => NOW - a),
    completedAt: fc.constant(null),
  });

/** Up to `max` tasks with unique ids, a mix of Cursed and not. */
const tasksUpTo = (max: number) =>
  fc
    .integer({ min: 0, max })
    .chain((n) => fc.tuple(...Array.from({ length: n }, (_, i) => taskArb(i))));
const tasksArb = tasksUpTo(120);

const isCursed = (t: Task) => decayFunction(t, NOW) === 'Cursed';

/** A deterministic, input-order-independent shuffle key. */
const shuffleKey = (t: Task, seed: number) =>
  [...`${t.id}:${seed}`].reduce((h, c) => (h * 131 + c.charCodeAt(0)) % 1_000_003, 7);

describe('partitionTasks with Cursed candies', () => {
  it('Validates: Requirements 7.9, 13.2 (every Cursed candy is on the desk, the jar holds min(nonCursed, 40))', () => {
    fc.assert(
      fc.property(tasksArb, (tasks) => {
        const { inJar, escaped, overflow, spilled } = partitionTasks(tasks, JAR_CAPACITY, NOW);
        const cursed = tasks.filter(isCursed);
        const nonCursed = tasks.filter((t) => !isCursed(t));
        // Every Cursed candy is on the desk, none in the jar, and nothing else escapes.
        expect(new Set(escaped.map((t) => t.id))).toEqual(new Set(cursed.map((t) => t.id)));
        expect(inJar.some(isCursed)).toBe(false);
        // The jar holds min(nonCursed, capacity). Overflow only past capacity.
        expect(inJar).toHaveLength(Math.min(nonCursed.length, JAR_CAPACITY));
        expect(overflow).toHaveLength(Math.max(0, nonCursed.length - JAR_CAPACITY));
        expect(overflow.length > 0).toBe(nonCursed.length > JAR_CAPACITY);
        // Everything is placed exactly once. Escaped come first in spill order.
        expect(spilled).toEqual([...escaped, ...overflow]);
        expect(new Set([...inJar, ...spilled].map((t) => t.id)).size).toBe(tasks.length);
        expect(inJar.length + spilled.length).toBe(tasks.length);
      }),
      { numRuns: 100 },
    );
  });

  it('Validates: Requirement 13.2 (the oldest non-cursed candies stay in the jar)', () => {
    fc.assert(
      fc.property(tasksArb, (tasks) => {
        const { inJar, overflow } = partitionTasks(tasks, JAR_CAPACITY, NOW);
        const newestInJar = Math.max(-Infinity, ...inJar.map((t) => t.createdAt));
        for (const t of overflow) expect(t.createdAt).toBeGreaterThanOrEqual(newestInJar);
      }),
      { numRuns: 100 },
    );
  });

  it('Validates: Requirements 7.9, 13.2 (deterministic, whatever the input order)', () => {
    fc.assert(
      fc.property(tasksArb, fc.integer(), (tasks, seed) => {
        const shuffled = tasks.slice().sort((a, b) => shuffleKey(a, seed) - shuffleKey(b, seed));
        const reversed = tasks.slice().reverse();
        const ids = (p: ReturnType<typeof partitionTasks>) => ({
          inJar: p.inJar.map((t) => t.id),
          spilled: p.spilled.map((t) => t.id),
        });
        const base = ids(partitionTasks(tasks, JAR_CAPACITY, NOW));
        expect(ids(partitionTasks(tasks, JAR_CAPACITY, NOW))).toEqual(base);
        expect(ids(partitionTasks(shuffled, JAR_CAPACITY, NOW))).toEqual(base);
        expect(ids(partitionTasks(reversed, JAR_CAPACITY, NOW))).toEqual(base);
      }),
      { numRuns: 100 },
    );
  });

  it('Validates: Requirements 7.9, 13.2 (layoutPile puts Cursed candies on the desk, flagged as escaped)', () => {
    // Up to 60 tasks keeps the 100 runs fast (the desk scatter sweeps a grid per candy).
    fc.assert(
      fc.property(tasksUpTo(60), fc.boolean(), (tasks, compact) => {
        const entries = layoutPile(tasks, compact, NOW);
        expect(entries).toHaveLength(tasks.length);
        for (const e of entries) {
          if (isCursed(e.task)) {
            expect(e.zone).toBe('desk');
            expect(e.escaped).toBe(true);
          } else {
            expect(e.escaped).toBe(false);
          }
        }
        const nonCursed = tasks.filter((t) => !isCursed(t)).length;
        expect(entries.filter((e) => e.zone === 'jar')).toHaveLength(Math.min(nonCursed, JAR_CAPACITY));
      }),
      { numRuns: 100 },
    );
  });

  it('a saved deskPos pins an escaped candy', () => {
    const cursed: Task = {
      id: 'c',
      title: 'Old one',
      dueDate: NOW - 5 * DAY,
      monster: 'bat',
      isSample: false,
      createdAt: NOW - 9 * DAY,
      completedAt: null,
      deskPos: { x: 300, y: 690 },
    };
    const [entry] = layoutPile([cursed], false, NOW);
    expect(entry).toMatchObject({ zone: 'desk', escaped: true, x: 300, y: 690 });
  });

  it('without a clock nothing counts as Cursed', () => {
    const old: Task = {
      id: 'o',
      title: 'Ancient',
      dueDate: null,
      monster: 'bat',
      isSample: false,
      createdAt: 0,
      completedAt: null,
    };
    expect(partitionTasks([old]).inJar).toHaveLength(1);
  });
});

describe('lid queue escape events', () => {
  it('Validates: Requirement 1.7 (an escape opens the lid once and runs in order with adds and removes)', () => {
    const events: LidEvent[] = [
      { kind: 'add', id: 'a' },
      { kind: 'escape', id: 'b' },
      { kind: 'remove', id: 'c' },
    ];
    const trace = runQueue(events);
    expect(trace.filter((t) => t.phase === 'opening').map((t) => t.event)).toEqual(events);
    expect(trace.filter((t) => t.phase === 'closing').map((t) => t.event)).toEqual(events);
    expect(trace.map((t) => t.phase)).toEqual(events.flatMap(() => ['opening', 'open', 'closing']));
  });

  it('holds an escaping candy until the lid is open, then releases it', () => {
    let s = enqueue(initialLidQueue, [{ kind: 'escape', id: 'b' }]);
    expect(s.phase).toBe('opening');
    expect(s.waiting).toEqual(['b']);
    s = advance(s);
    expect(s.phase).toBe('open');
    expect(s.waiting).toEqual([]);
  });

  it('cancels a queued escape when the candy is removed before its turn', () => {
    const s = enqueue(initialLidQueue, [
      { kind: 'add', id: 'a' },
      { kind: 'escape', id: 'b' },
      { kind: 'remove', id: 'b' },
    ]);
    expect(s.pending).toEqual([]);
    expect(s.waiting).toEqual(['a']);
  });
});

describe('diffZoneEvents', () => {
  const snap = (entries: Record<string, ['jar' | 'desk', boolean]>): ZoneSnapshot =>
    new Map(Object.entries(entries).map(([id, [zone, cursed]]) => [id, { zone, cursed }]));

  it('a jar candy that is Cursed now on the desk escapes', () => {
    expect(diffZoneEvents(snap({ a: ['jar', false] }), snap({ a: ['desk', true] }))).toEqual([
      { kind: 'escape', id: 'a' },
    ]);
  });

  it('a Cursed desk candy that is not any more and is in the jar comes back as an add', () => {
    expect(diffZoneEvents(snap({ a: ['desk', true] }), snap({ a: ['jar', false] }))).toEqual([
      { kind: 'add', id: 'a' },
    ]);
  });

  it('is silent for new candies, overflow shuffles and unchanged zones', () => {
    expect(diffZoneEvents(snap({}), snap({ a: ['desk', true] }))).toEqual([]);
    // Pushed out by an import, not cursed: not an escape.
    expect(diffZoneEvents(snap({ a: ['jar', false] }), snap({ a: ['desk', false] }))).toEqual([]);
    // Overflow candy moves into the jar because room opened up: not a return.
    expect(diffZoneEvents(snap({ a: ['desk', false] }), snap({ a: ['jar', false] }))).toEqual([]);
    expect(diffZoneEvents(snap({ a: ['desk', true] }), snap({ a: ['desk', true] }))).toEqual([]);
  });
});
