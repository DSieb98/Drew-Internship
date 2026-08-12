import { createContext, ReactNode, useCallback, useState } from 'react'
import GlossaryDialog, { GlossaryView } from './GlossaryDialog'

export interface HelpContextValue {
  /** Open the help dialog directly on one term's explanation. */
  explain: (termId: string) => void
  /** Open the full glossary list. */
  openGlossary: () => void
}

const noop = () => {}
export const HelpContext = createContext<HelpContextValue>({
  explain: noop,
  openGlossary: noop,
})

export function HelpProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<GlossaryView>('closed')
  const [activeTermId, setActiveTermId] = useState<string | null>(null)
  const [cameFromList, setCameFromList] = useState(false)

  const explain = useCallback((termId: string) => {
    setActiveTermId(termId)
    setCameFromList(false)
    setView('detail')
  }, [])

  const openGlossary = useCallback(() => {
    setView('list')
  }, [])

  const selectTerm = useCallback((termId: string) => {
    setActiveTermId(termId)
    setCameFromList(true)
    setView('detail')
  }, [])

  const backFromDetail = useCallback(() => {
    setView(cameFromList ? 'list' : 'closed')
  }, [cameFromList])

  const closeGlossary = useCallback(() => {
    setView('closed')
    setActiveTermId(null)
  }, [])

  return (
    <HelpContext.Provider value={{ explain, openGlossary }}>
      {children}
      <GlossaryDialog
        view={view}
        activeTermId={activeTermId}
        cameFromList={cameFromList}
        onSelectTerm={selectTerm}
        onBack={backFromDetail}
        onClose={closeGlossary}
      />
    </HelpContext.Provider>
  )
}
