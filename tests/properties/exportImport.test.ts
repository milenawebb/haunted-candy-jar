import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Task } from '../../src/features/tasks/taskTypes';
import {
  deserializeTaskList,
  serializeTaskList,
} from '../../src/utils/exportImport';

const monsterArb = fc.constantFrom(
  'pumpkin',
  'mummy',
  'skeleton',
  'spider',
  'frankenstein',
  'vampire',
  'bat',
  'gravestone',
);

const taskArb: fc.Arbitrary<Task> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 40 }),
  title: fc
    .string({ minLength: 1, maxLength: 80 })
    .filter((s) => s.trim().length > 0),
  dueDate: fc.option(fc.integer({ min: 0, max: 4_102_444_800_000 }), {
    nil: null,
  }),
  monster: monsterArb,
  isSample: fc.boolean(),
  createdAt: fc.integer({ min: 0, max: 4_102_444_800_000 }),
  completedAt: fc.option(fc.integer({ min: 0, max: 4_102_444_800_000 }), {
    nil: null,
  }),
});

describe('exportImport', () => {
  it('Property 3: serialize then deserialize round-trips. Validates: Requirement 2.5, 16.4', () => {
    fc.assert(
      fc.property(fc.array(taskArb, { maxLength: 30 }), (tasks) => {
        expect(deserializeTaskList(serializeTaskList(tasks))).toEqual(tasks);
      }),
      { numRuns: 100 },
    );
  });

  it('throws a descriptive error on malformed JSON', () => {
    expect(() => deserializeTaskList('{not json')).toThrow(/JSON/);
  });

  it('throws a descriptive error on schema mismatch', () => {
    expect(() => deserializeTaskList('[{"id":"a"}]')).toThrow(
      /Invalid task list/,
    );
    expect(() => deserializeTaskList('{"a":1}')).toThrow(/Invalid task list/);
  });
});
