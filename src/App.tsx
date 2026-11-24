import { TaskStoreProvider } from './features/tasks/taskStore'
import { DeskBackground } from './features/scene/DeskBackground'
import { JarPile } from './features/jar/JarPile'
import { EmptyState } from './features/jar/EmptyState'
import { ContextMenu } from './features/contextMenu/ContextMenu'
import { UndoToast } from './features/undo/UndoToast'
import './App.css'

function App() {
  return (
    <TaskStoreProvider>
      <DeskBackground>
        <JarPile overlay={<EmptyState />} />
      </DeskBackground>
      <ContextMenu />
      <h1 className="app-title">Haunted Candy Jar</h1>
      <UndoToast />
    </TaskStoreProvider>
  )
}

export default App
