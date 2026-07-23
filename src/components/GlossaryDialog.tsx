import FocusTrapDialog from './FocusTrapDialog'
import { EXPLANATIONS, EXPLANATIONS_BY_ID } from '../content/explanations'

export type GlossaryView = 'closed' | 'list' | 'detail'

interface GlossaryDialogProps {
  view: GlossaryView
  activeTermId: string | null
  cameFromList: boolean
  onSelectTerm: (id: string) => void
  onBack: () => void
  onClose: () => void
  onOpenTour: () => void
}

export default function GlossaryDialog({
  view, activeTermId, cameFromList, onSelectTerm, onBack, onClose, onOpenTour,
}: GlossaryDialogProps) {
  const entry = activeTermId ? EXPLANATIONS_BY_ID[activeTermId] : null

  const label = view === 'list'
    ? 'Glossary'
    : entry
      ? `What does "${entry.term}" mean?`
      : 'Help'

  return (
    <FocusTrapDialog
      open={view !== 'closed'}
      onClose={onClose}
      label={label}
      closeLabel="Close help"
    >
      {view === 'list' && (
        <>
          <h2 className="dialog-heading">Glossary</h2>
          <p className="dialog-body">
            Plain-language explanations for terms used around SalesForge. Select a term to read more.
          </p>
          <ul className="glossary-list" aria-label="Glossary terms">
            {EXPLANATIONS.map(e => (
              <li key={e.id}>
                <button
                  type="button"
                  className="glossary-term-btn"
                  onClick={() => onSelectTerm(e.id)}
                >
                  {e.term}
                </button>
              </li>
            ))}
          </ul>
          <div className="glossary-tour-link">
            <button type="button" className="btn-secondary" onClick={onOpenTour}>
              Take the app tour
            </button>
          </div>
        </>
      )}

      {view === 'detail' && entry && (
        <div className="glossary-detail">
          <h2 className="dialog-heading">{entry.term}</h2>
          <p className="dialog-body">{entry.text}</p>
          {cameFromList && (
            <button type="button" className="btn-secondary glossary-back-btn" onClick={onBack}>
              ← Back to glossary
            </button>
          )}
        </div>
      )}
    </FocusTrapDialog>
  )
}
