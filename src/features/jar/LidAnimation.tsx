/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { Task } from '../tasks/taskTypes';
import { JarLid } from './JarLid';
import { JAR_LID_PIVOT } from './jarGeometry';
import {
  advance,
  diffLidEvents,
  diffZoneEvents,
  enqueue,
  initialLidQueue,
  isLidOpen,
  type LidPhase,
  type LidQueueState,
  type ZoneSnapshot,
} from './lidQueue';
import './LidAnimation.css';

/** How far the lid rises (viewBox units) and how far it tilts (degrees). */
export const LID_LIFT = 44;
export const LID_TILT_DEG = -12;

/** Phase lengths in ms. The lid lifts and tilts in about 350 ms. */
export const LID_OPEN_MS = 350;
export const LID_HOLD_ADD_MS = 500; // candy drop-in (650 ms spring) is mostly done
export const LID_HOLD_REMOVE_MS = 400; // candy floats out
export const LID_HOLD_ESCAPE_MS = 850; // candy hop (800 ms) is done
export const LID_CLOSE_MS = 350;
/** Reduced motion: the lid stays put, so phases only pace the callbacks. */
export const LID_REDUCED_MS = 150;

export interface UseLidSequenceOptions {
  tasks: readonly Task[];
  /**
   * Zone and Cursed state of every live candy (optional). When it changes,
   * candies that escaped the jar or came back get their own lid events. Keep
   * it referentially stable between renders where nothing changed.
   */
  snapshot?: ZoneSnapshot;
  /** Called when the lid starts to open (lid creak sound). */
  onLidOpen?: () => void;
  /** Called when the lid starts to close (glass clink sound). */
  onLidClose?: () => void;
}

export interface LidSequence {
  phase: LidPhase;
  /** True while a newly added or escaping candy must wait for the lid before it moves. */
  isWaiting: (id: string) => boolean;
}

function phaseMs(queue: LidQueueState, reduced: boolean): number {
  if (reduced) return LID_REDUCED_MS;
  switch (queue.phase) {
    case 'opening':
      return LID_OPEN_MS;
    case 'open':
      if (queue.current?.kind === 'remove') return LID_HOLD_REMOVE_MS;
      return queue.current?.kind === 'escape' ? LID_HOLD_ESCAPE_MS : LID_HOLD_ADD_MS;
    default:
      return LID_CLOSE_MS;
  }
}

/**
 * Watches the task list and runs the lid sequence for each add, remove or
 * escape, one candy at a time (see lidQueue.ts for the rules). The first
 * render and whole-list replacements (imports, samples) are silent.
 *
 * Under reduced motion the callbacks still fire in order, candies never wait
 * for the lid (they just fade in), and the lid does not move.
 */
export function useLidSequence({ tasks, snapshot, onLidOpen, onLidClose }: UseLidSequenceOptions): LidSequence {
  const reduced = useReducedMotion();
  const [track, setTrack] = useState<{
    tasks: readonly Task[];
    snapshot: ZoneSnapshot | undefined;
    queue: LidQueueState;
  }>(() => ({
    tasks,
    snapshot,
    queue: initialLidQueue,
  }));
  // Derive the queue from the new task list during render, so a new candy is
  // already marked as waiting in the same frame it appears.
  if (track.tasks !== tasks || track.snapshot !== snapshot) {
    const events = [
      ...(track.tasks !== tasks ? diffLidEvents(track.tasks, tasks) : []),
      ...(track.snapshot && snapshot ? diffZoneEvents(track.snapshot, snapshot) : []),
    ];
    setTrack({ tasks, snapshot, queue: enqueue(track.queue, events) });
  }
  const { queue } = track;
  const activeEvent = queue.current;

  const openRef = useRef(onLidOpen);
  const closeRef = useRef(onLidClose);
  useEffect(() => {
    openRef.current = onLidOpen;
    closeRef.current = onLidClose;
  });

  // Callbacks fire once per phase change into opening or closing.
  useEffect(() => {
    if (queue.phase === 'opening') openRef.current?.();
    else if (queue.phase === 'closing') closeRef.current?.();
  }, [queue.phase, activeEvent]);

  // One timer per phase. Cleared on unmount or when the phase changes.
  const ms = queue.phase === 'idle' ? 0 : phaseMs(queue, reduced);
  useEffect(() => {
    if (queue.phase === 'idle') return;
    const timer = setTimeout(() => {
      setTrack((t) => ({ ...t, queue: advance(t.queue) }));
    }, ms);
    return () => clearTimeout(timer);
  }, [queue.phase, activeEvent, ms]);

  return {
    phase: queue.phase,
    isWaiting: (id) => !reduced && queue.waiting.includes(id),
  };
}

export interface LidAnimationProps {
  phase: LidPhase;
}

/**
 * The jar lid with its lift, tilt, and settle. It moves with a CSS transform
 * (so it can transition) around the lid pivot. Under reduced motion it never
 * gets a transform, so it stays closed.
 */
export function LidAnimation({ phase }: LidAnimationProps) {
  const reduced = useReducedMotion();
  const open = !reduced && isLidOpen(phase);
  const style = reduced
    ? undefined
    : {
        transformOrigin: `${JAR_LID_PIVOT.x}px ${JAR_LID_PIVOT.y}px`,
        transform: open ? `translateY(${-LID_LIFT}px) rotate(${LID_TILT_DEG}deg)` : 'none',
      };
  return (
    <g
      className="lid-animation"
      data-testid="lid-animation"
      data-lid-open={open ? 'true' : 'false'}
      style={style}
    >
      <JarLid />
    </g>
  );
}
