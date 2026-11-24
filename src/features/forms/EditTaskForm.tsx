import { useState, type FormEvent } from 'react'
import { useTaskStore } from '../tasks/taskStore'
import type { MonsterKind, Task } from '../tasks/taskTypes'
import { FormFrame, TaskFields, dateInputToTimestamp, timestampToDateInput } from './taskFormShared'
import './AddTaskForm.css'

export interface EditTaskFormProps {
  task: Task
  onClose: () => void
}

function FormBody({ task, onClose, headingId }: EditTaskFormProps & { headingId: string }) {
  const { dispatch } = useTaskStore()
  const initialDue = timestampToDateInput(task.dueDate)
  const [title, setTitle] = useState(task.title)
  const [due, setDue] = useState(initialDue)
  const [monster, setMonster] = useState<MonsterKind>(task.monster)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (title.trim().length === 0) {
      setError('Give your candy a name!')
      return
    }
    // An untouched date keeps the original timestamp exactly (no time-of-day shift).
    const dueDate = due === initialDue ? task.dueDate : dateInputToTimestamp(due)
    dispatch({
      type: 'EDIT_TASK',
      taskId: task.id,
      payload: { title: title.trim(), dueDate, monster },
    })
    onClose()
  }

  return (
    <form className="add-task-form" onSubmit={onSubmit} noValidate>
      <h2 id={headingId} className="add-task-form__heading">
        Edit candy
      </h2>
      <TaskFields
        title={title}
        onTitleChange={(v) => {
          setTitle(v)
          if (error) setError(null)
        }}
        due={due}
        onDueChange={setDue}
        monster={monster}
        // A task always has a monster, so clicking the selected one (null) keeps the current value.
        onMonsterChange={(kind) => {
          if (kind !== null) setMonster(kind)
        }}
        error={error}
      />
      <div className="add-task-form__actions">
        <button type="button" className="add-task-form__btn add-task-form__btn--ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="add-task-form__btn">
          Save
        </button>
      </div>
    </form>
  )
}

/**
 * Edit-a-candy form. Same layout as AddTaskForm, pre-populated from `task`.
 * Cancel, Escape and backdrop click discard changes.
 */
export function EditTaskForm({ task, onClose }: EditTaskFormProps) {
  return (
    <FormFrame onClose={onClose}>
      {(headingId) => <FormBody task={task} onClose={onClose} headingId={headingId} />}
    </FormFrame>
  )
}

export default EditTaskForm
