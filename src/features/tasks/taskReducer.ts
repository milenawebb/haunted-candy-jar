/** Pure app reducer. No DOM, no storage, no timers. */
import { createTask } from './createTask';
import type {
  CreateTaskInput,
  EditTaskInput,
  FocusSession,
  Task,
} from './taskTypes';

export type HauntSpeed = 1 | 60 | 3600;

export interface PendingUndo {
  task: Task; // snapshot of the task immediately before the action
  action: 'complete' | 'delete';
  index: number; // position in tasks before the action (restores exact order)
}

export interface AppState {
  tasks: Task[];
  selectedTaskId: string | null;
  pendingUndo: PendingUndo | null;
  focusSession: FocusSession | null;
  soundEnabled: boolean;
  hauntSpeed: HauntSpeed;
}

/**
 * `now` is optional on actions that stamp a time. Callers pass it to keep the
 * reducer deterministic; it falls back to Date.now() only when omitted.
 * createTask also calls generateId() for new ids.
 */
export type AppAction =
  | { type: 'CREATE_TASK'; payload: CreateTaskInput; now?: number }
  | { type: 'COMPLETE_TASK'; taskId: string; now?: number }
  | { type: 'DELETE_TASK'; taskId: string }
  | { type: 'EDIT_TASK'; taskId: string; payload: EditTaskInput }
  | { type: 'SELECT_TASK'; taskId: string | null }
  | { type: 'UNDO' }
  | { type: 'UNDO_EXPIRED' }
  | { type: 'START_FOCUS'; taskId: string; durationMinutes: number; now?: number }
  | { type: 'END_FOCUS'; markComplete: boolean; now?: number }
  | { type: 'SET_SOUND'; enabled: boolean }
  | { type: 'SET_HAUNT_SPEED'; speed: HauntSpeed }
  | { type: 'IMPORT_TASKS'; tasks: Task[] }
  | { type: 'CLEAR_SAMPLES' };

export const initialAppState: AppState = {
  tasks: [],
  selectedTaskId: null,
  pendingUndo: null,
  focusSession: null,
  soundEnabled: false,
  hauntSpeed: 1,
};

/** Permanently applies a pending action (a completed task leaves the jar). */
function commitPending(state: AppState): AppState {
  const pending = state.pendingUndo;
  if (!pending) return state;
  return {
    ...state,
    tasks: state.tasks.filter((t) => t.id !== pending.task.id),
    pendingUndo: null,
  };
}

function completeTask(state: AppState, taskId: string, now: number): AppState {
  const base = commitPending(state); // only one undo toast at a time (Req 5.5)
  const index = base.tasks.findIndex((t) => t.id === taskId);
  if (index < 0) return state;
  const task = base.tasks[index];
  if (!task || task.completedAt !== null) return state;
  const tasks = base.tasks.slice();
  tasks[index] = { ...task, completedAt: now };
  return {
    ...base,
    tasks,
    selectedTaskId: base.selectedTaskId === taskId ? null : base.selectedTaskId,
    pendingUndo: { task, action: 'complete', index },
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'CREATE_TASK': {
      if (action.payload.title.trim().length === 0) return state;
      const task = createTask(action.payload, action.now ?? Date.now());
      return { ...state, tasks: [...state.tasks, task] };
    }
    case 'COMPLETE_TASK':
      return completeTask(state, action.taskId, action.now ?? Date.now());
    case 'DELETE_TASK': {
      const base = commitPending(state);
      const index = base.tasks.findIndex((t) => t.id === action.taskId);
      if (index < 0) return state;
      const task = base.tasks[index];
      if (!task) return state;
      return {
        ...base,
        tasks: base.tasks.filter((t) => t.id !== action.taskId),
        selectedTaskId:
          base.selectedTaskId === action.taskId ? null : base.selectedTaskId,
        focusSession:
          base.focusSession?.taskId === action.taskId ? null : base.focusSession,
        pendingUndo: { task, action: 'delete', index },
      };
    }
    case 'EDIT_TASK': {
      const title = action.payload.title.trim();
      if (title.length === 0) return state;
      if (!state.tasks.some((t) => t.id === action.taskId)) return state;
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? {
                ...t,
                title,
                dueDate: action.payload.dueDate,
                monster: action.payload.monster,
              }
            : t,
        ),
      };
    }
    case 'SELECT_TASK':
      return { ...state, selectedTaskId: action.taskId };
    case 'UNDO': {
      const pending = state.pendingUndo;
      if (!pending) return state;
      let tasks: Task[];
      if (pending.action === 'complete') {
        tasks = state.tasks.map((t) => (t.id === pending.task.id ? pending.task : t));
      } else {
        tasks = state.tasks.slice();
        tasks.splice(Math.min(pending.index, tasks.length), 0, pending.task);
      }
      return { ...state, tasks, pendingUndo: null };
    }
    case 'UNDO_EXPIRED':
      return commitPending(state);
    case 'START_FOCUS': {
      if (!state.tasks.some((t) => t.id === action.taskId)) return state;
      return {
        ...state,
        focusSession: {
          taskId: action.taskId,
          durationSeconds: Math.round(action.durationMinutes * 60),
          startedAt: action.now ?? Date.now(),
        },
      };
    }
    case 'END_FOCUS': {
      const session = state.focusSession;
      if (!session) return state;
      const ended: AppState = { ...state, focusSession: null };
      return action.markComplete
        ? completeTask(ended, session.taskId, action.now ?? Date.now())
        : ended;
    }
    case 'SET_SOUND':
      return { ...state, soundEnabled: action.enabled };
    case 'SET_HAUNT_SPEED':
      return { ...state, hauntSpeed: action.speed };
    case 'IMPORT_TASKS':
      return {
        ...state,
        tasks: action.tasks,
        selectedTaskId: null,
        pendingUndo: null,
        focusSession: null,
      };
    case 'CLEAR_SAMPLES': {
      const tasks = state.tasks.filter((t) => !t.isSample);
      const ids = new Set(tasks.map((t) => t.id));
      return {
        ...state,
        tasks,
        selectedTaskId:
          state.selectedTaskId && ids.has(state.selectedTaskId)
            ? state.selectedTaskId
            : null,
        pendingUndo: null,
        focusSession:
          state.focusSession && ids.has(state.focusSession.taskId)
            ? state.focusSession
            : null,
      };
    }
  }
}
