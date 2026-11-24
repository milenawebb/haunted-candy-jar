import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { usePressAndHold } from '../../hooks/usePressAndHold';
import { useHauntClock } from '../../hooks/useHauntClock';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { JAR_CANDY_RADIUS } from '../jar/jarGeometry';
import { decayFunction } from '../tasks/decayFunction';
import { useTaskStore } from '../tasks/taskStore';
import type { Task } from '../tasks/taskTypes';
import { BandageNote } from './BandageNote';
import { CandyCrack } from './CandyCrack';
import { GhostCheer } from './GhostCheer';
import { CANDY_ART_FILL, MonsterShape } from './MonsterShape';
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
 * Validates: Requirements 3.1, 3.6, 3.7, 4.1, 4.2, 4.3, 4.5, 4.6, 4.10, 12.3
 */
export function CandyItem({ task, x, y, rotation, size = DEFAULT_CANDY_SIZE, jarScale, onDone }: CandyItemProps) {
  const { state, dispatch } = useTaskStore();
  const logicalNow = useHauntClock();
  const reduced = useReducedMotion();
  const stage = decayFunction(task, logicalNow);
  const selected = state.selectedTaskId === task.id;
  const [phase, setPhase] = useState<Phase>('idle');
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [measured, setMeasured] = useState(1);
  const rootRef = useRef<SVGGElement>(null);
  const downAt = useRef(0);
  const suppressClick = useRef(false);
  const completing = phase !== 'idle' && task.completedAt !== null;

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
    handlers.onPointerDown(e);
  };
  const onPointerUp = (e: PointerEvent<SVGGElement>) => {
    endPress();
    handlers.onPointerUp(e);
  };
  const onPointerCancel = (e: PointerEvent<SVGGElement>) => {
    endPress();
    handlers.onPointerCancel(e);
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
  const liftStyle = {
    transform: selected && !completing
      ? `translateY(${-LIFT_OFFSET_UNITS}px) scale(${LIFT_SCALE})`
      : 'translateY(0px) scale(1)',
  };
  const liftClass = reduced ? 'candy-item__lift candy-item__lift--instant' : 'candy-item__lift';
  const visualClass = completing ? 'candy-item__visual candy-item__visual--fading' : 'candy-item__visual';

  return (
    <g
      ref={rootRef}
      className="candy-item"
      data-testid="candy-item"
      data-task-id={task.id}
      data-decay-stage={stage}
      data-selected={selected ? 'true' : 'false'}
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={`${task.title}, ${stage}`}
      aria-pressed={selected}
      onPointerDown={onPointerDown}
      onPointerMove={handlers.onPointerMove}
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
      {/* Axis-aligned (not rotated) so the target never shrinks with candy rotation. */}
      <rect
        data-testid="candy-hit-area"
        x={-hitSize / 2}
        y={-hitSize / 2}
        width={hitSize}
        height={hitSize}
        fill="transparent"
        pointerEvents="all"
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
        {/* Focus ring: dark under-stroke plus dashed light stroke, a shape cue and not color alone. */}
        <g className="candy-item__focus-ring" aria-hidden="true" pointerEvents="none" fill="none">
          <circle r={size * 0.6} stroke="#12061c" strokeWidth="5" />
          <circle r={size * 0.6} stroke="#fff8ee" strokeWidth="2.5" strokeDasharray="6 4" />
        </g>
        {showNote && (
          <g
            className="candy-item__note"
            data-testid="candy-note"
            transform={`translate(0 ${-half - 22})`}
            aria-hidden="true"
            pointerEvents="none"
          >
            <BandageNote taskId={task.id} title={task.title} selected={selected} />
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
