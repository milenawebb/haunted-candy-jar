/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/** How long an announcement stays in the live region before it is cleared. */
export const ANNOUNCE_CLEAR_MS = 4000

export const ADDED_TO_JAR_MESSAGE = 'Added to the jar'
export const ADDED_TO_DESK_MESSAGE = 'Jar is full, it landed on the desk'
export const CANDY_ESCAPED_MESSAGE = 'A candy escaped!'
export const CANDY_BACK_IN_JAR_MESSAGE = 'Back in the jar'

interface AnnounceContextValue {
  message: string
  announce: (text: string) => void
}

const AnnounceContext = createContext<AnnounceContextValue>({
  message: '',
  announce: () => {},
})

/**
 * A tiny announce channel for the polite live region owned by UndoToast.
 * UndoToast renders the message in its own visually hidden child, so it never
 * replaces the visible undo text. Without a provider, announce is a no-op.
 * The message clears after ANNOUNCE_CLEAR_MS so a repeat announces again.
 */
export function AnnounceProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const timer = useRef<number | undefined>(undefined)
  const announce = useCallback((text: string) => {
    window.clearTimeout(timer.current)
    setMessage(text)
    timer.current = window.setTimeout(() => setMessage(''), ANNOUNCE_CLEAR_MS)
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const value = useMemo(() => ({ message, announce }), [message, announce])
  return <AnnounceContext.Provider value={value}>{children}</AnnounceContext.Provider>
}

export function useAnnounce(): AnnounceContextValue {
  return useContext(AnnounceContext)
}
