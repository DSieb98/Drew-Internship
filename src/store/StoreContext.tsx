import { createContext, ReactNode, useContext } from 'react'
import { AppStore } from './types'
import { useInMemoryStore } from './inMemoryStore'

const StoreContext = createContext<AppStore | null>(null)

// M1 swap point: replace useInMemoryStore() here with the LACRM-backed implementation.
export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useInMemoryStore()
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): AppStore {
  const store = useContext(StoreContext)
  if (store === null) throw new Error('useStore must be used inside StoreProvider')
  return store
}
