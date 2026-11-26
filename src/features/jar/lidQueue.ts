/**
 * Pure lid queue. No timers, no DOM. LidAnimation feeds it events and calls
 * `advance` when each phase timer fires.
 *
 * One event is handled at a time, in order. Each event runs the phases
 * opening, open, closing exactly once, so N events give N open/close pairs.
 * While the lid is open the candy drops in (add), floats out (remove) or
 * hops out onto the desk (escape, a candy that just turned Cursed).
 */
import type { Task } from '../tasks/taskTypes';

export type LidEventKind = 'add' | 'remove' | 'escape';

export interface LidEvent {
  kind: LidEventKind;
  id: string;
}

export type LidPhase = 'idle' | 'opening' | 'open' | 'closing';

export interface LidQueueState {
  /** Events waiting for their turn, oldest first. */
  pending: readonly LidEvent[];
  /** The event the lid is working on, or null when idle. */
  current: LidEvent | null;
  phase: LidPhase;
  /**
   * Ids of added or escaping candies that have not been released yet. JarPile
   * keeps these hidden until the lid is open, then lets them drop or hop.
   */
  waiting: readonly string[];
}

export const initialLidQueue: LidQueueState = {
  pending: [],
  current: null,
  phase: 'idle',
  waiting: [],
};

/** Moves to the next pending event when idle. Otherwise returns the state as is. */
function startNext(state: LidQueueState): LidQueueState {
  if (state.phase !== 'idle') return state;
  const [next, ...rest] = state.pending;
  if (!next) return state;
  return { ...state, pending: rest, current: next, phase: 'opening' };
}

/**
 * Adds events to the queue. A remove for a candy whose add (or escape) is
 * still queued cancels both, since that candy never showed up. Starts right
 * away when idle.
 */
export function enqueue(state: LidQueueState, events: readonly LidEvent[]): LidQueueState {
  let pending = state.pending.slice();
  let waiting = state.waiting.slice();
  for (const event of events) {
    if (event.kind === 'add' || event.kind === 'escape') {
      pending.push(event);
      waiting.push(event.id);
      continue;
    }
    const queuedAdd = pending.findIndex((e) => e.kind !== 'remove' && e.id === event.id);
    waiting = waiting.filter((id) => id !== event.id);
    if (queuedAdd >= 0) {
      pending = pending.filter((_, i) => i !== queuedAdd);
    } else {
      pending.push(event);
    }
  }
  return startNext({ ...state, pending, waiting });
}

/** Moves one phase forward: opening, open, closing, then the next event or idle. */
export function advance(state: LidQueueState): LidQueueState {
  switch (state.phase) {
    case 'idle':
      return startNext(state);
    case 'opening': {
      const cur = state.current;
      const waiting =
        cur && cur.kind !== 'remove' ? state.waiting.filter((id) => id !== cur.id) : state.waiting;
      return { ...state, phase: 'open', waiting };
    }
    case 'open':
      return { ...state, phase: 'closing' };
    case 'closing':
      return startNext({ ...state, phase: 'idle', current: null });
  }
}

/** True while the lid is lifted and tilted. */
export function isLidOpen(phase: LidPhase): boolean {
  return phase === 'opening' || phase === 'open';
}

/** Runs a list of events to the end and returns the phases seen, for tests. */
export function runQueue(events: readonly LidEvent[]): { phase: LidPhase; event: LidEvent }[] {
  const trace: { phase: LidPhase; event: LidEvent }[] = [];
  let state = enqueue(initialLidQueue, events);
  let guard = 0;
  while (state.phase !== 'idle' && guard++ < 10_000) {
    if (state.current) trace.push({ phase: state.phase, event: state.current });
    state = advance(state);
  }
  return trace;
}

/**
 * Works out which lid events a change of the task list should cause.
 *
 * - A task id that becomes live (not completed) is an add. Undoing a delete
 *   or a completion counts, because the candy comes back.
 * - A task id that stops being live is a remove (completion or delete).
 * - Whole-list replacements are silent: several removals at once (Clear
 *   samples), an add together with a removal (import over an existing jar),
 *   and several adds into an empty jar (first load, samples, import).
 */
export function diffLidEvents(prev: readonly Task[], next: readonly Task[]): LidEvent[] {
  const live = (tasks: readonly Task[]) =>
    new Set(tasks.filter((t) => t.completedAt === null).map((t) => t.id));
  const before = live(prev);
  const after = live(next);
  const added = [...after].filter((id) => !before.has(id));
  const removed = [...before].filter((id) => !after.has(id));
  if (removed.length > 1) return [];
  if (added.length > 0 && removed.length > 0) return [];
  if (before.size === 0 && added.length > 1) return [];
  return [
    ...removed.map((id): LidEvent => ({ kind: 'remove', id })),
    ...added.map((id): LidEvent => ({ kind: 'add', id })),
  ];
}

/** Where each live candy sits (jar or desk) and whether it is Cursed. Completed candies are left out. */
export type ZoneSnapshot = ReadonlyMap<string, { zone: 'jar' | 'desk'; cursed: boolean }>;

/**
 * Lid events for candies that changed zone between two renders because the
 * clock or an edit changed their Cursed state. Only candies present in both
 * snapshots count, so first renders, imports and demo seeding stay silent.
 *
 * - jar to desk and now Cursed: an escape (the candy hops out).
 * - desk to jar, was Cursed and is not any more: an add (the candy drops back in).
 * A candy that moves zones for any other reason (a bigger import pushing it
 * into the overflow) is not an event.
 */
export function diffZoneEvents(prev: ZoneSnapshot, next: ZoneSnapshot): LidEvent[] {
  const events: LidEvent[] = [];
  for (const [id, n] of next) {
    const p = prev.get(id);
    if (!p) continue;
    if (p.zone === 'jar' && n.zone === 'desk' && n.cursed) events.push({ kind: 'escape', id });
    else if (p.zone === 'desk' && n.zone === 'jar' && p.cursed && !n.cursed) events.push({ kind: 'add', id });
  }
  return events;
}
