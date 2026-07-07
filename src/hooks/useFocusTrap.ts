import { useCallback, useState } from 'react'

/** State manager for FocusTrapDialog — call open()/close() from the trigger. */
export function useFocusTrap() {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  return { isOpen, open, close } as const
}
