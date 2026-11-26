import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { MOVE_SLOP_PX, usePressAndHold } from '../../hooks/usePressAndHold';
import { useHauntClock } from '../../hooks/useHauntClock';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { JAR_CANDY_RADIUS } from '../jar/jarGeometry';
import { clampToDeskBand } from '../jar/jarPileLayout';
import { decayFunction } from '../tasks/decayFunction';
import { useTaskStore } from '../tasks/taskStore';
import type { Task } from '../tasks/taskTypes';
import { BandageNote } from './BandageNote';
import { CandyCrack } from './CandyCrack';
import { handOffFocus } from './focusHandoff';
import { GhostCheer } from './GhostCheer';
import { CANDY_ART_FILL, MonsterShape } from './MonsterShape';
import { noteOffset, noteRestY } from './notePlacement';
import './CandyItem.css';
/**
 * Default candy box width in jar user units. The monster art fills
 * CANDY_ART_FILL of the box, so the visible candy is exactly one packing
 * diameter wide and neighbours touch.
 */
export const DEFAULT_CANDY_SIZE = (JAR_CANDY_RADIUS * 2) / CANDY_ART_FILL;
/** Minimum tappable target in CSS pixels, on every viewport (style rule). */
export const HIT_MIN_PX = 44;
/** A selected candy lifts straight up by this many jar user units... */
export const LIFT_OFFSET_UNITS = 40;
/** ...and grows by this factor, so it reads as coming forward out of the jar. */
export const LIFT_SCALE = 1.2;
/** A press that lasts at least this long (ms) is a hold attempt, not a tap, so its click is ignored. */
export const TAP_MAX_MS = 250;
/** Arrow key nudge for a selected desk candy, in jar user units (Shift uses the big step). */
export const NUDGE_STEP = 6;
export const NUDGE_STEP_BIG = 18;
/** Hint read after the accessible name of a desk candy. */
export const DESK_HINT = 'Arrow keys move it on the desk when selected';
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};
export interface CandyItemProps {
  task: Task;
  /** Candy center in the parent SVG's user units (jar coordinates). */
  x: number;
  y: number;
  /** Stable rotation in degrees, from the packing layout. */
  rotation: number;
  /** Candy width in user units. Defaults to one packing diameter. */
  size?: number;
  /**
   * CSS pixels per SVG user unit at the candy's position. When omitted it is
   * measured from the rendered SVG (getScreenCTM) on mount and on window resize;
   * where that API is missing (jsdom) the scale is taken as 1.
   */
  jarScale?: number;
  /**
   * Set for candies on the desk. They can be dragged (past the hold slop) and
   * nudged with the arrow keys, and drops are clamped to the desk band.
   * Candies in the jar leave this unset and ignore drags and arrows.
   */
  desk?: { compact: boolean };
  /** Called once after the completion ghost has finished and the candy is unmounted. */
  onDone?: () => void;
}
/** CSS px per user unit for an element, or 1 when it cannot be measured. */
function measureScale(el: SVGGraphicsElement | null): number {
  const m = el && typeof el.getScreenCTM === 'function' ? el.getScreenCTM() : null;
  if (!m) return 1;
  const s = Math.hypot(m.a, m.b);
  return Number.isFinite(s) && s > 0 ? s : 1;
}
type Phase = 'idle' | 'completing' | 'gone';
/**
 * One interactive candy, drawn as an SVG <g> centered on (x, y).
 *
 * Layers (inner, rotated by `rotation`): MonsterShape (which draws its decay
 * look) then CandyCrack. The BandageNote sits above the candy, unrotated.
 * Its sideways and vertical shift, and its tail position, come from
 * notePlacement.ts so the note stays inside the jar glass (or on screen for
 * lifted and desk candies). The jar position is the candy's own x and y, and
 * the zone is `desk ? 'desk' : 'jar'`, so standalone use needs no extra props.
 *
 * Hit area: a transparent, axis-aligned (never rotated) <rect> centered on the
 * candy, sized max(size, 44 / scale) user units, where scale is the rendered
 * CSS px per user unit. So it is always at least 44x44 CSS px whatever the
 * candy size, rotation or jar scaling.
 *
 * Gestures: hold 0.8 s (pointer or Space) completes via usePressAndHold; a quick
 * tap/click or Enter toggles selection. A press longer than TAP_MAX_MS never
 * also selects. Selected: lifts LIFT_OFFSET_UNITS up and grows by LIFT_SCALE
 * (instant under reduced motion) and shows its note. JarPile owns z-order and
 * should draw the selected candy last and outside the jar clip.
 *
 * Desk candies (`desk` prop) can also be dragged. A drag starts when the
 * pointer travels past MOVE_SLOP_PX, the same slop that cancels the hold, so a
 * still hold still completes. The candy follows the pointer (client px divided
 * by the measured scale), the drop is clamped to the desk band and saved with
 * SET_DESK_POS, and the click that follows never toggles selection. There is
 * no easing on the drop, so reduced motion needs no special case.
 *
 * Completion: while the candy fades and the ghost shows, it is not focusable
 * (tabIndex -1) and hidden from assistive tech, the focus ring is not
 * rendered, and the hit area ignores the pointer. If focus was on the candy it
 * moves to the next candy (see focusHandoff.ts), or to the Add button.
 *
 * Validates: Requirements 3.1, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.5, 4.6, 4.10, 12.3, 13.3
 */
export function CandyItem({ task, x, y, rotation, size = DEFAULT_CANDY_SIZE, jarScale, desk, onDone }: CandyItemProps) {
  const { state, dispatch } = useTaskStore();
  const logicalNow = useHauntClock();
  const reduced = useReducedMotion();
  const stage = decayFunction(task, logicalNow);
  const selected = state.selectedTaskId === task.id;
  const [phase, setPhase] = useState<Phase>('idle');
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [measured, setMeasured] = useState(1);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const rootRef = useRef<SVGGElement>(null);
  const downAt = useRef(0);
  const suppressClick = useRef(false);
  // Pointer press origin (client px) while a desk candy is pressed; null otherwise.
  const press = useRef<{ cx: number; cy: number } | null>(null);
  const dragging = useRef(false);
  const lastDrag = useRef<{ x: number; y: number } | null>(null);
  // A task completed from the context menu never ran the hold gesture, so the
  // phase is still 'idle'; completedAt alone decides, unless the ghost has finished.
  const completing = phase !== 'gone' && task.completedAt !== null;
  // Undo clears completedAt: allow the next completion to show its ghost again.
  if (phase !== 'idle' && task.completedAt === null) setPhase('idle');
  // Focus leaves a completing candy. Runs after the context menu has closed
  // and given focus back to the candy, so the hand-off wins.
  useEffect(() => {
    if (completing && rootRef.current) handOffFocus(rootRef.current, task.id);
  }, [completing, task.id]);
  useLayoutEffect(() => {
    if (jarScale !== undefined) return;
    const update = () => setMeasured(measureScale(rootRef.current));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [jarScale]);
  const scale = jarScale ?? measured;
  const hitSize = Math.max(size, HIT_MIN_PX / scale);
  const { handlers, crackProgress } = usePressAndHold({
    onComplete: () => {
      // A drag cancels the hold at the slop; this is a second guard.
      if (dragging.current) return;
      setPhase('completing');
      dispatch({ type: 'COMPLETE_TASK', taskId: task.id, now: Date.now() });
    },
    disabled: completing,
  });
  const toggleSelect = useCallback(() => {
    dispatch({ type: 'SELECT_TASK', taskId: selected ? null : task.id });
  }, [dispatch, selected, task.id]);
  const endPress = () => {
    if (Date.now() - downAt.current >= TAP_MAX_MS) suppressClick.current = true;
  };
  const onPointerDown = (e: PointerEvent<SVGGElement>) => {
    downAt.current = Date.now();
    suppressClick.current = false;
    dragging.current = false;
    press.current =
      desk && !completing && (e.button === undefined || e.button === 0)
        ? { cx: e.clientX, cy: e.clientY }
        : null;
    handlers.onPointerDown(e);
  };
  const onPointerMove = (e: PointerEvent<SVGGElement>) => {
    // The hook cancels the hold once the pointer passes the slop.
    handlers.onPointerMove(e);
    const origin = press.current;
    if (!desk || !origin || completing) return;
    const dx = e.clientX - origin.cx;
    const dy = e.clientY - origin.cy;
    if (!dragging.current) {
      if (Math.hypot(dx, dy) <= MOVE_SLOP_PX) return;
      dragging.current = true;
      // Keep receiving moves when the pointer outruns the candy.
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        /* capture is a nicety, not required */
      }
    }
    const next = clampToDeskBand({ x: x + dx / scale, y: y + dy / scale }, desk.compact);
    lastDrag.current = next;
    setDragPos(next);
  };
  const finishDrag = (save: boolean) => {
    press.current = null;
    if (!dragging.current) return;
    dragging.current = false;
    suppressClick.current = true; // the click after a drag must not select
    const drop = lastDrag.current;
    lastDrag.current = null;
    setDragPos(null);
    if (save && drop) dispatch({ type: 'SET_DESK_POS', taskId: task.id, pos: drop });
  };
  const onPointerUp = (e: PointerEvent<SVGGElement>) => {
    endPress();
    handlers.onPointerUp(e);
    finishDrag(true);
  };
  const onPointerCancel = (e: PointerEvent<SVGGElement>) => {
    endPress();
    handlers.onPointerCancel(e);
    finishDrag(false);
  };
  const onClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (completing) return;
    toggleSelect();
  };
  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!completing) toggleSelect();
      return;
    }
    const arrow = ARROWS[e.key];
    if (arrow) {
      if (desk && selected && !completing) {
        e.preventDefault();
        const step = e.shiftKey ? NUDGE_STEP_BIG : NUDGE_STEP;
        const pos = clampToDeskBand({ x: x + arrow[0] * step, y: y + arrow[1] * step }, desk.compact);
        dispatch({ type: 'SET_DESK_POS', taskId: task.id, pos });
      }
      return;
    }
    handlers.onKeyDown(e);
  };
  const finish = () => {
    setPhase('gone');
    onDone?.();
  };
  if (phase === 'gone' && task.completedAt !== null) return null;
  const showNote = !completing && (selected || hovered || focused);
  const half = size / 2;
  const boxScale = size / 100;
  const ghostScale = (size * 1.3) / 100;
  const note = noteOffset(dragPos?.x ?? x, dragPos?.y ?? y, desk ? 'desk' : 'jar', desk?.compact ?? false, selected, half);
  const liftStyle = {
    transform: selected && !completing
      ? `translateY(${-LIFT_OFFSET_UNITS}px) scale(${LIFT_SCALE})`
      : 'translateY(0px) scale(1)',
  };
  const liftClass = reduced ? 'candy-item__lift candy-item__lift--instant' : 'candy-item__lift';
  const visualClass = completing ? 'candy-item__visual candy-item__visual--fading' : 'candy-item__visual';
  const rootClass = ['candy-item', desk ? 'candy-item--desk' : '', dragPos ? 'candy-item--dragging' : '']
    .filter(Boolean)
    .join(' ');
  const hintId = `candy-hint-${task.id}`;
  return (
    <g
      ref={rootRef}
      className={rootClass}
      data-testid="candy-item"
      data-task-id={task.id}
      data-decay-stage={stage}
      data-selected={selected ? 'true' : 'false'}
      data-completing={completing ? 'true' : undefined}
      transform={`translate(${dragPos?.x ?? x} ${dragPos?.y ?? y})`}
      role="button"
      tabIndex={completing ? -1 : 0}
      aria-hidden={completing ? true : undefined}
      aria-label={`${task.title}, ${stage}`}
      aria-describedby={desk ? hintId : undefined}
      aria-pressed={selected}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={(e) => {
        setHovered(false);
        handlers.onPointerLeave(e);
      }}
      onPointerEnter={() => setHovered(true)}
      onKeyDown={onKeyDown}
      onKeyUp={handlers.onKeyUp}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        handlers.onBlur();
      }}
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {desk && <desc id={hintId}>{DESK_HINT}</desc>}
      {/* Axis-aligned (not rotated) so the target never shrinks with candy rotation. */}
      <rect
        data-testid="candy-hit-area"
        x={-hitSize / 2}
        y={-hitSize / 2}
        width={hitSize}
        height={hitSize}
        fill="transparent"
        pointerEvents={completing ? 'none' : 'all'}
      />
      <g className={liftClass} data-testid="candy-lift" style={liftStyle}>
        <g className={visualClass} data-testid="candy-visual">
          <g transform={`rotate(${rotation})`}>
            <MonsterShape
              kind={task.monster}
              decayStage={stage}
              nested={{ x: -half, y: -half, width: size }}
            />
            <g transform={`translate(${-half} ${-half}) scale(${boxScale})`}>
              <CandyCrack progress={crackProgress} />
            </g>
          </g>
        </g>
        {/* Focus ring: dark under-stroke plus dashed light stroke, a shape cue and not color alone. Not rendered while completing. */}
        {!completing && (
          <g className="candy-item__focus-ring" data-testid="candy-focus-ring" aria-hidden="true" pointerEvents="none" fill="none">
            <circle r={size * 0.6} stroke="#12061c" strokeWidth="5" />
            <circle r={size * 0.6} stroke="#fff8ee" strokeWidth="2.5" strokeDasharray="6 4" />
          </g>
        )}
        {showNote && (
          <g
            className="candy-item__note"
            data-testid="candy-note"
            data-note-dx={note.dx.toFixed(2)}
            data-note-dy={note.dy.toFixed(2)}
            transform={`translate(${note.dx} ${noteRestY(half) + note.dy})`}
            aria-hidden="true"
            pointerEvents="none"
          >
            <BandageNote taskId={task.id} title={task.title} selected={selected} tailX={note.tailX} />
          </g>
        )}
      </g>
      {completing && (
        <g transform={`translate(${-50 * ghostScale} ${-60 * ghostScale}) scale(${ghostScale})`} pointerEvents="none">
          <GhostCheer onDone={finish} />
        </g>
      )}
    </g>
  );
}
