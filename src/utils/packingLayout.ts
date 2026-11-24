/**
 * Seeded packing layout for candies in the jar.
 * Pure: no DOM, no module-level mutable state.
 * Coordinates are candy centres, origin at the top-left of the jar box.
 */

export interface PackedPosition {
  x: number;
  y: number;
  /** Degrees, within +/-15. */
  rotation: number;
}

const MAX_ROTATION = 15;
const TRIES_PER_CANDY = 8;

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

export function computePacking(
  taskIds: string[],
  jarWidth: number,
  jarHeight: number,
): PackedPosition[] {
  if (taskIds.length === 0) return [];

  const radius = Math.max(1, Math.min(jarWidth / 9, jarHeight / 9));
  // Allow up to 10% of the radius to overlap between neighbours.
  const minDist = 2 * radius - 0.1 * radius;
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

  for (const { id, index } of order) {
    let best = { x: (minX + maxX) / 2, y: minY };
    let found = false;
    for (let t = 0; t < TRIES_PER_CANDY; t++) {
      const x = minX + rand() * (maxX - minX);
      let y = floorY;
      for (const p of placed) {
        const dx = Math.abs(p.x - x);
        if (dx < minDist) {
          y = Math.min(y, p.y - Math.sqrt(minDist * minDist - dx * dx));
        }
      }
      y = Math.max(minY, y);
      if (!found || y > best.y) {
        best = { x, y };
        found = true;
      }
    }
    placed.push(best);
    result[index] = { x: best.x, y: best.y, rotation: rotationFor(id) };
  }

  return result;
}
