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
export const NEAR_WALL_DISTANCE = 12;

/** Centre of the first desk row, just in front of the jar base (jar base is at y 532). */
export const SPILL_ROW_Y = 552;
/** Candies per row on the desk. Seven diameters fit inside the 400 unit jar width. */
export const SPILL_PER_ROW = 7;
/** Horizontal distance between spilled candy centres. */
export const SPILL_STEP_X = 54;
/** Vertical distance between desk rows. */
export const SPILL_STEP_Y = 46;
/** Horizontal centre of the desk spill (the jar centre). */
export const SPILL_CENTER_X = 200;

export interface Placement {
  x: number;
  y: number;
  /** Degrees, within +/-15. */
  rotation: number;
}

export interface PileEntry extends Placement {
  task: Task;
  zone: 'jar' | 'desk';
  /** True when an in-jar candy sits within NEAR_WALL_DISTANCE of the glass. */
  nearWall: boolean;
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

/**
 * Desk positions for spilled candies: rows of SPILL_PER_ROW in front of the
 * jar base, each row centred on the jar. Later rows sit lower and are offset
 * by half a step so the candies nest and stay individually tappable.
 */
export function spillPositions(count: number): Placement[] {
  const result: Placement[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / SPILL_PER_ROW);
    const col = i % SPILL_PER_ROW;
    const stagger = row % 2 === 1 ? SPILL_STEP_X / 2 : 0;
    // Fixed columns (even when a row is partial) so rows always nest cleanly.
    const x = SPILL_CENTER_X + (col - (SPILL_PER_ROW - 1) / 2) * SPILL_STEP_X + stagger;
    const y = SPILL_ROW_Y + row * SPILL_STEP_Y;
    const rotation = ((i * 37) % 31) - 15;
    result.push({ x, y, rotation });
  }
  return result;
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
export function layoutPile(tasks: readonly Task[]): PileEntry[] {
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
    };
  });
  const desk = spillPositions(spilled.length);
  spilled.forEach((task, i) => {
    const p = desk[i] as Placement;
    entries.push({ task, zone: 'desk', ...p, nearWall: false });
  });
  return entries;
}
