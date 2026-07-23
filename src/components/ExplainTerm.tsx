import { useHelp } from '../hooks/useHelp'
import { EXPLANATIONS_BY_ID } from '../content/explanations'

interface ExplainTermProps {
  /** Id of the entry in src/content/explanations.ts. */
  id: string
}

/** Small inline "what does this mean?" affordance next to a term or metric. */
export default function ExplainTerm({ id }: ExplainTermProps) {
  const { explain } = useHelp()
  const entry = EXPLANATIONS_BY_ID[id]
  if (!entry) return null

  return (
    <button
      type="button"
      className="explain-btn"
      aria-label={`What does "${entry.term}" mean?`}
      onClick={() => explain(id)}
    >
      <span aria-hidden="true">?</span>
    </button>
  )
}
