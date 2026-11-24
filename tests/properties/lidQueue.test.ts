import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  advance,
  diffLidEvents,
  enqueue,
  initialLidQueue,
  runQueue,
  type LidEvent,
} from '../../src/features/jar/lidQueue';
import type { Task } from '../../src/features/tasks/taskTypes';

function task(id: string, completedAt: number | null = null): Task {
  return {
    id,
    title: id,
    dueDate: null,
    monster: 'pumpkin',
    isSample: false,
    createdAt: 1,
    completedAt,
  };
}

const eventArb = fc.record({
  kind: fc.constantFrom('add' as const, 'remove' as const),
  id: fc.uuid(),
});

describe('lidQueue', () => {
  it('Validates: Requirement 1.7 (N queued events give N open/close pairs, in order)', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 20 }), (events) => {
        // Unique ids so a remove never cancels a queued add.
        const unique = events.map((e, i) => ({ ...e, id: `${i}-${e.id}` }));
        const trace = runQueue(unique);
        const opens = trace.filter((t) => t.phase === 'opening').map((t) => t.event);
        const closes = trace.filter((t) => t.phase === 'closing').map((t) => t.event);
        expect(opens).toEqual(unique);
        expect(closes).toEqual(unique);
        // Each event runs opening, open, closing once, one event at a time.
        const phases = trace.map((t) => t.phase);
        const expected = unique.flatMap(() => ['opening', 'open', 'closing']);
        expect(phases).toEqual(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('releases an added candy when the lid is open', () => {
    let s = enqueue(initialLidQueue, [{ kind: 'add', id: 'a' }]);
    expect(s.phase).toBe('opening');
    expect(s.waiting).toEqual(['a']);
    s = advance(s);
    expect(s.phase).toBe('open');
    expect(s.waiting).toEqual([]);
  });

  it('cancels a queued add when the candy is removed before its turn', () => {
    const s = enqueue(initialLidQueue, [
      { kind: 'add', id: 'a' },
      { kind: 'add', id: 'b' },
      { kind: 'remove', id: 'b' },
    ]);
    expect(s.pending).toEqual([]);
    expect(s.waiting).toEqual(['a']);
  });

  it('starts the next event right after the previous one closes', () => {
    let s = enqueue(initialLidQueue, [
      { kind: 'add', id: 'a' },
      { kind: 'remove', id: 'z' },
    ]);
    s = advance(advance(advance(s)));
    expect(s.phase).toBe('opening');
    expect(s.current).toEqual({ kind: 'remove', id: 'z' } satisfies LidEvent);
    s = advance(advance(advance(s)));
    expect(s.phase).toBe('idle');
  });
});

describe('diffLidEvents', () => {
  it('adds and removes are single events', () => {
    expect(diffLidEvents([], [task('a')])).toEqual([{ kind: 'add', id: 'a' }]);
    expect(diffLidEvents([task('a')], [])).toEqual([{ kind: 'remove', id: 'a' }]);
    expect(diffLidEvents([task('a')], [task('a', 5)])).toEqual([{ kind: 'remove', id: 'a' }]);
  });

  it('ignores the commit of an already completed task and undo of a completion is an add', () => {
    expect(diffLidEvents([task('a', 5)], [])).toEqual([]);
    expect(diffLidEvents([task('a', 5)], [task('a')])).toEqual([{ kind: 'add', id: 'a' }]);
  });

  it('is silent for loads, imports, and clear samples', () => {
    expect(diffLidEvents([], [task('a'), task('b')])).toEqual([]);
    expect(diffLidEvents([task('x')], [task('a'), task('b')])).toEqual([]);
    expect(diffLidEvents([task('x'), task('y')], [])).toEqual([]);
  });

  it('queues several adds into a non-empty jar', () => {
    expect(diffLidEvents([task('x')], [task('x'), task('a'), task('b')])).toHaveLength(2);
  });
});
