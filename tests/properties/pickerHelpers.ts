import { screen } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'

type User = ReturnType<typeof userEvent.setup>

/**
 * Chooses a date ("yyyy-mm-dd") in the themed date picker: opens it, uses
 * PageUp or PageDown to reach the month (focus starts on the selected day or
 * today), then clicks the day. An empty value clicks the "No date" quick pick.
 */
export async function chooseDate(user: User, value: string): Promise<void> {
  await user.click(screen.getByLabelText('Due date (optional)'))
  if (!value) {
    await user.click(screen.getByRole('button', { name: 'No date' }))
    return
  }
  const start = (document.activeElement as HTMLElement).dataset.date ?? value
  const diff = (Number(value.slice(0, 4)) - Number(start.slice(0, 4))) * 12 + Number(value.slice(5, 7)) - Number(start.slice(5, 7))
  for (let i = 0; i < Math.abs(diff); i += 1) await user.keyboard(diff > 0 ? '{PageDown}' : '{PageUp}')
  await user.click(document.querySelector(`[data-date="${value}"]`) as HTMLElement)
}

/** Chooses a time ("HH:MM", a 30-minute step) in the themed time picker. An empty value clicks "No time". */
export async function chooseTime(user: User, value: string): Promise<void> {
  await user.click(screen.getByLabelText('Time (optional)'))
  if (!value) {
    await user.click(screen.getByRole('button', { name: 'No time' }))
    return
  }
  await user.click(document.querySelector(`[data-value="${value}"]`) as HTMLElement)
}
