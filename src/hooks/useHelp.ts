import { useContext } from 'react'
import { HelpContext } from '../components/HelpProvider'

/** Access the plain-language help system: inline explanations, glossary, and the tour. */
export function useHelp() {
  return useContext(HelpContext)
}
