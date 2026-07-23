import { useCallback } from 'react'
import { useStore } from '../store/StoreContext'
import { useAnnounce } from './useAnnounce'
import type { Lead } from '../store/types'

// Shared pin/unpin action for lead surfaces (T07). Keeps the store update and
// the JAWS announcement consistent wherever a pin control appears.
export function useTogglePin() {
  const store = useStore()
  const announce = useAnnounce()

  return useCallback(
    (lead: Lead) => {
      const nextPinned = !lead.pinned
      store.updateLead(lead.id, { pinned: nextPinned })
      announce(nextPinned ? `${lead.company} pinned to My List.` : `${lead.company} removed from My List.`)
    },
    [store, announce]
  )
}
