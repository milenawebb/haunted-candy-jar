/**
 * Pure layout helpers for JarPile. No DOM, no module-level mutable state.
 *
 * Coordinates are jar SVG user units (the JarScene viewBox space).
 */
import { computePacking } from '../../utils/packingLayout';
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
 * jar top, the jar body bottom is y 560 and the glass base is about 532).
 *
 * Derivation. The background is object-fit: cover on a 1672x941 image, centred
 * vertically, so scale s = max(W / 1672, H / 941) and the image top sits at
 * y0 = (H - 941 s) / 2 on screen. The desk top is at 74% and the front lip at
 * 87% of the image height: deskTop = y0 + 0.74 * 941 s, lip = y0 + 0.87 * 941 s.
 * The jar slot bottom (user y 560) is 18% (20% under 768px) above the viewport
 * bottom, and one user unit is u = jarWidth / 400 px, where
 * jarWidth = min(480, 0.9 W, (0.78 H - 110) * 400 / 624). So a screen y maps
 * to user y = 560 - (slotBottom - screenY) / u. Worked out:
 *   1280x800:  desk top y 482, lip y 608
 *   1920x1080: desk top y 486, lip y 606
 *   390x844:   desk top y 501, lip y 629
 * The common band is therefore y 501 to 606. A spilled candy has radius
 * 32 * 0.85 = 27.2, so its bottom (y + 27.2) must stay above the lip:
 * y <= 578. The centre must also sit well below the desk top so it reads as
 * resting on the surface: y >= 548 (bottom at 575 at the lowest). Bounds are
 * deliberately conservative.
 *
 * Assumptions: 74% and 87% are the desk top and lip fractions documented in
 * DeskBackground.css (not re-measured here); the jar is not cropped by an
 * extremely wide and short viewport (for example 1920x600 the desk top falls
 * below the jar base and no band in jar units is reliable).
 */
export const SPILL_Y_MIN = 548;
export const SPILL_Y_MAX = 578;
/** Spilled candies are drawn at this fraction of the in-jar candy size. */
export const SPILL_SIZE_FACTOR = 0.85;
/** Rotation limit for spilled candies, degrees. */
export const SPILL_MAX_ROTATION = 25;
/** Jar centre x. */
export const SPILL_CENTER_X = 200;
/** Right side, x range. Desktop reaches 520 (320 units, about 260 px at 1280 wide). */
export const SPILL_RIGHT_MIN = 244;
export const SPILL_RIGHT_MAX = 520;
/**
 * Compact (mobile, under 768px) right side. The jar is about 90vw wide there,
 * so 372 is the jar's right edge (400) minus a candy radius and a small
 * margin, and the candy stays on screen (at 390 wide, 195 px is 229 units from
 * the centre).
 */
export const SPILL_RIGHT_MAX_COMPACT = 372;
/** Left side, x range (same on both layouts; 40 keeps the candy edge inside the jar's left edge). */
export const SPILL_LEFT_MIN = 40;
export const SPILL_LEFT_MAX = 150;
/** Number of spill slots over which the fan reaches full width. */
const SPILL_FAN_COUNT = 14;

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
}
/** Oldest first. Ties break on id so the order is total and stable. */
export function sortByAge(tasks: readonly Task[]): Task[] {
  return tasks.slice().sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
/** The oldest `capacity` tasks stay in the jar; the rest spill onto the desk. */
export function partitionTasks(
  tasks: readonly Task[],
  capacity: number = JAR_CAPACITY,
): { inJar: Task[]; spilled: Task[] } {
  const sorted = sortByAge(tasks);
  return { inJar: sorted.slice(0, capacity), spilled: sorted.slice(capacity) };
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

/**
 * Desk position for one spilled candy, from its id and its spill index.
 * Every fourth candy tumbles left (25%), the rest go right. The reach grows
 * with the index so later candies fan out from the jar base, and the id hash
 * adds a random offset, a y inside the desk band, and the rotation. A given
 * (id, index) always gives the same spot, whatever other ids exist.
 */
export function spillPosition(id: string, index: number, compact = false): Placement {
  const left = index % 4 === 3;
  const reach = Math.min(1, (index + 1) / SPILL_FAN_COUNT);
  const jitter = (hash01(id, 'x') - 0.5) * 36;
  let x: number;
  if (left) {
    x = SPILL_LEFT_MAX - reach * (SPILL_LEFT_MAX - SPILL_LEFT_MIN) + jitter;
  } else {
    const max = compact ? SPILL_RIGHT_MAX_COMPACT : SPILL_RIGHT_MAX;
    x = SPILL_RIGHT_MIN + reach * (max - SPILL_RIGHT_MIN) + jitter;
  }
  const xMin = left ? SPILL_LEFT_MIN : SPILL_RIGHT_MIN;
  const xMax = left ? SPILL_LEFT_MAX : compact ? SPILL_RIGHT_MAX_COMPACT : SPILL_RIGHT_MAX;
  x = Math.min(xMax, Math.max(xMin, x));
  const y = SPILL_Y_MIN + hash01(id, 'y') * (SPILL_Y_MAX - SPILL_Y_MIN);
  const rotation = (hash01(id, 'r') * 2 - 1) * SPILL_MAX_ROTATION;
  return { x, y, rotation };
}

/** Desk positions for spilled ids, in spill order (oldest first). */
export function spillPositions(ids: readonly string[], compact = false): Placement[] {
  return ids.map((id, i) => spillPosition(id, i, compact));
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
 * from the sorted ids of the in-jar set, then offset into jar coordinates.
 */
export function layoutPile(tasks: readonly Task[], compact = false): PileEntry[] {
  const { inJar, spilled } = partitionTasks(tasks);
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
    };
  });
  const desk = spillPositions(
    spilled.map((t) => t.id),
    compact,
  );
  spilled.forEach((task, i) => {
    const p = desk[i] as Placement;
    entries.push({ task, zone: 'desk', ...p, nearWall: false, sizeFactor: SPILL_SIZE_FACTOR });
  });
  return entries;
}
