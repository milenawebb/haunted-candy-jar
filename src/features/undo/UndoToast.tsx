/**
 * Placeholder for the undo notification. Renders an empty polite live region
 * so the slot exists in the tree. Task 32 implements the real toast.
 */
export function UndoToast() {
  return <div className="undo-toast-stub" role="status" aria-live="polite" />
}

export default UndoToast
