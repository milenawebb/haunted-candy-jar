/**
 * Pure placement of a candy's bandage note so it stays on screen and inside
 * the jar glass. Pure: no DOM, no module state.
 *
 * The note is 150 x 26 units, centred on its own origin and tilted at most
 * 4 degrees. CandyItem places it at (0, -half - 22) from the candy centre;
 * this helper returns the extra shift { dx, dy } to add to that spot, plus
 * `tailX`, where the tail sits along the strip (strip units, 0 = centre).
 *
 * Rules:
 * - jar candy: the rotated bounding box stays NOTE_MARGIN inside the inner
 *   walls (x 40 and 360). dx slides the note sideways.
 * - jar candy near the top of a full jar: the note would poke above the
 *   shoulder (JAR_SHOULDER_Y), where the glass narrows. dy clamps the note
 *   down so its top edge sits on the shoulder. It then overlaps the upper
 *   part of the candy, which keeps it attached and readable (a flipped
 *   below-the-candy note would need an upside-down tail and could hit the
 *   candy below). The tail still points at the candy centre.
 * - lifted (selected) candy: drawn outside the clip, scaled by LIFT_SCALE
 *   about the candy centre. The note stays inside the viewBox (0 to 400, or
 *   0 to the desk right edge for desk candies). dx is returned in the
 *   pre-scale (local) space of the lifted group. No vertical change.
 * - desk candy: stays inside 0 to the desk right edge for the viewport kind.
 *   It may extend past the jar body.
 * - the tail follows the candy: tailX = -dx, clamped to stay on the strip.
 *
 * Validates: Requirement 3.8
 */
import { JAR_PACK_BOX, JAR_SHOULDER_Y, JAR_VIEWBOX_WIDTH } from '../jar/jarGeometry';

export const NOTE_STRIP_WIDTH = 150;
export const NOTE_STRIP_HEIGHT = 26;
/** Largest tilt (degrees) bandageText.tiltForId can return. */
export const NOTE_MAX_TILT = 4;
/** Gap kept between the note and the glass wall, in jar units. */
export const NOTE_MARGIN = 6;
/** Gap between the candy edge and the note's centre line, in jar units. */
export const NOTE_GAP = 22;
/** Scale of a lifted candy. CandyItem's LIFT_SCALE must equal this (tested). */
export const NOTE_LIFT_SCALE = 1.2;
/** Keep-in distance of the tail centre from a strip end (strip units). */
export const TAIL_EDGE = 16;
/** Right edge of the desk note range, desktop and compact (jar units). */
export const DESK_NOTE_RIGHT = 560;
export const DESK_NOTE_RIGHT_COMPACT = JAR_VIEWBOX_WIDTH;

const rad = (deg: number) => (deg * Math.PI) / 180;
const sinT = Math.sin(rad(NOTE_MAX_TILT));
const cosT = Math.cos(rad(NOTE_MAX_TILT));
/** Half width of the rotated strip's bounding box, plus 1 for the frayed ends and stroke. */
export const NOTE_HALF_WIDTH = (NOTE_STRIP_WIDTH / 2) * cosT + (NOTE_STRIP_HEIGHT / 2) * sinT + 1;
/** Half height of the rotated strip's bounding box, plus 1 for the stroke. */
export const NOTE_HALF_HEIGHT = (NOTE_STRIP_HEIGHT / 2) * cosT + (NOTE_STRIP_WIDTH / 2) * sinT + 1;

export type NoteZone = 'jar' | 'desk';
export interface NoteOffset {
  dx: number;
  dy: number;
  tailX: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Where the note's centre rests above the candy centre, before any shift. */
export function noteRestY(candyHalf: number): number {
  return -candyHalf - NOTE_GAP;
}

/**
 * @param candyX candy centre x in jar units (the layout slot, not the lifted spot)
 * @param candyY candy centre y in jar units
 * @param zone 'jar' for candies in the glass, 'desk' for candies on the desk
 * @param compact mobile desk spread (right edge 400 instead of 560)
 * @param selected true when the candy is lifted and scaled by NOTE_LIFT_SCALE
 * @param candyHalf half the candy box size, for the vertical shoulder check
 */
export function noteOffset(
  candyX: number,
  candyY: number,
  zone: NoteZone = 'jar',
  compact = false,
  selected = false,
  candyHalf = 36,
): NoteOffset {
  const s = selected ? NOTE_LIFT_SCALE : 1;
  const hw = NOTE_HALF_WIDTH * s;
  let lo: number;
  let hi: number;
  if (zone === 'jar' && !selected) {
    lo = JAR_PACK_BOX.x + NOTE_MARGIN + hw;
    hi = JAR_PACK_BOX.x + JAR_PACK_BOX.width - NOTE_MARGIN - hw;
  } else {
    lo = hw;
    hi = (zone === 'desk' ? (compact ? DESK_NOTE_RIGHT_COMPACT : DESK_NOTE_RIGHT) : JAR_VIEWBOX_WIDTH) - hw;
  }
  const dx = (clamp(candyX, lo, hi) - candyX) / s;
  let dy = 0;
  if (zone === 'jar' && !selected) {
    const top = candyY + noteRestY(candyHalf) - NOTE_HALF_HEIGHT;
    dy = Math.max(0, JAR_SHOULDER_Y - top);
  }
  const tailMax = NOTE_STRIP_WIDTH / 2 - TAIL_EDGE;
  const tailX = clamp(-dx, -tailMax, tailMax);
  return { dx, dy, tailX };
}
