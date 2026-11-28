import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Task } from '../../src/features/tasks/taskTypes';
import type { PersonCandy } from '../../src/features/people/personTypes';
import type { DataV2 } from '../../src/features/jars/jarTypes';
import { DEFAULT_JAR_IDS } from '../../src/features/jars/jarTypes';
import { DataV2Schema } from '../../src/utils/dataSchema';
import { serializeTaskList } from '../../src/utils/exportImport';
import { fromImport, migrateV1, parseStored, toExport } from '../../src/utils/migrate';

const RUNS = { numRuns: 100 };
const time = fc.integer({ min: 0, max: 4_102_444_800_000 });
const coord = fc.integer({ min: -2000, max: 2000 });

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

const deskPosArb = fc.record({ x: coord, y: coord });

const taskArb: fc.Arbitrary<Task> = fc.record(
  {
    id: fc.string({ minLength: 1, maxLength: 40 }),
    title: fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0),
    dueDate: fc.option(time, { nil: null }),
    monster: monsterArb,
    isSample: fc.boolean(),
    createdAt: time,
    completedAt: fc.option(time, { nil: null }),
    deskPos: deskPosArb,
  },
  { requiredKeys: ['id', 'title', 'dueDate', 'monster', 'isSample', 'createdAt', 'completedAt'] },
);

const jarIdArb = fc.constantFrom(...Object.values(DEFAULT_JAR_IDS));
const rhythmArb = fc.record({
  n: fc.integer({ min: 1, max: 365 }),
  unit: fc.constantFrom('day' as const, 'week' as const, 'month' as const),
});

const personArb: fc.Arbitrary<PersonCandy> = fc.record(
  {
    kind: fc.constant('person' as const),
    id: fc.string({ minLength: 1, maxLength: 40 }),
    monster: monsterArb,
    createdAt: time,
    jarId: jarIdArb,
    deskPos: deskPosArb,
    isSample: fc.boolean(),
    name: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim() === s && s.length > 0),
    phone: fc.constantFrom('', '555-0142', '+1 (555) 010 0199'),
    email: fc.constantFrom('', 'mina@example.com'),
    tags: fc.uniqueArray(fc.constantFrom('a', 'b', 'club', 'work'), { maxLength: 4 }),
    notes: fc.string({ maxLength: 100 }),
    rhythm: rhythmArb,
    importantDates: fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 10 }),
        kind: fc.constantFrom('birthday' as const, 'home' as const, 'custom' as const),
        month: fc.integer({ min: 1, max: 12 }),
        day: fc.integer({ min: 1, max: 28 }),
      }),
      { maxLength: 3 },
    ),
    lastContactAt: fc.option(time, { nil: null }),
    snoozedUntil: fc.option(time, { nil: null }),
    history: fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 10 }),
        at: time,
        type: fc.constantFrom('call' as const, 'text' as const, 'email' as const, 'other' as const),
      }),
      { maxLength: 5 },
    ),
  },
  {
    requiredKeys: [
      'kind', 'id', 'monster', 'createdAt', 'jarId', 'isSample', 'name', 'phone', 'email',
      'tags', 'notes', 'rhythm', 'importantDates', 'lastContactAt', 'snoozedUntil', 'history',
    ],
  },
);

const dataArb: fc.Arbitrary<DataV2> = fc
  .tuple(
    fc.array(taskArb, { maxLength: 10 }),
    fc.array(personArb, { maxLength: 6 }),
    fc.record({ deskCap: fc.integer({ min: 1, max: 20 }), lastContactType: fc.constantFrom('call' as const, 'text' as const, 'email' as const, 'other' as const) }),
    fc.record({
      streak: fc.nat(1000),
      bestStreak: fc.nat(1000),
      lastContactDay: fc.option(fc.constantFrom('2025-10-31', '2024-02-29'), { nil: null }),
    }),
  )
  .map(([tasks, persons, settings, stats]) => ({
    version: 2 as const,
    candies: [
      ...tasks.map((t) => ({ ...t, kind: 'task' as const, jarId: DEFAULT_JAR_IDS.todos })),
      ...persons,
    ],
    jars: migrateV1([]).jars,
    settings,
    stats,
  }));

describe('migrate', () => {
  it('Property 7: migration keeps every Task, lands in To-dos, is idempotent and valid. Validates: Requirements 14.1, 14.3, 14.5, 14.6, 6.10', () => {
    fc.assert(
      fc.property(fc.array(taskArb, { maxLength: 30 }), (tasks) => {
        const data = migrateV1(tasks);
        const back = data.candies.map((c) => {
          if (c.kind !== 'task') throw new Error('expected only tasks');
          const { kind: _kind, jarId: _jarId, ...rest } = c;
          void _kind;
          void _jarId;
          return rest;
        });
        expect(back).toEqual(tasks);
        expect(data.candies.every((c) => c.jarId === 'jar-todos')).toBe(true);
        expect(migrateV1(tasks)).toEqual(data);
        expect(DataV2Schema.safeParse(data).success).toBe(true);
        expect(data.jars.map((j) => j.name)).toEqual(['Clients', 'Leads', 'Friends', 'To-dos']);
      }),
      RUNS,
    );
  });

  it('Property 7: migrateV1 does not share state between calls', () => {
    const a = migrateV1([]);
    a.jars[0]!.name = 'Changed';
    a.settings.deskCap = 9;
    const b = migrateV1([]);
    expect(b.jars[0]!.name).toBe('Clients');
    expect(b.settings.deskCap).toBe(5);
  });

  it('Property 8: import accepts v1 arrays and v2 objects. Validates: Requirements 14.2, 12.4, 12.5', () => {
    fc.assert(
      fc.property(fc.array(taskArb, { maxLength: 30 }), (tasks) => {
        expect(fromImport(serializeTaskList(tasks))).toEqual(migrateV1(tasks));
      }),
      RUNS,
    );
    fc.assert(
      fc.property(dataArb, (d) => {
        expect(fromImport(toExport(d))).toEqual(d);
        expect(parseStored(JSON.parse(toExport(d)))).toEqual({ version: 2, data: d });
      }),
      RUNS,
    );
  });

  it('Property 8: invalid input throws', () => {
    expect(() => fromImport('not json')).toThrow();
    expect(() => fromImport('{"version":3}')).toThrow();
    expect(() => fromImport('{"version":2}')).toThrow();
    expect(() => fromImport('[{"id":""}]')).toThrow();
    expect(() => fromImport('42')).toThrow();
    expect(() => parseStored(null)).toThrow();
    const bad = { ...migrateV1([]), candies: [{ ...migrateV1([{ id: 'a', title: 't', dueDate: null, monster: 'bat', isSample: false, createdAt: 1, completedAt: null }]).candies[0], jarId: 'nope' }] };
    expect(() => fromImport(JSON.stringify(bad))).toThrow();
  });
});
