/**
 * Pure layout helpers for JarPile. No DOM, no module-level mutable state.
 *
 * Coordinates are jar SVG user units (the JarScene viewBox space).
 */
import { computePacking } from '../../utils/packingLayout';
import { decayFunction } from '../tasks/decayFunction';
import type { Task } from '../tasks/taskTypes';
import {
  JAR_CANDY_RADIUS,
  JAR_CAPACITY,
  JAR_PACK_BOX,
} from './jarGeometry';

/** A candy within this many units of a jar wall gets the glass refraction tint. */
export const NEAR_WALL_DISTANCE = 14;

/**
 * Desk band for spilled candies (centre y, jar user units, viewBox y 0 is the
 * jar top, the jar body bottom is y 684 and the glass base is about 656).
 *
 * Derivation. The background is object-fit: cover on a 1672x941 image, centred
 * vertically, so scale s = max(W / 1672, H / 941) and the image top sits at
 * y0 = (H - 941 s) / 2 on screen. The desk top is at 74% and the front lip at
 * 87% of the image height: deskTop = y0 + 0.74 * 941 s, lip = y0 + 0.87 * 941 s.
 * The jar slot bottom (user y 684) is 18% (20% under 768px) above the viewport
 * bottom, and one user unit is u = jarWidth / 400 px, where
 * jarWidth = min(480, 0.9 W, (0.78 H - 110) * 400 / 748) (0.76 H under 600px
 * wide). So a screen y maps to user y = 684 - (slotBottom - screenY) / u.
 * Worked out:
 *   1280x800:  u 0.687, desk top y 591, lip y 742
 *   1920x1080: u 0.979, desk top y 596, lip y 739
 *   390x844:   u 0.711, desk top y 613, lip y 767
 * The common band is therefore y 613 to 739. A spilled candy has radius
 * 32 * 0.85 = 27.2, so its bottom (y + 27.2) must stay above the lip:
 * y <= 711. The centre must also sit well below the desk top so it reads as
 * resting on the surface: y >= 672 (bottom at 699 at the lowest). Bounds are
 * deliberately conservative. (Same 30 unit band as before the jar grew, moved
 * down by the 124 units the jar body gained.)
 *
 * Assumptions: 74% and 87% are the desk top and lip fractions documented in
 * DeskBackground.css (not re-measured here); the jar is not cropped by an
 * extremely wide and short viewport (for example 1920x600 the desk top falls
 * below the jar base and no band in jar units is reliable).
 */
export const SPILL_Y_MIN = 672;
export const SPILL_Y_MAX = 702;

/** Spilled candies are drawn at this fraction of the in-jar candy size. */
export const SPILL_SIZE_FACTOR = 0.85;
/** Rotation limit for spilled candies, degrees. */
export const SPILL_MAX_ROTATION = 25;

/** Jar centre x. */
export const SPILL_CENTER_X = 200;
/** Right side, x range. Desktop reaches 520 (320 units, about 220 px at 1280 wide). */
export const SPILL_RIGHT_MIN = 244;
export const SPILL_RIGHT_MAX = 520;
/**
 * Compact (mobile, under 768px) right side. The jar is about 90vw wide there,
 * so 372 is the jar's right edge (400) minus a candy radius and a small
 * margin, and the candy stays on screen (at 390 wide, 195 px is 229 units from
 * the centre).
 */
export const SPILL_RIGHT_MAX_COMPACT = 372;
/**
 * Compact right side starts a little left of the desktop 244 so the narrow
 * band holds at least 8 spaced candies (candy edge at 224 - 27 = 197, still
 * clear of the jar centre line, in front of the jar base).
 */
export const SPILL_RIGHT_MIN_COMPACT = 224;
/** Left side, x range (same on both layouts; 40 keeps the candy edge inside the jar's left edge). */
export const SPILL_LEFT_MIN = 40;
export const SPILL_LEFT_MAX = 150;
/** Number of spill slots over which the fan reaches full width. */
const SPILL_FAN_COUNT = 14;

/** Radius of a spilled candy (32 * 0.85 = 27.2 units). */
export const SPILL_RADIUS = JAR_CANDY_RADIUS * SPILL_SIZE_FACTOR;
/** Minimum distance between two spilled candy centres (1.4 x radius, about 38.08 units). */
export const SPILL_MIN_DISTANCE = 1.4 * SPILL_RADIUS;
/**
 * Capacity at the minimum distance. The band is only 30 units tall (less than
 * the minimum distance), so candies zig-zag between the top and bottom edge:
 * neighbours need an x gap of about sqrt(38.08^2 - 28^2) = 26, same-row
 * neighbours then sit 52 apart. That is about one candy per 26 units of x:
 *   desktop: right 276 wide (about 11) + left 110 wide (about 5) = 16
 *   compact: right 148 wide (about 6) + left 110 wide (about 5) = 11, so 8 fit
 * Beyond that, extra candies take the spot with the largest minimum distance
 * (they overlap a little, but never throw).
 */
const GRID_STEP_X = 2;
const GRID_STEP_Y = 2;
const EPS = 1e-9;
/** Preferred y hugs one of the two band rows (inset up to this much) so the zig-zag stays packable. */
const ROW_INSET = 2;

/**
 * Where a user may drop a desk candy (centre, jar units). The y range is the
 * spill band above. The x range is the whole desk width, 40 to 520 on desktop
 * and 40 to 372 on compact. The gap between the left and right spill sides
 * (x 150 to 244) is allowed here: the band lies below the glass base (y 656),
 * so a candy there rests on the desk in front of the jar and never inside the
 * jar body. 40 and the compact 372 keep the candy on screen; the automatic
 * scatter simply avoids the gap, a user drop does not have to.
 */
export function deskBandBounds(compact: boolean): { xMin: number; xMax: number; yMin: number; yMax: number } {
  return {
    xMin: SPILL_LEFT_MIN,
    xMax: compact ? SPILL_RIGHT_MAX_COMPACT : SPILL_RIGHT_MAX,
    yMin: SPILL_Y_MIN,
    yMax: SPILL_Y_MAX,
  };
}

/** Clamps a candy centre into the desk band. Idempotent. Non-finite input falls to the band minimum. */
export function clampToDeskBand(
  pos: { x: number; y: number },
  compact: boolean,
): { x: number; y: number } {
  const b = deskBandBounds(compact);
  const clamp = (v: number, lo: number, hi: number) =>
    Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
  return { x: clamp(pos.x, b.xMin, b.xMax), y: clamp(pos.y, b.yMin, b.yMax) };
}

export interface Placement {
  x: number;
  y: number;
  /** Degrees, within +/-SPILL_MAX_ROTATION (+/-15 for in-jar candies). */
  rotation: number;
}

export interface PileEntry extends Placement {
  task: Task;
  zone: 'jar' | 'desk';
  /** True when an in-jar candy sits within NEAR_WALL_DISTANCE of the glass. */
  nearWall: boolean;
  /** Candy size relative to the in-jar size (1 in the jar, SPILL_SIZE_FACTOR on the desk). */
  sizeFactor: number;
  /** True when the candy is on the desk because it is Cursed (it escaped), not because the jar is full. */
  escaped: boolean;
}

/** Oldest first. Ties break on id so the order is total and stable. */
export function sortByAge(tasks: readonly Task[]): Task[] {
  return tasks.slice().sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export interface Partition {
  /** Non-cursed candies that stay in the jar (oldest first, at most `capacity`). */
  inJar: Task[];
  /** Cursed candies, which leave the jar whatever its fill level (oldest first). */
  escaped: Task[];
  /** Non-cursed candies beyond the jar capacity (oldest first). */
  overflow: Task[];
  /**
   * Everything on the desk, in spill order: escaped first, then overflow.
   * Spill order drives the scatter index (see spillPositions), so a given
   * candy's spot depends only on the candies before it in this list.
   */
  spilled: Task[];
}

/**
 * Splits tasks between the jar and the desk. Pure.
 *
 * - A candy whose decay stage at `logicalNow` is Cursed always goes to the
 *   desk and does not count toward `capacity`.
 * - Of the other candies, the oldest `capacity` stay in the jar and the rest
 *   overflow onto the desk.
 * - Spill order is escaped (by createdAt, then id) followed by overflow (same
 *   order). Escapes are rare and overflow is a long tail, so an escape shifts
 *   the later overflow slots only when it happens, and a new candy (always the
 *   newest) only ever lands at the end of the overflow part.
 *
 * Without `logicalNow` no candy counts as Cursed (age and due date mean nothing
 * without a clock), which keeps callers that only care about capacity simple.
 */
export function partitionTasks(
  tasks: readonly Task[],
  capacity: number = JAR_CAPACITY,
  logicalNow?: number,
): Partition {
  const sorted = sortByAge(tasks);
  const isCursed = (t: Task) => logicalNow !== undefined && decayFunction(t, logicalNow) === 'Cursed';
  const escaped = sorted.filter(isCursed);
  const rest = sorted.filter((t) => !isCursed(t));
  const inJar = rest.slice(0, capacity);
  const overflow = rest.slice(capacity);
  return { inJar, escaped, overflow, spilled: [...escaped, ...overflow] };
}

/** FNV-1a hash of `salt + id`, mapped to [0, 1). */
function hash01(id: string, salt: string): number {
  let h = 0x811c9dc5;
  const s = salt + id;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

type Side = 'left' | 'right';
type Point = { x: number; y: number };

function sideRange(side: Side, compact: boolean): [number, number] {
  return side === 'left'
    ? [SPILL_LEFT_MIN, SPILL_LEFT_MAX]
    : [compact ? SPILL_RIGHT_MIN_COMPACT : SPILL_RIGHT_MIN, compact ? SPILL_RIGHT_MAX_COMPACT : SPILL_RIGHT_MAX];
}

/**
 * Hashed preferred desk position for one spilled candy, from its id and its
 * spill index (no collision handling, see spillPositions). Every fourth candy
 * tumbles left (25%), the rest go right. The reach grows with the index so
 * later candies fan out from the jar base, and the id hash adds a random
 * x offset, the band row (top or bottom, inset a little), and the rotation.
 */
export function spillPosition(id: string, index: number, compact = false): Placement {
  const side: Side = index % 4 === 3 ? 'left' : 'right';
  const reach = Math.min(1, (index + 1) / SPILL_FAN_COUNT);
  const jitter = (hash01(id, 'x') - 0.5) * 36;
  const [xMin, xMax] = sideRange(side, compact);
  const x = side === 'left' ? xMax - reach * (xMax - xMin) + jitter : xMin + reach * (xMax - xMin) + jitter;
  const inset = hash01(id, 'i') * ROW_INSET;
  const top = hash01(id, 'y') < 0.5;
  return {
    x: Math.min(xMax, Math.max(xMin, x)),
    y: top ? SPILL_Y_MIN + inset : SPILL_Y_MAX - inset,
    rotation: (hash01(id, 'r') * 2 - 1) * SPILL_MAX_ROTATION,
  };
}

/** Smallest distance from (x, y) to any placed centre (Infinity when none). */
function nearest(x: number, y: number, placed: readonly Point[]): number {
  let best = Infinity;
  for (const p of placed) best = Math.min(best, Math.hypot(p.x - x, p.y - y));
  return best;
}

function gridSweep(side: Side, compact: boolean): Point[] {
  const [xMin, xMax] = sideRange(side, compact);
  const out: Point[] = [];
  for (let x = xMin; x <= xMax + EPS; x += GRID_STEP_X) {
    for (let y = SPILL_Y_MIN; y <= SPILL_Y_MAX + EPS; y += GRID_STEP_Y) out.push({ x, y });
  }
  return out;
}

/**
 * Free spot for one candy: the hashed preferred spot; else the free grid
 * point of the same side closest to it (fine sweep, steps of 2 units); else
 * the same on the other side; else (band full) the grid point with the largest
 * minimum distance. Deterministic, never throws.
 */
function findSpot(id: string, index: number, compact: boolean, placed: readonly Point[]): Point {
  const pref = spillPosition(id, index, compact);
  const side: Side = index % 4 === 3 ? 'left' : 'right';
  const free = (p: Point) => nearest(p.x, p.y, placed) >= SPILL_MIN_DISTANCE - EPS;
  if (free(pref)) return pref;
  const sides: Side[] = side === 'left' ? ['left', 'right'] : ['right', 'left'];
  for (const s of sides) {
    let found: Point | null = null;
    let foundD = Infinity;
    for (const c of gridSweep(s, compact)) {
      if (!free(c)) continue;
      const d = Math.hypot(c.x - pref.x, c.y - pref.y);
      if (d < foundD - EPS) {
        foundD = d;
        found = c;
      }
    }
    if (found) return found;
  }
  let best: Point = pref;
  let bestD = -1;
  for (const s of sides) {
    for (const c of gridSweep(s, compact)) {
      const d = nearest(c.x, c.y, placed);
      if (d > bestD + EPS) {
        bestD = d;
        best = c;
      }
    }
  }
  return best;
}

/**
 * Desk positions for spilled ids, in spill order (escaped first, then
 * overflow, each oldest first). Candies are placed in index order and each
 * spot depends only on earlier candies, so a spilled id keeps its spot when
 * later ids are added.
 *
 * `pins` (optional, same length as ids) holds user-dropped positions. A pinned
 * candy takes its (clamped) position as is. All pins are placed first, so the
 * unpinned candies are then placed in index order and avoid them.
 */
export function spillPositions(
  ids: readonly string[],
  compact = false,
  pins: readonly (Point | undefined)[] = [],
): Placement[] {
  const pinned: (Point | undefined)[] = ids.map((_, i) => {
    const p = pins[i];
    return p ? clampToDeskBand(p, compact) : undefined;
  });
  const placed: Point[] = pinned.filter((p): p is Point => p !== undefined);
  return ids.map((id, i) => {
    const pin = pinned[i];
    const spot = pin ?? findSpot(id, i, compact, placed);
    if (!pin) placed.push(spot);
    return {
      x: spot.x,
      y: spot.y,
      rotation: (hash01(id, 'r') * 2 - 1) * SPILL_MAX_ROTATION,
    };
  });
}

/**
 * True when a candy at (x, y), given in pack box coordinates, has its edge
 * within `threshold` units of the left wall, right wall or floor of the box.
 */
export function isNearWall(
  x: number,
  y: number,
  box: { width: number; height: number } = JAR_PACK_BOX,
  radius: number = JAR_CANDY_RADIUS,
  threshold: number = NEAR_WALL_DISTANCE,
): boolean {
  const gap = Math.min(x, box.width - x, box.height - y) - radius;
  return gap <= threshold;
}

/**
 * Full layout for every task still in the store. In-jar candies are packed
 * from the sorted ids of the in-jar set (so when a candy escapes, the rest may
 * resettle), then offset into jar coordinates. A saved deskPos only applies to
 * desk candies (escaped or overflow); in the jar it is ignored (but stays on
 * the task). `logicalNow` decides which candies are Cursed (see partitionTasks).
 */
export function layoutPile(tasks: readonly Task[], compact = false, logicalNow?: number): PileEntry[] {
  const { inJar, escaped, spilled } = partitionTasks(tasks, JAR_CAPACITY, logicalNow);
  const escapedIds = new Set(escaped.map((t) => t.id));
  const packed = computePacking(
    inJar.map((t) => t.id),
    JAR_PACK_BOX.width,
    JAR_PACK_BOX.height,
  );
  const entries: PileEntry[] = inJar.map((task, i) => {
    const p = packed[i] as Placement;
    return {
      task,
      zone: 'jar',
      x: p.x + JAR_PACK_BOX.x,
      y: p.y + JAR_PACK_BOX.y,
      rotation: p.rotation,
      nearWall: isNearWall(p.x, p.y),
      sizeFactor: 1,
      escaped: false,
    };
  });
  const desk = spillPositions(
    spilled.map((t) => t.id),
    compact,
    spilled.map((t) => t.deskPos),
  );
  spilled.forEach((task, i) => {
    const p = desk[i] as Placement;
    entries.push({
      task,
      zone: 'desk',
      ...p,
      nearWall: false,
      sizeFactor: SPILL_SIZE_FACTOR,
      escaped: escapedIds.has(task.id),
    });
  });
  return entries;
}
