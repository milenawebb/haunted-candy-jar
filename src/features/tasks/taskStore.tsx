/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import {
  loadSoundEnabled,
  loadTasks,
  saveSoundEnabled,
  saveTasks,
} from '../../utils/persistence';
import {
  appReducer,
  initialAppState,
  type AppAction,
  type AppState,
} from './taskReducer';
export type { AppAction, AppState } from './taskReducer';
export interface TaskStore {
  state: AppState;
  dispatch: Dispatch<AppAction>;
}
const TaskStoreContext = createContext<TaskStore | null>(null);
// TEMPORARY dev-only demo mode (?demo=N). Remove once task 39 (sampleData) lands.
// The flag is read synchronously so real tasks are never loaded or overwritten.
const isDemoMode = import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo');
function initState(): AppState {
  return {
    ...initialAppState,
    tasks: isDemoMode ? [] : loadTasks(),
    soundEnabled: loadSoundEnabled(),
  };
}
export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, initState);
  useEffect(() => {
    if (!isDemoMode) saveTasks(state.tasks);
  }, [state.tasks]);
  useEffect(() => {
    saveSoundEnabled(state.soundEnabled);
  }, [state.soundEnabled]);
  // TEMPORARY: seed demo candies (dynamic import, tree-shaken from production).
  useEffect(() => {
    if (!import.meta.env.DEV || !isDemoMode) return;
    let cancelled = false;
    void import('../../dev/demoSeed').then(({ parseDemoCount, buildDemoTasks }) => {
      const count = parseDemoCount(window.location.search);
      if (cancelled || count === null) return;
      dispatch({ type: 'IMPORT_TASKS', tasks: buildDemoTasks(count, Date.now()) });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <TaskStoreContext.Provider value={{ state, dispatch }}>
      {children}
    </TaskStoreContext.Provider>
  );
}
export function useTaskStore(): TaskStore {
  const ctx = useContext(TaskStoreContext);
  if (!ctx) throw new Error('useTaskStore must be used inside TaskStoreProvider');
  return ctx;
}
