import { createContext, ReactNode, useCallback, useEffect, useState } from 'react'
import GlossaryDialog, { GlossaryView } from './GlossaryDialog'
import OnboardingTour from './OnboardingTour'

const ONBOARDING_SEEN_KEY = 'salesforge_onboarding_seen'

export interface HelpContextValue {
  /** Open the help dialog directly on one term's explanation. */
  explain: (termId: string) => void
  /** Open the full glossary list. */
  openGlossary: () => void
  /** (Re)start the onboarding tour from step one. */
  openTour: () => void
}

const noop = () => {}
export const HelpContext = createContext<HelpContextValue>({
  explain: noop,
  openGlossary: noop,
  openTour: noop,
})

export function HelpProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<GlossaryView>('closed')
  const [activeTermId, setActiveTermId] = useState<string | null>(null)
  const [cameFromList, setCameFromList] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)

  // First-run tour: shown once per browser, reopenable any time from Help.
  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_SEEN_KEY) !== 'true') {
      setTourOpen(true)
    }
  }, [])

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

  const openTour = useCallback(() => {
    setView('closed')
    setTourOpen(true)
  }, [])

  const finishTour = useCallback(() => {
    localStorage.setItem(ONBOARDING_SEEN_KEY, 'true')
    setTourOpen(false)
  }, [])

  return (
    <HelpContext.Provider value={{ explain, openGlossary, openTour }}>
      {children}
      <GlossaryDialog
        view={view}
        activeTermId={activeTermId}
        cameFromList={cameFromList}
        onSelectTerm={selectTerm}
        onBack={backFromDetail}
        onClose={closeGlossary}
        onOpenTour={openTour}
      />
      <OnboardingTour open={tourOpen} onDone={finishTour} />
    </HelpContext.Provider>
  )
}
