import { useMemo, useReducer, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { CandyItem } from '../candy/CandyItem';
import { useTaskStore } from '../tasks/taskStore';
import { JarScene, type JarSceneProps } from './JarScene';
import { JAR_LID_PIVOT } from './jarGeometry';
import { layoutPile, type PileEntry } from './jarPileLayout';
import './JarPile.css';

export type JarPileProps = Omit<JarSceneProps, 'children' | 'overflow'>;

/**
 * The jar with its candies, wired to the task store.
 *
 * Layers (see jarPileLayout.ts for the pure math):
 * - In the clip group: the oldest 24 candies, each at its packed slot.
 * - In the overflow layer (unclipped, above the glass): candies beyond 24,
 *   laid out in rows on the desk in front of the jar base. There is no
 *   scrolling and no "+N more" badge. The desk spill is drawn inside the same
 *   SVG as the jar (JarScene sets overflow visible), so the viewBox is
 *   unchanged and the jar body never moves. Rows sit in front of the base
 *   instead of beside it so they stay on screen on narrow viewports.
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
export function JarPile(sceneProps: JarPileProps) {
  const { state } = useTaskStore();
  const reduced = useReducedMotion();
  const entries = useMemo(() => layoutPile(state.tasks), [state.tasks]);
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
    if (isDropping) {
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
        <CandyItem task={entry.task} x={entry.x} y={entry.y} rotation={entry.rotation} />
      </g>
    );
  };

  const inJar = entries.filter((e) => e.zone === 'jar' && e.task.id !== selectedId);
  const desk = entries.filter((e) => e.zone === 'desk' && e.task.id !== selectedId);
  const selected = entries.find((e) => e.task.id === selectedId);

  return (
    <JarScene
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
