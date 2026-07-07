import { useContext } from 'react'
import { AnnounceContext } from '../components/LiveRegion'

/** Returns a function that sends a message to the polite ARIA live region. */
export function useAnnounce() {
  return useContext(AnnounceContext)
}
