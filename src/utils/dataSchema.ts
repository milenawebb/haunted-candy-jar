/** Pure Zod schemas for the version 2 data document (candies, jars, settings, stats). */
import { z } from 'zod';
import { MonsterKindSchema, TaskSchema } from './taskSchema';
import {
  DATE_LABEL_MAX,
  EMAIL_MAX,
  EMAIL_PATTERN,
  ENTRY_NOTE_MAX,
  HISTORY_LIMIT,
  IMPORTANT_DATES_MAX,
  NAME_MAX,
  NOTES_MAX,
  PHONE_MAX,
  RHYTHM_MAX,
  RHYTHM_MIN,
  TAGS_MAX,
  TAG_MAX_LENGTH,
  isValidMonthDay,
} from '../features/people/personTypes';

export const RhythmSchema = z.object({
  n: z.number().int().min(RHYTHM_MIN).max(RHYTHM_MAX),
  unit: z.enum(['day', 'week', 'month']),
});

export const ImportantDateSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(['birthday', 'home', 'custom']),
    label: z.string().max(DATE_LABEL_MAX).optional(),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    year: z.number().int().optional(),
  })
  .refine((d) => isValidMonthDay(d.month, d.day), {
    message: 'day is not valid for the month',
    path: ['day'],
  });

export const ContactEntrySchema = z.object({
  id: z.string().min(1),
  at: z.number().finite(),
  type: z.enum(['call', 'text', 'email', 'other', 'note']),
  note: z.string().max(ENTRY_NOTE_MAX).optional(),
});

const TagSchema = z
  .string()
  .min(1)
  .max(TAG_MAX_LENGTH)
  .refine((t) => t === t.toLowerCase(), { message: 'tags must be lowercase' });

/** The editable Person fields (also used by the import rows and the forms). */
export const PersonFieldsSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX),
  phone: z
    .string()
    .max(PHONE_MAX)
    .refine((p) => p === '' || /\d/.test(p), { message: 'phone needs a digit' }),
  email: z
    .string()
    .max(EMAIL_MAX)
    .refine((e) => e === '' || EMAIL_PATTERN.test(e), { message: 'email is not valid' }),
  tags: z
    .array(TagSchema)
    .max(TAGS_MAX)
    .refine((tags) => new Set(tags).size === tags.length, { message: 'tags must be unique' }),
  notes: z.string().max(NOTES_MAX),
  rhythm: RhythmSchema,
  importantDates: z.array(ImportantDateSchema).max(IMPORTANT_DATES_MAX),
});

export const TaskCandySchema = TaskSchema.extend({
  kind: z.literal('task'),
  jarId: z.string().min(1),
});

export const PersonCandySchema = PersonFieldsSchema.extend({
  kind: z.literal('person'),
  id: z.string().min(1),
  monster: MonsterKindSchema,
  createdAt: z.number().finite(),
  jarId: z.string().min(1),
  deskPos: z.object({ x: z.number().finite(), y: z.number().finite() }).optional(),
  isSample: z.boolean(),
  lastContactAt: z.number().finite().nullable(),
  snoozedUntil: z.number().finite().nullable(),
  history: z.array(ContactEntrySchema).max(HISTORY_LIMIT),
});

export const CandySchema = z.discriminatedUnion('kind', [TaskCandySchema, PersonCandySchema]);

export const JarSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(30),
  defaultRhythm: RhythmSchema.nullable(),
  order: z.number().int(),
  monster: MonsterKindSchema.optional(),
});

export const SettingsSchema = z.object({
  deskCap: z.number().int().min(1).max(20),
  lastContactType: z.enum(['call', 'text', 'email', 'other']),
});

export const StatsSchema = z.object({
  streak: z.number().int().min(0),
  bestStreak: z.number().int().min(0),
  lastContactDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export const DataV2Schema = z
  .object({
    version: z.literal(2),
    candies: z.array(CandySchema),
    jars: z.array(JarSchema),
    settings: SettingsSchema,
    stats: StatsSchema,
  })
  .superRefine((data, ctx) => {
    const ids = new Set(data.jars.map((j) => j.id));
    if (ids.size !== data.jars.length) {
      ctx.addIssue({ code: 'custom', message: 'jar ids must be unique', path: ['jars'] });
    }
    data.candies.forEach((c, i) => {
      if (!ids.has(c.jarId)) {
        ctx.addIssue({
          code: 'custom',
          message: 'candy points at a jar that does not exist',
          path: ['candies', i, 'jarId'],
        });
      }
    });
  });
