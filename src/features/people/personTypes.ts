/** Pure types and input validation for Persons. No side effects, no clock. */
import type { DeskPos, MonsterKind } from '../tasks/taskTypes';

export type RhythmUnit = 'day' | 'week' | 'month';

export const RHYTHM_UNITS: readonly RhythmUnit[] = ['day', 'week', 'month'];

/** Check-in Rhythm: every `n` days, weeks, or months. */
export interface Rhythm {
  n: number;
  unit: RhythmUnit;
}

export type ImportantDateKind = 'birthday' | 'home' | 'custom';

export interface ImportantDate {
  id: string;
  kind: ImportantDateKind;
  label?: string;
  month: number; // 1 to 12
  day: number; // 1 to 31, valid for the month (Feb up to 29)
  year?: number;
}

export type ContactType = 'call' | 'text' | 'email' | 'other' | 'note';

export interface ContactEntry {
  id: string;
  at: number;
  type: ContactType;
  note?: string;
}

/** Maximum contact history entries kept per Person (enforced by the reducer). */
export const HISTORY_LIMIT = 50;

export const NAME_MAX = 80;
export const PHONE_MAX = 40;
export const EMAIL_MAX = 254;
export const TAG_MAX_LENGTH = 30;
export const TAGS_MAX = 20;
export const NOTES_MAX = 2000;
export const DATE_LABEL_MAX = 30;
export const IMPORTANT_DATES_MAX = 10;
export const ENTRY_NOTE_MAX = 500;
export const RHYTHM_MIN = 1;
export const RHYTHM_MAX = 365;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PersonCandy {
  kind: 'person';
  id: string;
  monster: MonsterKind;
  createdAt: number;
  jarId: string;
  deskPos?: DeskPos;
  isSample: boolean;
  name: string;
  phone: string;
  email: string;
  tags: string[];
  notes: string;
  rhythm: Rhythm;
  importantDates: ImportantDate[];
  lastContactAt: number | null;
  snoozedUntil: number | null;
  /** Stored oldest first, shown newest first, at most HISTORY_LIMIT. */
  history: ContactEntry[];
}

/** The editable fields of a Person, as entered in the form. */
export interface PersonInput {
  name: string;
  phone: string;
  email: string;
  tags: string[];
  notes: string;
  rhythm: Rhythm;
  importantDates: ImportantDate[];
}

export type PersonInputErrors = Partial<
  Record<'name' | 'phone' | 'email' | 'tags' | 'notes' | 'rhythm' | 'importantDates', string>
>;

export type PersonValidation =
  | { ok: true; value: PersonInput }
  | { ok: false; errors: PersonInputErrors };

/** Days in a month, allowing Feb 29 (leap day is a valid Important Date). */
export function maxDayOfMonth(month: number): number {
  if (month === 2) return 29;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

export function isValidMonthDay(month: number, day: number): boolean {
  return (
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= maxDayOfMonth(month)
  );
}

/** Trims, lowercases, drops empties, and removes case-insensitive duplicates (first wins). */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (tag.length === 0 || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

export function isValidRhythm(r: { n: unknown; unit: unknown }): boolean {
  return (
    typeof r.n === 'number' &&
    Number.isInteger(r.n) &&
    r.n >= RHYTHM_MIN &&
    r.n <= RHYTHM_MAX &&
    typeof r.unit === 'string' &&
    (RHYTHM_UNITS as readonly string[]).includes(r.unit)
  );
}

/**
 * Pure validation of the Person form fields. On success returns a normalized
 * value (trimmed name, trimmed email, normalized tags). On failure returns one
 * inline message per bad field.
 */
export function validatePersonInput(input: PersonInput): PersonValidation {
  const errors: PersonInputErrors = {};

  const name = input.name.trim();
  if (name.length === 0) errors.name = 'Every candy needs a name.';
  else if (name.length > NAME_MAX) errors.name = `Keep the name under ${NAME_MAX} characters.`;

  const phone = input.phone.trim();
  if (phone.length > PHONE_MAX) errors.phone = `Keep the phone under ${PHONE_MAX} characters.`;
  else if (phone.length > 0 && !/\d/.test(phone)) errors.phone = 'A phone needs at least one digit.';

  const email = input.email.trim();
  if (email.length > EMAIL_MAX) errors.email = 'That email is too long.';
  else if (email.length > 0 && !EMAIL_PATTERN.test(email)) errors.email = 'Try name@example.com.';

  const tags = normalizeTags(input.tags);
  if (tags.length > TAGS_MAX) errors.tags = `Up to ${TAGS_MAX} tags, please.`;
  else if (tags.some((t) => t.length > TAG_MAX_LENGTH)) {
    errors.tags = `Keep each tag under ${TAG_MAX_LENGTH} characters.`;
  }

  if (input.notes.length > NOTES_MAX) errors.notes = `Keep notes under ${NOTES_MAX} characters.`;

  if (!isValidRhythm(input.rhythm)) {
    errors.rhythm = `Pick a whole number from ${RHYTHM_MIN} to ${RHYTHM_MAX}.`;
  }

  if (input.importantDates.length > IMPORTANT_DATES_MAX) {
    errors.importantDates = `Up to ${IMPORTANT_DATES_MAX} important dates.`;
  } else if (
    input.importantDates.some(
      (d) =>
        !isValidMonthDay(d.month, d.day) ||
        (d.label !== undefined && d.label.length > DATE_LABEL_MAX) ||
        (d.year !== undefined && !Number.isInteger(d.year)),
    )
  ) {
    errors.importantDates = `Check each date (labels up to ${DATE_LABEL_MAX} characters).`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name,
      phone,
      email,
      tags,
      notes: input.notes,
      rhythm: { n: input.rhythm.n, unit: input.rhythm.unit },
      importantDates: input.importantDates,
    },
  };
}
