import { TaskStoreProvider } from './features/tasks/taskStore'
import { DeskBackground } from './features/scene/DeskBackground'
import { JarScene } from './features/jar/JarScene'
import { EmptyState } from './features/jar/EmptyState'
import { UndoToast } from './features/undo/UndoToast'
import './App.css'

function App() {
  return (
    <TaskStoreProvider>
      <DeskBackground>
        <JarScene overlay={<EmptyState />} />
      </DeskBackground>
      <h1 className="app-title">Haunted Candy Jar</h1>
      <UndoToast />
    </TaskStoreProvider>
  )
}

export default App
