import { render } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildDemoTasks } from '../../src/dev/demoSeed';
import { JarPile } from '../../src/features/jar/JarPile';
import { JAR_CAPACITY } from '../../src/features/jar/jarGeometry';
import {
  SPILL_LEFT_MAX,
  SPILL_MIN_DISTANCE,
  SPILL_RIGHT_MIN_COMPACT,
  deskBandBounds,
  deskSlots,
  layoutPile,
} from '../../src/features/jar/jarPileLayout';
import { TaskStoreProvider } from '../../src/features/tasks/taskStore';
import type { Task } from '../../src/features/tasks/taskTypes';
import { TASKS_KEY } from '../../src/utils/persistence';

const EPS = 1e-6;
const DAY = 24 * 60 * 60 * 1000;

function minPairDistance(pos: readonly { x: number; y: number }[]): number {
  let best = Infinity;
  for (let i = 0; i < pos.length; i++) {
    for (let j = i + 1; j < pos.length; j++) {
      best = Math.min(best, Math.hypot(pos[i]!.x - pos[j]!.x, pos[i]!.y - pos[j]!.y));
    }
  }
  return best;
}

function mockMedia(compact: boolean) {
  window.matchMedia = ((query: string) => ({
    // Only the compact query matches. Reduced motion stays off.
    matches: compact && query.includes('max-width'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/** Desk candy centres as rendered by JarPile (the transform on each CandyItem). */
function renderedDesk(tasks: Task[]): { id: string; x: number; y: number }[] {
  window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  const { container, unmount } = render(
    <TaskStoreProvider>
      <JarPile />
    </TaskStoreProvider>,
  );
  const out = [...container.querySelectorAll('[data-testid="jar-overflow"] [data-testid="candy-item"]')].map((el) => {
    const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(el.getAttribute('transform') ?? '');
    return { id: el.getAttribute('data-task-id') ?? '', x: Number(m![1]), y: Number(m![2]) };
  });
  unmount();
  return out;
}

describe('desk spread (escaped and overflow share one placement)', () => {
  const originalMatchMedia = window.matchMedia;
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  for (const compact of [false, true]) {
    const label = compact ? 'compact' : 'desktop';

    it(`Validates: Requirement 13.2 (?demo=45, ${label}, layoutPile keeps every desk pair apart)`, () => {
      const now = Date.now();
      const desk = layoutPile(buildDemoTasks(45, now), compact, now).filter((e) => e.zone === 'desk');
      expect(desk).toHaveLength(5);
      expect(desk.length).toBeLessThanOrEqual(deskSlots(compact));
      expect(desk.filter((e) => e.escaped)).toHaveLength(3);
      expect(minPairDistance(desk)).toBeGreaterThanOrEqual(SPILL_MIN_DISTANCE - EPS);
    });

    it(`Validates: Requirement 13.2 (?demo=45, ${label}, rendered JarPile equals the layout and keeps pairs apart)`, () => {
      mockMedia(compact);
      const now = Date.now();
      const tasks = buildDemoTasks(45, now);
      const expected = layoutPile(tasks, compact, now).filter((e) => e.zone === 'desk');
      const rendered = renderedDesk(tasks);
      expect(rendered).toHaveLength(expected.length);
      for (const e of expected) {
        const r = rendered.find((c) => c.id === e.task.id)!;
        expect(r.x).toBeCloseTo(e.x, 6);
        expect(r.y).toBeCloseTo(e.y, 6);
      }
      expect(minPairDistance(rendered)).toBeGreaterThanOrEqual(SPILL_MIN_DISTANCE - EPS);
    });
  }

  it('Validates: Requirement 13.2 (mixed escaped and overflow candies, up to deskSlots, stay apart, in the band, on both sides)', () => {
    const now = Date.now();
    const jarTask = (i: number): Task => ({
      id: `jar-${i}`,
      title: `Jar ${i}`,
      dueDate: null,
      monster: 'pumpkin',
      isSample: false,
      createdAt: now - 60 * 60 * 1000 - i,
      completedAt: null,
    });
    const jarFill = Array.from({ length: JAR_CAPACITY }, (_, i) => jarTask(i));
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.uuid(), { minLength: 0, maxLength: deskSlots(false) }),
        fc.nat(14),
        fc.boolean(),
        (allIds, split, compact) => {
          const ids = allIds.slice(0, deskSlots(compact));
          const cut = Math.min(split, ids.length);
          const escapedIds = ids.slice(0, cut);
          const overflowIds = ids.slice(cut);
          const escaped: Task[] = escapedIds.map((id, i) => ({
            ...jarTask(0),
            id,
            dueDate: now - 3 * DAY,
            createdAt: now - 6 * DAY - i,
          }));
          const overflow: Task[] = overflowIds.map((id, i) => ({
            ...jarTask(0),
            id,
            createdAt: now - 1000 - i,
          }));
          const desk = layoutPile([...jarFill, ...escaped, ...overflow], compact, now).filter((e) => e.zone === 'desk');
          expect(desk).toHaveLength(ids.length);
          expect(minPairDistance(desk)).toBeGreaterThanOrEqual(SPILL_MIN_DISTANCE - EPS);
          const b = deskBandBounds(compact);
          for (const e of desk) {
            expect(e.x).toBeGreaterThanOrEqual(b.xMin);
            expect(e.x).toBeLessThanOrEqual(b.xMax);
            expect(e.y).toBeGreaterThanOrEqual(b.yMin);
            expect(e.y).toBeLessThanOrEqual(b.yMax);
          }
          if (desk.length >= 4) {
            expect(desk.some((e) => e.x <= SPILL_LEFT_MAX)).toBe(true);
            expect(desk.some((e) => e.x >= SPILL_RIGHT_MIN_COMPACT)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
