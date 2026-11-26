import { useCallback, useState } from 'react'
import { TaskStoreProvider } from './features/tasks/taskStore'
import { DeskBackground } from './features/scene/DeskBackground'
import { JarPile } from './features/jar/JarPile'
import { EmptyState } from './features/jar/EmptyState'
import { ContextMenu } from './features/contextMenu/ContextMenu'
import { UndoToast } from './features/undo/UndoToast'
import { AnnounceProvider } from './features/undo/announce'
import { AddTaskForm } from './features/forms/AddTaskForm'
import { EditTaskForm } from './features/forms/EditTaskForm'
import { HelpButton } from './features/help/HelpButton'
import { HowItWorks } from './features/help/HowItWorks'
import { IntroGuide } from './features/help/IntroGuide'
import type { Task } from './features/tasks/taskTypes'
import { loadSeenIntro, saveSeenIntro } from './utils/persistence'
import './App.css'
/** Dev demo mode (?demo=): no intro, and the intro key is never written. */
const isDemoMode = () => import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')
function App() {
  const [addOpen, setAddOpen] = useState(false)
  const closeAdd = useCallback(() => setAddOpen(false), [])
  // The context menu deselects the task when Edit is chosen, so keep it here.
  const [editing, setEditing] = useState<Task | null>(null)
  const closeEdit = useCallback(() => setEditing(null), [])
  const [introOpen, setIntroOpen] = useState(() => !isDemoMode() && !loadSeenIntro())
  const closeIntro = useCallback(() => {
    if (!isDemoMode()) saveSeenIntro()
    setIntroOpen(false)
  }, [])
  const [helpOpen, setHelpOpen] = useState(false)
  const closeHelp = useCallback(() => setHelpOpen(false), [])
  const showIntroAgain = useCallback(() => {
    setHelpOpen(false)
    setIntroOpen(true)
  }, [])

  return (
    <TaskStoreProvider>
      <AnnounceProvider>
        <DeskBackground>
          <JarPile overlay={<EmptyState />} />
        </DeskBackground>
        <ContextMenu onEdit={setEditing} />
        <h1 className="app-title">Haunted Candy Jar</h1>
        <HelpButton onClick={() => setHelpOpen(true)} />
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
        {helpOpen && <HowItWorks onClose={closeHelp} onShowIntro={showIntroAgain} />}
        {introOpen && <IntroGuide onClose={closeIntro} />}
        <UndoToast />
      </AnnounceProvider>
    </TaskStoreProvider>
  )
}
export default App
