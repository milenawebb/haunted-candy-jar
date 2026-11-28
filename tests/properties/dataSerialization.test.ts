import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { DataV2 } from '../../src/features/jars/jarTypes';
import type { Candy } from '../../src/features/candy/candyTypes';
import type {
  ContactEntry,
  ImportantDate,
  PersonCandy,
} from '../../src/features/people/personTypes';
import { DataV2Schema } from '../../src/utils/dataSchema';

const TIME = { min: 0, max: 4_102_444_800_000 };
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
const idArb = fc.string({ minLength: 1, maxLength: 20 });
const rhythmArb = fc.record({
  n: fc.integer({ min: 1, max: 365 }),
  unit: fc.constantFrom('day' as const, 'week' as const, 'month' as const),
});
const trimmedArb = (max: number) =>
  fc
    .string({ minLength: 1, maxLength: max })
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

const dateArb: fc.Arbitrary<ImportantDate> = fc
  .record(
    {
      id: idArb,
      kind: fc.constantFrom('birthday' as const, 'home' as const, 'custom' as const),
      label: fc.string({ maxLength: 30 }),
      month: fc.integer({ min: 1, max: 12 }),
      day: fc.integer({ min: 1, max: 31 }),
      year: fc.integer({ min: 1900, max: 2100 }),
    },
    { requiredKeys: ['id', 'kind', 'month', 'day'] },
  )
  .map((d) => ({ ...d, day: Math.min(d.day, d.month === 2 ? 29 : [4, 6, 9, 11].includes(d.month) ? 30 : 31) }));

const entryArb: fc.Arbitrary<ContactEntry> = fc.record(
  {
    id: idArb,
    at: fc.integer(TIME),
    type: fc.constantFrom('call' as const, 'text' as const, 'email' as const, 'other' as const, 'note' as const),
    note: fc.string({ maxLength: 500 }),
  },
  { requiredKeys: ['id', 'at', 'type'] },
);

const JAR_IDS = ['jar-clients', 'jar-leads', 'jar-friends', 'jar-todos'];
const jarIdArb = fc.constantFrom(...JAR_IDS);
const deskPosArb = fc.record({
  // Integers: JSON turns -0 into 0, which is not a schema concern.
  x: fc.integer({ min: -1000, max: 1000 }),
  y: fc.integer({ min: -1000, max: 1000 }),
});

const personArb: fc.Arbitrary<PersonCandy> = fc.record(
  {
    kind: fc.constant('person' as const),
    id: idArb,
    monster: monsterArb,
    createdAt: fc.integer(TIME),
    jarId: jarIdArb,
    deskPos: deskPosArb,
    isSample: fc.boolean(),
    name: trimmedArb(80),
    phone: fc.constantFrom('', '555-0142', '+1 (555) 010-9999'),
    email: fc.constantFrom('', 'mina@example.com', 'a.b@c.io'),
    tags: fc.uniqueArray(fc.stringMatching(/^[a-z]{1,10}$/), { maxLength: 20 }),
    notes: fc.string({ maxLength: 200 }),
    rhythm: rhythmArb,
    importantDates: fc.array(dateArb, { maxLength: 10 }),
    lastContactAt: fc.option(fc.integer(TIME), { nil: null }),
    snoozedUntil: fc.option(fc.integer(TIME), { nil: null }),
    history: fc.array(entryArb, { maxLength: 50 }),
  },
  { requiredKeys: ['kind', 'id', 'monster', 'createdAt', 'jarId', 'isSample', 'name', 'phone', 'email', 'tags', 'notes', 'rhythm', 'importantDates', 'lastContactAt', 'snoozedUntil', 'history'] },
);

const taskArb: fc.Arbitrary<Candy> = fc.record(
  {
    kind: fc.constant('task' as const),
    id: idArb,
    title: trimmedArb(80),
    dueDate: fc.option(fc.integer(TIME), { nil: null }),
    monster: monsterArb,
    isSample: fc.boolean(),
    createdAt: fc.integer(TIME),
    completedAt: fc.option(fc.integer(TIME), { nil: null }),
    jarId: jarIdArb,
    deskPos: deskPosArb,
  },
  { requiredKeys: ['kind', 'id', 'title', 'dueDate', 'monster', 'isSample', 'createdAt', 'completedAt', 'jarId'] },
);

const jarsArb = fc.constant(
  JAR_IDS.map((id, order) => ({
    id,
    name: id.replace('jar-', ''),
    defaultRhythm: order === 3 ? null : { n: 30, unit: 'day' as const },
    order,
  })),
);

const dataArb: fc.Arbitrary<DataV2> = fc.record({
  version: fc.constant(2 as const),
  candies: fc.array(fc.oneof(personArb, taskArb), { maxLength: 12 }),
  jars: jarsArb,
  settings: fc.record({
    deskCap: fc.integer({ min: 1, max: 20 }),
    lastContactType: fc.constantFrom('call' as const, 'text' as const, 'email' as const, 'other' as const),
  }),
  stats: fc.record({
    streak: fc.nat({ max: 1000 }),
    bestStreak: fc.nat({ max: 1000 }),
    lastContactDay: fc.option(
      fc
        .tuple(fc.integer({ min: 2000, max: 2099 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }))
        .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`),
      { nil: null },
    ),
  }),
});

describe('Property 21: Serialization round trip', () => {
  it('JSON round trip passes DataV2Schema and equals the original. Validates: Requirements 12.4, 14.6', () => {
    fc.assert(
      fc.property(dataArb, (d) => {
        const parsed: unknown = JSON.parse(JSON.stringify(d));
        const res = DataV2Schema.safeParse(parsed);
        expect(res.success).toBe(true);
        expect(parsed).toEqual(d);
        if (res.success) expect(res.data).toEqual(d);
      }),
      { numRuns: 150 },
    );
  });

  it('rejects a candy that points at a missing jar and more than 50 history entries. Validates: Requirements 12.4, 14.6', () => {
    const [d] = fc.sample(
      dataArb.filter((x) => x.candies.length > 0),
      1,
    );
    const [person] = fc.sample(personArb, 1);
    if (!d || !person) throw new Error('no sample');
    const bad = { ...d, candies: [{ ...person, jarId: 'jar-missing' }] };
    expect(DataV2Schema.safeParse(bad).success).toBe(false);

    const entry: ContactEntry = { id: 'e', at: 1, type: 'call' };
    const tooMany = {
      ...d,
      candies: [{ ...person, jarId: 'jar-clients', history: Array.from({ length: 51 }, () => entry) }],
    };
    expect(DataV2Schema.safeParse(tooMany).success).toBe(false);
  });
});
