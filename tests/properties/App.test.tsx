import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../../src/App'

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('hcj_seen_intro', 'true')
  })

  it('renders the title and the empty-state prompt without crashing', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Haunted Candy Jar' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Your jar is empty. Drop in a candy!')).toBeVisible()
  })
})
