/**
 * Seeded packing layout for candies in the jar.
 * Pure: no DOM, no module-level mutable state.
 * Coordinates are candy centres, origin at the top-left of the jar box.
 *
 * Candies settle like a real pile: each one (in sorted-id order) is dropped
 * from many candidate x positions and takes the lowest resting spot, so it
 * nests into gaps and the jar fills from the floor up.
 */
export interface PackedPosition {
  x: number;
  y: number;
  /** Degrees, within +/-15. */
  rotation: number;
}
const MAX_ROTATION = 15;
/** Evenly spaced drop columns, on top of the contact-derived candidates. */
const GRID_COLUMNS = 48;
/** Resting neighbours sit this far inside 2r (fraction of r), so they touch with a tiny squash. */
const REST_OVERLAP = 0.08;
/** Candy radius as a fraction of the shorter box side (candy is about 1/5 of a 320 wide box). */
const RADIUS_DIVISOR = 10;
/** FNV-1a 32-bit hash of a string. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
/** Returns a function producing floats in [0, 1) from an LCG. */
function makeLcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function rotationFor(id: string): number {
  const rand = makeLcg(hashString(id));
  rand(); // discard first output, which correlates with the seed
  return (rand() * 2 - 1) * MAX_ROTATION;
}
/** Candy radius used for a pack box of the given size. */
export function packingRadius(jarWidth: number, jarHeight: number): number {
  return Math.max(1, Math.min(jarWidth / RADIUS_DIVISOR, jarHeight / RADIUS_DIVISOR));
}
export function computePacking(
  taskIds: string[],
  jarWidth: number,
  jarHeight: number,
): PackedPosition[] {
  if (taskIds.length === 0) return [];
  const radius = packingRadius(jarWidth, jarHeight);
  const restDist = 2 * radius - REST_OVERLAP * radius;
  const minX = Math.min(radius, jarWidth / 2);
  const maxX = Math.max(minX, jarWidth - radius);
  const minY = Math.min(radius, jarHeight / 2);
  const floorY = Math.max(minY, jarHeight - radius);
  // Layout depends only on the sorted id set, so each id keeps its spot
  // regardless of input order.
  const order = taskIds.map((id, index) => ({ id, index }));
  order.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.index - b.index));
  const rand = makeLcg(hashString(order.map((o) => o.id).join('|')));
  const placed: Array<{ x: number; y: number }> = [];
  const result: PackedPosition[] = new Array(taskIds.length);
  const clampX = (x: number) => Math.min(maxX, Math.max(minX, x));
  for (const { id, index } of order) {
    // Candidate drop columns: an even grid with jitter, plus spots beside and
    // in the valley above each placed candy.
    const xs: number[] = [];
    for (let c = 0; c < GRID_COLUMNS; c++) {
      xs.push(clampX(minX + ((c + rand()) / GRID_COLUMNS) * (maxX - minX)));
    }
    for (const p of placed) {
      xs.push(
        clampX(p.x - restDist),
        clampX(p.x + restDist),
        clampX(p.x - restDist / 2),
        clampX(p.x + restDist / 2),
      );
    }
    xs.push(minX, maxX);
    let best = { x: (minX + maxX) / 2, y: minY, contacts: -1 };
    for (const x of xs) {
      // Drop straight down until the candy rests on the floor or a neighbour.
      let y = floorY;
      for (const p of placed) {
        const dx = Math.abs(p.x - x);
        if (dx < restDist) {
          y = Math.min(y, p.y - Math.sqrt(restDist * restDist - dx * dx));
        }
      }
      y = Math.max(minY, y);
      // Prefer snug spots (more neighbours or walls touching) among equally low ones.
      let contacts = 0;
      for (const p of placed) {
        if (Math.hypot(p.x - x, p.y - y) <= restDist + 0.5) contacts++;
      }
      if (x - minX < 0.5 || maxX - x < 0.5) contacts++;
      const lower = y > best.y + 0.5;
      const level = Math.abs(y - best.y) <= 0.5;
      if (
        best.contacts < 0 ||
        lower ||
        (level && (contacts > best.contacts || (contacts === best.contacts && rand() < 0.5)))
      ) {
        best = { x, y, contacts };
      }
    }
    placed.push({ x: best.x, y: best.y });
    result[index] = { x: best.x, y: best.y, rotation: rotationFor(id) };
  }
  return result;
}
