import { useState } from 'react'
import FocusTrapDialog from './FocusTrapDialog'
import { useStore } from '../store/StoreContext'
import { useAnnounce } from '../hooks/useAnnounce'
import type { CallOutcome, Lead } from '../store/types'

const OUTCOMES: CallOutcome[] = ['Reached', 'No answer', 'Left voicemail', 'Not interested']

function today(): string {
  return new Date().toISOString().split('T')[0]
}

interface LogCallDialogProps {
  open: boolean
  onClose: () => void
  lead: Lead
}

export default function LogCallDialog({ open, onClose, lead }: LogCallDialogProps) {
  const store = useStore()
  const announce = useAnnounce()

  const [date, setDate] = useState(today)
  const [durationMinutes, setDurationMinutes] = useState(5)
  const [outcome, setOutcome] = useState<CallOutcome>('Reached')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setDate(today())
    setDurationMinutes(5)
    setOutcome('Reached')
    setNotes('')
    setBusy(false)
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date) {
      setError('Please enter the call date.')
      return
    }
    if (durationMinutes < 0) {
      setError('Duration cannot be negative.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await store.addCallLog({ leadId: lead.id, date, durationMinutes, outcome, notes })
      await store.updateLead(lead.id, { called: true, lastContactDate: date })
      announce(`Call logged for ${lead.company}. Outcome: ${outcome}.`)
      reset()
      onClose()
    } catch {
      setError('Something went wrong logging this call. Please try again.')
      setBusy(false)
    }
  }

  return (
    <FocusTrapDialog
      open={open}
      onClose={handleClose}
      label={`Log a call with ${lead.company}`}
      closeLabel="Cancel log call"
    >
      <h2 className="dialog-heading">Log a call with {lead.company}</h2>
      <p className="dialog-body">
        Record the outcome of your call{lead.contactName ? ` with ${lead.contactName}` : ''}.
      </p>

      {error && (
        <p className="dialog-error" role="alert">{error}</p>
      )}

      <form onSubmit={handleSubmit}>
        <div className="settings-field">
          <label htmlFor="log-call-date" className="settings-field-label">Call date</label>
          <input
            id="log-call-date"
            type="date"
            className="settings-field-input"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        <div className="settings-field">
          <label htmlFor="log-call-duration" className="settings-field-label">Duration (minutes)</label>
          <input
            id="log-call-duration"
            type="number"
            min={0}
            className="settings-field-input"
            value={durationMinutes}
            onChange={e => {
              const n = Number(e.target.value)
              if (!isNaN(n)) setDurationMinutes(n)
            }}
          />
        </div>

        <fieldset className="log-call-outcome-group">
          <legend className="settings-field-label">Outcome</legend>
          {OUTCOMES.map(o => (
            <label key={o} className="log-call-outcome-option">
              <input
                type="radio"
                name="log-call-outcome"
                value={o}
                checked={outcome === o}
                onChange={() => setOutcome(o)}
              />
              {o}
            </label>
          ))}
        </fieldset>

        <div className="settings-field">
          <label htmlFor="log-call-notes" className="settings-field-label">Notes</label>
          <textarea
            id="log-call-notes"
            className="log-call-notes-textarea"
            rows={4}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="import-actions">
          <button type="button" className="btn-secondary" onClick={handleClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Logging…' : 'Log call'}
          </button>
        </div>
      </form>
    </FocusTrapDialog>
  )
}
