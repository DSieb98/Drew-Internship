import { useContext } from 'react'
import { HelpContext } from '../components/HelpProvider'

/** Access the plain-language help system: inline explanations and the glossary. */
export function useHelp() {
  return useContext(HelpContext)
}
