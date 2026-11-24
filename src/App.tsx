import { useCallback, useState } from 'react'
import { TaskStoreProvider } from './features/tasks/taskStore'
import { DeskBackground } from './features/scene/DeskBackground'
import { JarPile } from './features/jar/JarPile'
import { EmptyState } from './features/jar/EmptyState'
import { ContextMenu } from './features/contextMenu/ContextMenu'
import { UndoToast } from './features/undo/UndoToast'
import { AddTaskForm } from './features/forms/AddTaskForm'
import { EditTaskForm } from './features/forms/EditTaskForm'
import type { Task } from './features/tasks/taskTypes'
import './App.css'

function App() {
  const [addOpen, setAddOpen] = useState(false)
  const closeAdd = useCallback(() => setAddOpen(false), [])
  // The context menu deselects the task when Edit is chosen, so keep it here.
  const [editing, setEditing] = useState<Task | null>(null)
  const closeEdit = useCallback(() => setEditing(null), [])
  return (
    <TaskStoreProvider>
      <DeskBackground>
        <JarPile overlay={<EmptyState />} />
      </DeskBackground>
      <ContextMenu onEdit={setEditing} />
      <h1 className="app-title">Haunted Candy Jar</h1>
      {/* TEMPORARY: task 38's top bar replaces this button. Bottom right; the undo toast goes bottom center. */}
      <button
        type="button"
        className="add-candy-fab"
        aria-haspopup="dialog"
        onClick={() => setAddOpen(true)}
      >
        Add a candy
      </button>
      {addOpen && <AddTaskForm onClose={closeAdd} />}
      {editing && <EditTaskForm key={editing.id} task={editing} onClose={closeEdit} />}
      <UndoToast />
    </TaskStoreProvider>
  )
}

export default App
