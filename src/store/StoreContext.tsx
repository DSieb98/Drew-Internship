import { createContext, ReactNode, useContext } from 'react'
import { AppStore } from './types'
import { useLacrmStore } from './lacrmStore'

const StoreContext = createContext<AppStore | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useLacrmStore()
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): AppStore {
  const store = useContext(StoreContext)
  if (store === null) throw new Error('useStore must be used inside StoreProvider')
  return store
}
