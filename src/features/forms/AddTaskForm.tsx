import { useState, type FormEvent } from 'react'
import { useTaskStore } from '../tasks/taskStore'
import type { MonsterKind } from '../tasks/taskTypes'
import { FormFrame, TaskFields, dateTimeInputToTimestamp } from './taskFormShared'
import './AddTaskForm.css'

export { TITLE_MAX_LENGTH, dateInputToTimestamp } from './taskFormShared'

export interface AddTaskFormProps {
  onClose: () => void
}

function FormBody({ onClose, headingId }: { onClose: () => void; headingId: string }) {
  const { dispatch } = useTaskStore()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [time, setTime] = useState('')
  const [monster, setMonster] = useState<MonsterKind | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (title.trim().length === 0) {
      setError('Give your candy a name!')
      return
    }
    dispatch({
      type: 'CREATE_TASK',
      payload: { title: title.trim(), dueDate: dateTimeInputToTimestamp(due, time), monster },
      now: Date.now(),
    })
    onClose()
  }

  return (
    <form className="add-task-form" onSubmit={onSubmit} noValidate>
      <h2 id={headingId} className="add-task-form__heading">
        Add a candy
      </h2>
      <TaskFields
        title={title}
        onTitleChange={(v) => {
          setTitle(v)
          if (error) setError(null)
        }}
        due={due}
        onDueChange={setDue}
        time={time}
        onTimeChange={setTime}
        monster={monster}
        onMonsterChange={setMonster}
        error={error}
      />
      <div className="add-task-form__actions">
        <button type="button" className="add-task-form__btn add-task-form__btn--ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="add-task-form__btn">
          Add
        </button>
      </div>
    </form>
  )
}

/**
 * Add-a-candy form. A centered modal on desktop, a BottomSheet on mobile
 * (max-width 767px). Closes on Escape or Cancel without creating a task.
 */
export function AddTaskForm({ onClose }: AddTaskFormProps) {
  return <FormFrame onClose={onClose}>{(headingId) => <FormBody onClose={onClose} headingId={headingId} />}</FormFrame>
}

export default AddTaskForm
