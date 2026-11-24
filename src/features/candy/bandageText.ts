/** Pure helpers for BandageNote. No side effects, no DOM access. */

export const BANDAGE_TITLE_MAX = 18;
const ELLIPSIS = '\u2026';

/**
 * Shortens a title to at most `max` characters, ellipsis included.
 * Titles that already fit are returned unchanged. Counts code points so an
 * emoji is never cut in half.
 * Validates: Requirement 3.8
 */
export function truncateTitle(title: string, max: number = BANDAGE_TITLE_MAX): string {
  const chars = Array.from(title);
  if (chars.length <= max) return title;
  if (max <= 0) return '';
  if (max === 1) return ELLIPSIS;
  return chars.slice(0, max - 1).join('').trimEnd() + ELLIPSIS;
}

/** FNV-1a 32-bit hash. */
function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Tilt in degrees for a note: magnitude in [2, 4], sign taken from the id
 * hash. Deterministic for a given id.
 * Validates: Requirement 3.8
 */
export function tiltForId(id: string): number {
  const h = hashId(id);
  const magnitude = 2 + ((h >>> 1) % 1001) / 500;
  return h & 1 ? magnitude : -magnitude;
}
