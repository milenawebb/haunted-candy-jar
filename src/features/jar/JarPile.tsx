import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useHauntClock } from '../../hooks/useHauntClock';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { CandyItem, DEFAULT_CANDY_SIZE } from '../candy/CandyItem';
import { useTaskStore } from '../tasks/taskStore';
import {
  ADDED_TO_DESK_MESSAGE,
  ADDED_TO_JAR_MESSAGE,
  CANDY_BACK_IN_JAR_MESSAGE,
  CANDY_ESCAPED_MESSAGE,
  useAnnounce,
} from '../undo/announce';
import { JarScene, type JarSceneProps } from './JarScene';
import { JAR_LID_PIVOT } from './jarGeometry';
import { LidAnimation, useLidSequence } from './LidAnimation';
import { layoutPile, type PileEntry } from './jarPileLayout';
import { diffZoneEvents, type ZoneSnapshot } from './lidQueue';
import './JarPile.css';

/** Matches the mobile breakpoint in DeskBackground.css. */
const COMPACT_QUERY = '(max-width: 767px)';

/** How long a new candy glows (two 1 s pulses). */
export const NEW_CANDY_GLOW_MS = 2000;

/** How far above the jar mouth (units) the top of an escaping candy's hop arc sits. */
const HOP_APEX_RISE = 40;

/** True on narrow viewports, where the desk spill uses a narrower spread. False without matchMedia. */
function useCompactSpill(): boolean {
  const get = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(COMPACT_QUERY).matches
      : false;
  const [compact, setCompact] = useState<boolean>(get);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(COMPACT_QUERY);
    const onChange = (e: MediaQueryListEvent) => setCompact(e.matches);
    setCompact(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return compact;
}

export interface JarPileProps extends Omit<JarSceneProps, 'children' | 'overflow'> {
  /** Called when the lid starts to open (for the lid creak sound). */
  onLidOpen?: () => void;
  /** Called when the lid starts to close (for the glass clink sound). */
  onLidClose?: () => void;
}

/**
 * The jar with its candies, wired to the task store.
 *
 * Layers (see jarPileLayout.ts for the pure math):
 * - In the clip group: the oldest 40 non-cursed candies, each at its packed slot.
 * - In the overflow layer (unclipped, above the glass): every Cursed candy
 *   (they escape the jar however empty it is, and do not count toward the 40)
 *   plus non-cursed candies beyond 40, scattered loosely on the desk around
 *   the jar base (mostly to the right, a few to the left), at 85% size, sorted
 *   by y so lower candies draw on top. Escaped candies take the first desk
 *   slots, overflow follows. The desk spill is drawn inside the same SVG as
 *   the jar (JarScene sets overflow visible), so the viewBox is unchanged and
 *   the jar body never moves. The vertical band and horizontal spread
 *   (narrower under 768px) are documented in jarPileLayout.ts. Desk candies
 *   can be dragged or nudged (CandyItem `desk` prop); a saved task.deskPos
 *   overrides the scatter spot.
 * - The selected candy is drawn last, in the overflow layer, so its lift is
 *   not cut off by the jar clip. It keeps its slot in the layout and returns
 *   there on deselect.
 *
 * Which candies are Cursed comes from the haunt clock, so Haunt Speed moves
 * candies out of the jar sooner.
 *
 * Completed tasks stay in the store during the undo window, so they keep their
 * slot while CandyItem fades and shows the ghost, then unmounts itself.
 *
 * Drop-in: a candy that was not present on first render drops from the lid to
 * its slot with a bouncy CSS transition. Under prefers-reduced-motion it only
 * fades in (150 ms), with no movement.
 *
 * Escape: a candy that was in the jar on the previous render and is Cursed now
 * waits for the lid to open (the same lid queue as adds and removes, event
 * kind 'escape'), then hops up through the jar mouth and down to its desk spot
 * (about 800 ms) and is announced ("A candy escaped!"). Under reduced motion
 * the lid stays shut and the candy just fades in on the desk (150 ms), still
 * announced. The first render, imports and demo seeding place cursed candies
 * on the desk silently.
 *
 * Imports: the store bumps `importGeneration` on every IMPORT_TASKS. When it
 * changes, the previous zone snapshot is dropped and no escape, return, lid,
 * glow or announcement happens, even for candies whose id is unchanged but
 * whose due date now makes them Cursed (or no longer Cursed). They simply
 * appear where the new list puts them.
 *
 * Return: a candy that stops being Cursed (due date edited later, Haunt Speed
 * lowered) goes back into the jar when there is room, with the normal drop-in
 * and an announcement ("Back in the jar"). With no room it stays on the desk
 * as overflow.
 *
 * New candy feedback: a single newly added candy (same detection as the
 * drop-in) is announced to screen readers (jar or desk) when its id appears,
 * and glows for about 2 s once it is visible (after the lid releases it).
 * Several candies appearing at once (import, demo seeding) get no feedback.
 * An escaped candy glows too.
 *
 * Validates: Requirements 1.2, 13.1, 13.2, 13.3
 */
export function JarPile({ onLidOpen, onLidClose, ...sceneProps }: JarPileProps) {
  const { state } = useTaskStore();
  const reduced = useReducedMotion();
  const compact = useCompactSpill();
  const logicalNow = useHauntClock();
  const { announce } = useAnnounce();

  const entries = useMemo(
    () => layoutPile(state.tasks, compact, logicalNow),
    [state.tasks, compact, logicalNow],
  );

  // Zone and Cursed state of every live candy, for escape and return events.
  const snapshot = useMemo<ZoneSnapshot>(
    () =>
      new Map(
        entries
          .filter((e) => e.task.completedAt === null)
          .map((e) => [e.task.id, { zone: e.zone, cursed: e.escaped }] as const),
      ),
    [entries],
  );

  // Lid sequence (see LidAnimation.tsx). A newly added or escaping candy stays
  // hidden until the lid is open, then its animation starts. Under reduced
  // motion nothing waits: the candy just fades in.
  const generation = state.importGeneration;
  const lid = useLidSequence({ tasks: state.tasks, snapshot, generation, onLidOpen, onLidClose });

  const selectedId = state.selectedTaskId;

  // Track which candies are new since first render. Ids are pruned when a task
  // goes away, so an undone delete drops in again.
  const seen = useRef<Set<string> | null>(null);
  const dropping = useRef<Set<string>>(new Set());
  // Zone of a new candy waiting to be announced, and ids waiting to glow.
  const toAnnounce = useRef<PileEntry['zone'] | null>(null);
  const toGlow = useRef<Set<string>>(new Set());
  const glowTimers = useRef<Map<string, number>>(new Map());
  const [glowing, setGlowing] = useState<ReadonlySet<string>>(new Set());
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  // Escape and return tracking: last seen snapshot, last jar slot of each
  // candy (where a hop starts), hops in progress, and a message to announce.
  const prevSnapshot = useRef<ZoneSnapshot | null>(null);
  const prevGeneration = useRef(generation);
  const jarSlots = useRef<Map<string, { x: number; y: number }>>(new Map());
  const hopFrom = useRef<Map<string, { x: number; y: number }>>(new Map());
  const toAnnounceMove = useRef<string | null>(null);

  // True on the render that follows an import: everything is a silent reset.
  const imported = prevGeneration.current !== generation;
  prevGeneration.current = generation;

  const currentIds = new Set(entries.map((e) => e.task.id));
  if (seen.current === null) {
    seen.current = new Set(currentIds);
  } else {
    const added: PileEntry[] = [];
    for (const entry of entries) {
      const id = entry.task.id;
      if (!seen.current.has(id)) {
        seen.current.add(id);
        dropping.current.add(id);
        added.push(entry);
      }
    }
    // Only a single add (or an undo restore) gets feedback. A batch at once is
    // an import or demo seeding, which would light up the whole jar.
    const [only] = added;
    if (only && added.length === 1 && !imported) {
      toAnnounce.current = only.zone;
      toGlow.current.add(only.task.id);
    }
    for (const id of seen.current) {
      if (!currentIds.has(id)) {
        seen.current.delete(id);
        dropping.current.delete(id);
        hopFrom.current.delete(id);
        toGlow.current.delete(id);
      }
    }
  }

  // Escapes and returns (same detection as the lid queue, so they line up).
  // An import skips the diff, so same-id candies change zone silently.
  if (prevSnapshot.current !== snapshot) {
    if (prevSnapshot.current && !imported) {
      for (const ev of diffZoneEvents(prevSnapshot.current, snapshot)) {
        dropping.current.add(ev.id);
        if (ev.kind === 'escape') {
          hopFrom.current.set(ev.id, jarSlots.current.get(ev.id) ?? JAR_LID_PIVOT);
          toGlow.current.add(ev.id);
          toAnnounceMove.current = CANDY_ESCAPED_MESSAGE;
        } else {
          toAnnounceMove.current ??= CANDY_BACK_IN_JAR_MESSAGE;
        }
      }
    }
    prevSnapshot.current = snapshot;
    jarSlots.current = new Map(
      entries.filter((e) => e.zone === 'jar').map((e) => [e.task.id, { x: e.x, y: e.y }] as const),
    );
  }

  // Announce at add time; start each glow once its candy is visible.
  useEffect(() => {
    if (toAnnounce.current) {
      announce(toAnnounce.current === 'jar' ? ADDED_TO_JAR_MESSAGE : ADDED_TO_DESK_MESSAGE);
      toAnnounce.current = null;
    }
    if (toAnnounceMove.current) {
      announce(toAnnounceMove.current);
      toAnnounceMove.current = null;
    }
    for (const id of [...toGlow.current]) {
      if (lid.isWaiting(id)) continue;
      toGlow.current.delete(id);
      setGlowing((prev) => new Set(prev).add(id));
      glowTimers.current.set(
        id,
        window.setTimeout(() => {
          glowTimers.current.delete(id);
          setGlowing((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, NEW_CANDY_GLOW_MS),
      );
    }
  });

  useEffect(() => {
    const timers = glowTimers.current;
    return () => {
      for (const t of timers.values()) window.clearTimeout(t);
      timers.clear();
    };
  }, []);

  const renderEntry = (entry: PileEntry) => {
    const id = entry.task.id;
    const isDropping = dropping.current.has(id);
    const classes = ['jar-pile__candy'];
    const style: Record<string, string> = {};
    if (entry.nearWall) classes.push('jar-pile__candy--near-wall');
    if (isDropping && lid.isWaiting(id)) {
      // Not released yet: keep it out of sight (and out of the animation).
      style['visibility'] = 'hidden';
    } else if (isDropping) {
      const from = hopFrom.current.get(id);
      if (reduced) {
        classes.push('jar-pile__candy--fade');
      } else if (from && entry.zone === 'desk') {
        // Arc from the old jar slot up through the mouth and down to the desk spot.
        classes.push('jar-pile__candy--hop');
        style['--hop-sx'] = `${from.x - entry.x}px`;
        style['--hop-sy'] = `${from.y - entry.y}px`;
        style['--hop-mx'] = `${JAR_LID_PIVOT.x - entry.x}px`;
        style['--hop-my'] = `${JAR_LID_PIVOT.y - HOP_APEX_RISE - entry.y}px`;
      } else if (entry.zone === 'desk') {
        classes.push('jar-pile__candy--fade');
      } else {
        classes.push('jar-pile__candy--drop');
        style['--drop-x'] = `${JAR_LID_PIVOT.x - entry.x}px`;
        style['--drop-y'] = `${JAR_LID_PIVOT.y - entry.y}px`;
      }
    }
    // A separate nested group carries the glow filter, so it never clobbers
    // the near-wall tint filter on the wrapper. Always rendered so toggling
    // the glow does not remount the candy.
    const glowClass = glowing.has(id)
      ? reduced
        ? 'jar-pile__glow-static'
        : 'jar-pile__glow'
      : undefined;
    return (
      <g
        key={id}
        className={classes.join(' ')}
        style={style as CSSProperties}
        data-testid="jar-pile-candy"
        data-zone={entry.zone}
        data-escaped={entry.escaped ? 'true' : 'false'}
        data-near-wall={entry.nearWall ? 'true' : 'false'}
        onAnimationEnd={(e) => {
          if (e.target !== e.currentTarget) return;
          hopFrom.current.delete(id);
          if (dropping.current.delete(id)) rerender();
        }}
      >
        <g className={glowClass} data-testid="jar-pile-glow">
          <CandyItem
            task={entry.task}
            x={entry.x}
            y={entry.y}
            rotation={entry.rotation}
            size={DEFAULT_CANDY_SIZE * entry.sizeFactor}
            desk={entry.zone === 'desk' ? { compact } : undefined}
          />
        </g>
      </g>
    );
  };

  const inJar = entries.filter((e) => e.zone === 'jar' && e.task.id !== selectedId);
  // Lower (closer) desk candies draw on top of higher ones.
  const desk = entries
    .filter((e) => e.zone === 'desk' && e.task.id !== selectedId)
    .sort((a, b) => a.y - b.y);
  const selected = entries.find((e) => e.task.id === selectedId);

  return (
    <JarScene
      lid={<LidAnimation phase={lid.phase} />}
      {...sceneProps}
      overflow={
        <g data-testid="jar-overflow">
          {desk.map(renderEntry)}
          {selected && renderEntry(selected)}
        </g>
      }
    >
      {inJar.map(renderEntry)}
    </JarScene>
  );
}
