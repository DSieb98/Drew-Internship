import { createContext, ReactNode, useCallback, useRef, useState } from 'react'

export const AnnounceContext = createContext<(message: string) => void>(() => {})

export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const announce = useCallback((msg: string) => {
    // Clear → set forces re-announcement when the same message repeats.
    setMessage('')
    if (pendingRef.current !== null) clearTimeout(pendingRef.current)
    pendingRef.current = setTimeout(() => {
      setMessage(msg)
      pendingRef.current = null
    }, 50)
  }, [])

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    </AnnounceContext.Provider>
  )
}
