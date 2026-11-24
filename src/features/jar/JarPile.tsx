import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { CandyItem, DEFAULT_CANDY_SIZE } from '../candy/CandyItem';
import { useTaskStore } from '../tasks/taskStore';
import { JarScene, type JarSceneProps } from './JarScene';
import { JAR_LID_PIVOT } from './jarGeometry';
import { LidAnimation, useLidSequence } from './LidAnimation';
import { layoutPile, type PileEntry } from './jarPileLayout';
import './JarPile.css';

/** Matches the mobile breakpoint in DeskBackground.css. */
const COMPACT_QUERY = '(max-width: 767px)';

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
 * - In the clip group: the oldest 24 candies, each at its packed slot.
 * - In the overflow layer (unclipped, above the glass): candies beyond 24,
 *   scattered loosely on the desk around the jar base (mostly to the right,
 *   a few to the left), at 85% size, sorted by y so lower candies draw on top.
 *   The desk spill is drawn inside the same SVG as the jar (JarScene sets
 *   overflow visible), so the viewBox is unchanged and the jar body never
 *   moves. The vertical band and horizontal spread (narrower under 768px) are
 *   documented in jarPileLayout.ts.
 * - The selected candy is drawn last, in the overflow layer, so its lift is
 *   not cut off by the jar clip. It keeps its slot in the layout and returns
 *   there on deselect.
 *
 * Completed tasks stay in the store during the undo window, so they keep their
 * slot while CandyItem fades and shows the ghost, then unmounts itself.
 *
 * Drop-in: a candy that was not present on first render drops from the lid to
 * its slot with a bouncy CSS transition. Under prefers-reduced-motion it only
 * fades in (150 ms), with no movement.
 *
 * Validates: Requirements 1.2, 13.1, 13.2, 13.3
 */
export function JarPile({ onLidOpen, onLidClose, ...sceneProps }: JarPileProps) {
  const { state } = useTaskStore();
  const reduced = useReducedMotion();
  const compact = useCompactSpill();
  // Lid sequence (see LidAnimation.tsx). A newly added candy stays hidden
  // until the lid is open, then its drop-in animation starts. Under reduced
  // motion nothing waits: the candy just fades in.
  const lid = useLidSequence({ tasks: state.tasks, onLidOpen, onLidClose });
  const entries = useMemo(() => layoutPile(state.tasks, compact), [state.tasks, compact]);
  const selectedId = state.selectedTaskId;
  // Track which candies are new since first render. Ids are pruned when a task
  // goes away, so an undone delete drops in again.
  const seen = useRef<Set<string> | null>(null);
  const dropping = useRef<Set<string>>(new Set());
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const currentIds = new Set(entries.map((e) => e.task.id));
  if (seen.current === null) {
    seen.current = new Set(currentIds);
  } else {
    for (const id of currentIds) {
      if (!seen.current.has(id)) {
        seen.current.add(id);
        dropping.current.add(id);
      }
    }
    for (const id of seen.current) {
      if (!currentIds.has(id)) {
        seen.current.delete(id);
        dropping.current.delete(id);
      }
    }
  }
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
      if (reduced || entry.zone === 'desk') {
        classes.push('jar-pile__candy--fade');
      } else {
        classes.push('jar-pile__candy--drop');
        style['--drop-x'] = `${JAR_LID_PIVOT.x - entry.x}px`;
        style['--drop-y'] = `${JAR_LID_PIVOT.y - entry.y}px`;
      }
    }
    return (
      <g
        key={id}
        className={classes.join(' ')}
        style={style as CSSProperties}
        data-testid="jar-pile-candy"
        data-zone={entry.zone}
        data-near-wall={entry.nearWall ? 'true' : 'false'}
        onAnimationEnd={(e) => {
          if (e.target !== e.currentTarget) return;
          if (dropping.current.delete(id)) rerender();
        }}
      >
        <CandyItem
          task={entry.task}
          x={entry.x}
          y={entry.y}
          rotation={entry.rotation}
          size={DEFAULT_CANDY_SIZE * entry.sizeFactor}
        />
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
