import { useEffect, useState } from 'react'
import FocusTrapDialog from './FocusTrapDialog'
import ExplainTerm from './ExplainTerm'
import { useStore } from '../store/StoreContext'
import { useAnnounce } from '../hooks/useAnnounce'
import { askClaude } from '../utils/claudeApi'
import { NURTURE_TOUCH_PLAN, currentTouchIndex, touchDueDate } from '../nurture/nurturePlan'
import type { Lead, NurtureTouchStatus } from '../store/types'

interface NurtureTouchDialogProps {
  lead: Lead
  onClose: () => void
}

type AiStatus = 'idle' | 'loading' | 'error'

/**
 * Manages the *current* touch for one nurture-enrolled lead — generate/edit an AI draft, then
 * mark it done or skipped. `lead` is looked up live from the store by NurturePage (not a stale
 * snapshot), so committing a touch here naturally advances this same dialog to the next touch
 * (or the "sequence complete" panel) without closing and reopening — see the `stepIdx` effect
 * below, which resets the edit buffer whenever the underlying touch changes.
 */
export default function NurtureTouchDialog({ lead, onClose }: NurtureTouchDialogProps) {
  const store = useStore()
  const announce = useAnnounce()
  const stepIdx = currentTouchIndex(lead.nurtureTouches)
  const touch = stepIdx >= 0 ? lead.nurtureTouches[stepIdx] : null
  const def = stepIdx >= 0 ? NURTURE_TOUCH_PLAN[stepIdx] : null

  const [draftText, setDraftText] = useState(touch?.draftText ?? '')
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle')
  const [aiError, setAiError] = useState('')
  const [busy, setBusy] = useState(false)

  // Land on a different touch (either advanced by committing the previous one, or the dialog
  // was opened straight onto whichever touch is current) — reset the local edit buffer to that
  // touch's own saved draft rather than carrying over stale text from the last one.
  useEffect(() => {
    setDraftText(touch?.draftText ?? '')
    setAiStatus('idle')
    setAiError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx])

  async function generateDraft() {
    if (!def) return
    setAiStatus('loading')
    announce('Generating draft, please wait…')
    const who = lead.contactName || 'the contact'
    const prompt = def.type === 'email'
      ? `Write a brief, warm check-in email (no subject line) to ${who} at ${lead.company}, following up after a period of no contact. This is touch ${stepIdx + 1} of 4 in a nurture sequence for a lead that's gone quiet. Keep it under 120 words, low-pressure, with one simple call to action. Output only the email body, no preamble.`
      : `Write 2-3 short talking points for a follow-up call to ${who} at ${lead.company}, who has gone quiet. This is touch ${stepIdx + 1} of 4 in a nurture sequence. Be concrete and low-pressure, not pushy. Output as a short list, no preamble.`
    try {
      const text = await askClaude(prompt)
      setDraftText(text)
      setAiStatus('idle')
      announce('Draft ready.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setAiStatus('error')
      setAiError(msg)
      announce(`Draft generation failed. ${msg}`)
    }
  }

  async function commitTouch(status: NurtureTouchStatus) {
    if (!touch) return
    setBusy(true)
    const today = new Date().toISOString().split('T')[0]
    const updatedTouches = lead.nurtureTouches.map(t =>
      t.step === touch.step ? { ...t, status, draftText, completedAt: today } : t
    )
    try {
      await store.updateLead(lead.id, { nurtureTouches: updatedTouches })
      announce(
        status === 'done'
          ? `${def!.label} marked done for ${lead.company}.`
          : `${def!.label} skipped for ${lead.company}.`
      )
    } finally {
      setBusy(false)
    }
  }

  async function archiveLead() {
    setBusy(true)
    try {
      await store.updateLead(lead.id, { nurtureArchived: true })
      announce(`${lead.company} archived from nurture.`)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  async function promoteToWarm() {
    setBusy(true)
    try {
      await store.updateLead(lead.id, { statusOverride: 'Warm' })
      announce(`${lead.company} promoted to Warm.`)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const dueDate = def && lead.nurtureEnrolledAt ? touchDueDate(lead.nurtureEnrolledAt, def.step) : null

  return (
    <FocusTrapDialog
      open
      onClose={onClose}
      label={`Nurture touches: ${lead.company}`}
      closeLabel="Close nurture touches"
      contentClassName="nurture-dialog-content"
    >
      <h2 className="dialog-heading">{lead.company}</h2>

      <ol className="nurture-progress" aria-label={`Touch progress for ${lead.company}`}>
        {NURTURE_TOUCH_PLAN.map((d, i) => {
          const t = lead.nurtureTouches[i]
          const state = t?.status === 'done' ? 'done'
            : t?.status === 'skipped' ? 'skipped'
            : i === stepIdx ? 'current'
            : 'pending'
          const stateLabel = state === 'done' ? 'Done' : state === 'skipped' ? 'Skipped' : state === 'current' ? 'Current' : 'Upcoming'
          return (
            <li key={d.step} className={`nurture-step nurture-step--${state}`}>
              <span className="nurture-step-label">{d.label}</span>
              <span className="nurture-step-status">{stateLabel}</span>
            </li>
          )
        })}
      </ol>

      {!touch || !def ? (
        <div className="nurture-complete">
          <p>All 4 touches are complete for {lead.company}.</p>
          <div className="import-actions">
            <button type="button" className="btn-primary" onClick={promoteToWarm} disabled={busy}>
              Promote to Warm
            </button>
            <button type="button" className="btn-secondary" onClick={archiveLead} disabled={busy}>
              Archive this lead
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="drawer-ai-intro">
            {def.label}{dueDate ? ` — due ${new Date(dueDate + 'T00:00:00').toLocaleDateString()}` : ''}.{' '}
            {def.type === 'email' ? 'Draft a check-in email.' : 'Prep talking points for a call.'}
            <ExplainTerm id="nurture-sequence" />
          </p>

          {aiStatus === 'error' && (
            <p className="drawer-ai-error" role="alert">{aiError}</p>
          )}
          {aiStatus === 'loading' && (
            <p className="drawer-ai-loading">Generating…</p>
          )}

          <label htmlFor="nurture-draft-text" className="drawer-email-label">
            {def.type === 'email' ? 'Email body (edit before sending)' : 'Call talking points (edit as needed)'}
          </label>
          <textarea
            id="nurture-draft-text"
            className="drawer-email-textarea"
            rows={7}
            value={draftText}
            onChange={e => setDraftText(e.target.value)}
            placeholder="Generate a draft with AI, or write your own."
          />

          <div className="drawer-ai-actions">
            <button type="button" className="btn-secondary" onClick={generateDraft} disabled={aiStatus === 'loading' || busy}>
              {draftText ? 'Regenerate with AI' : 'Generate with AI'}
            </button>
          </div>

          <div className="import-actions nurture-touch-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => commitTouch('done')}
              disabled={busy || aiStatus === 'loading'}
            >
              Mark {def.type === 'email' ? 'email sent' : 'call made'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => commitTouch('skipped')}
              disabled={busy || aiStatus === 'loading'}
            >
              Skip this touch
            </button>
          </div>
        </>
      )}
    </FocusTrapDialog>
  )
}
