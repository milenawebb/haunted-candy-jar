import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App'
import { loadSeenIntro, saveSeenIntro } from '../../src/utils/persistence'

const KEY = 'hcj_seen_intro'
const EM_DASH = String.fromCharCode(0x2014)
const COPY = [
  'Every task is a candy in your jar.',
  'Leave it too long and it rots: Fresh, Dull, Spooky, Haunted, Cursed.',
  'Cursed candies escape onto your desk. Tap a candy for options, or press and hold to crack it open and finish it.',
]

function mockMedia(mobile: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: mobile && query.includes('max-width: 767px'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

const intro = () => screen.queryByRole('dialog', { name: 'Welcome to the jar' })
const panel = () => screen.queryByRole('dialog', { name: 'How it works' })

describe('intro guide', () => {
  const originalMatchMedia = window.matchMedia
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.removeItem(KEY)
    mockMedia(false)
  })
  afterEach(() => {
    window.matchMedia = originalMatchMedia
    window.history.pushState({}, '', '/')
  })

  it('shows on first visit and not when the key is set', () => {
    const first = render(<App />)
    expect(intro()).toBeInTheDocument()
    expect(intro()).toHaveAttribute('aria-modal', 'true')
    first.unmount()
    saveSeenIntro()
    render(<App />)
    expect(intro()).not.toBeInTheDocument()
  })

  it('shows the exact copy, a step indicator, and Next, Back and Got it', async () => {
    const user = userEvent.setup()
    render(<App />)
    const dialog = intro()!
    const back = within(dialog).getByRole('button', { name: 'Back' })
    expect(back).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Skip' })).toBeInTheDocument()
    for (let i = 0; i < 3; i++) {
      expect(within(dialog).getByText(COPY[i]!)).toBeInTheDocument()
      expect(within(dialog).getByText(`${i + 1} of 3`)).toBeInTheDocument()
      if (i < 2) await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    }
    expect(within(dialog).queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    await user.click(back)
    expect(within(dialog).getByText(COPY[1]!)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    await user.click(within(dialog).getByRole('button', { name: 'Got it' }))
    expect(intro()).not.toBeInTheDocument()
    expect(loadSeenIntro()).toBe(true)
    expect(window.localStorage.getItem(KEY)).toBe('true')
  })

  it('Skip closes and sets the key', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Skip' }))
    expect(intro()).not.toBeInTheDocument()
    expect(window.localStorage.getItem(KEY)).toBe('true')
  })

  it('Escape closes and sets the key', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.keyboard('{Escape}')
    expect(intro()).not.toBeInTheDocument()
    expect(window.localStorage.getItem(KEY)).toBe('true')
  })

  it('has no em dash in its text on any card', async () => {
    const user = userEvent.setup()
    render(<App />)
    const dialog = intro()!
    for (let i = 0; i < 3; i++) {
      expect(dialog.textContent).not.toContain(EM_DASH)
      if (i < 2) await user.click(within(dialog).getByRole('button', { name: 'Next' }))
    }
  })

  it('renders in the BottomSheet on mobile', () => {
    mockMedia(true)
    render(<App />)
    expect(within(screen.getByTestId('bottom-sheet')).getByText(COPY[0]!)).toBeInTheDocument()
  })

  it('is skipped in demo mode and does not write the key', () => {
    window.history.pushState({}, '', '/?demo=8')
    render(<App />)
    expect(intro()).not.toBeInTheDocument()
    expect(window.localStorage.getItem(KEY)).toBeNull()
  })
})

describe('How it works panel', () => {
  const originalMatchMedia = window.matchMedia
  beforeEach(() => {
    window.localStorage.clear()
    mockMedia(false)
  })
  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('has a help button with an accessible name that opens the panel', async () => {
    const user = userEvent.setup()
    render(<App />)
    const button = screen.getByRole('button', { name: 'How it works' })
    expect(panel()).not.toBeInTheDocument()
    await user.click(button)
    expect(panel()).toHaveAttribute('aria-modal', 'true')
    expect(within(panel()!).getByRole('heading', { name: 'How it works' })).toBeInTheDocument()
  })

  it('lists all five stages with a candy and a line, the escape line and the gestures', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'How it works' }))
    const dialog = panel()!
    const rows = within(dialog).getAllByTestId('help-stage')
    expect(rows).toHaveLength(5)
    const lines = [
      ['Fresh', 'Due in more than 2 days, or added under 3 days ago.'],
      ['Dull', 'Due within 2 days, or 3 to 7 days old.'],
      ['Spooky', 'Due within a day, or 7 to 14 days old.'],
      ['Haunted', 'Due within 2 hours or up to a day late, or 14 to 21 days old.'],
      ['Cursed', 'More than a day late, or 21 days old or more.'],
    ] as const
    lines.forEach(([stage, line], i) => {
      expect(rows[i]).toHaveTextContent(stage)
      expect(rows[i]).toHaveTextContent(line)
      expect(rows[i]!.querySelector(`svg[data-decay-stage="${stage}"]`)).not.toBeNull()
    })
    expect(
      within(dialog).getByText('Cursed candies escape the jar and wait on your desk until you deal with them.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/Tap a candy for options/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Press and hold a candy to complete it/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Drag desk candies to move them/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Undo after completing or deleting/)).toBeInTheDocument()
    expect(dialog.textContent).not.toContain(EM_DASH)
  })

  it('"Show the intro again" closes the panel and reopens the intro', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'How it works' }))
    await user.click(screen.getByRole('button', { name: 'Show the intro again' }))
    expect(panel()).not.toBeInTheDocument()
    expect(intro()).toBeInTheDocument()
    expect(screen.getByText(COPY[0]!)).toBeInTheDocument()
  })

  it('Escape closes it and focus returns to the help button', async () => {
    const user = userEvent.setup()
    render(<App />)
    const button = screen.getByRole('button', { name: 'How it works' })
    await user.click(button)
    await act(async () => {})
    await user.keyboard('{Escape}')
    expect(panel()).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('renders in the BottomSheet on mobile', async () => {
    mockMedia(true)
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'How it works' }))
    expect(within(screen.getByTestId('bottom-sheet')).getByRole('heading', { name: 'How it works' })).toBeInTheDocument()
  })
})
