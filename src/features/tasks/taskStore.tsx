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

function initState(): AppState {
  return {
    ...initialAppState,
    tasks: loadTasks(),
    soundEnabled: loadSoundEnabled(),
  };
}

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, initState);

  useEffect(() => {
    saveTasks(state.tasks);
  }, [state.tasks]);

  useEffect(() => {
    saveSoundEnabled(state.soundEnabled);
  }, [state.soundEnabled]);

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
