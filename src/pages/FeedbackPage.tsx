import { useEffect, useState } from 'react'
import { useAnnounce } from '../hooks/useAnnounce'
import { useSpeechToText } from '../hooks/useSpeechToText'
import { submitFeedback, getFeedbackList, updateFeedbackStatus, type FeedbackEntry } from '../utils/feedbackApi'

type SubmitStatus = 'idle' | 'sending' | 'error'

// Anything Tim thinks would help, surfaced to Drew so he can update the app — a lightweight
// two-way channel that doesn't require a live conversation. Not an LACRM concept (like
// Settings), so it's stored in the Worker's own KV namespace rather than as lead data. See
// worker/README.md.
export default function FeedbackPage() {
  const announce = useAnnounce()

  const [text, setText] = useState('')
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
  const [submitError, setSubmitError] = useState('')
  const [micError, setMicError] = useState('')

  // Speak instead of type (Tim's request) — appends to whatever's already in the box rather
  // than replacing it, so voice and typing can be mixed.
  const speech = useSpeechToText(
    transcript => {
      setText(prev => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript))
      setMicError('')
      announce('Got it.')
    },
    message => {
      setMicError(message)
      announce(message)
    }
  )

  function handleMicClick() {
    if (speech.listening) {
      speech.stop()
      announce('Stopped listening.')
    } else {
      setMicError('')
      announce('Listening — speak your request.')
      speech.start()
    }
  }

  const [entries, setEntries] = useState<FeedbackEntry[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')

  function loadEntries() {
    setListLoading(true)
    getFeedbackList()
      .then(list => { setEntries(list); setListError('') })
      .catch(err => setListError(err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setListLoading(false))
  }

  useEffect(() => {
    loadEntries()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    setSubmitStatus('sending')
    setSubmitError('')
    try {
      const entry = await submitFeedback(trimmed)
      setEntries(prev => [entry, ...prev])
      setText('')
      setSubmitStatus('idle')
      announce('Request sent.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setSubmitStatus('error')
      setSubmitError(msg)
      announce(`Couldn't send that. ${msg}`)
    }
  }

  async function toggleStatus(entry: FeedbackEntry) {
    const nextStatus = entry.status === 'new' ? 'reviewed' : 'new'
    try {
      const updated = await updateFeedbackStatus(entry.id, nextStatus)
      setEntries(prev => prev.map(e => (e.id === updated.id ? updated : e)))
      announce(nextStatus === 'reviewed' ? 'Marked reviewed.' : 'Marked new.')
    } catch (err) {
      announce(`Couldn't update that. ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <section aria-labelledby="feedback-heading">
      <h2 id="feedback-heading" className="page-heading">Feedback</h2>

      <p className="feedback-intro">
        Type anything you think would help — a change, a problem, an idea. It's saved here so
        Drew can see it and update the app; nothing is sent anywhere automatically.
      </p>

      <form onSubmit={handleSubmit} className="feedback-form">
        <div className="settings-field">
          <label htmlFor="feedback-text" className="settings-field-label">Your request</label>
          <div className="feedback-textarea-row">
            <textarea
              id="feedback-text"
              className="feedback-textarea"
              rows={4}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="e.g. It would help if the Nurture page showed the lead's phone number too."
              maxLength={4000}
            />
            {speech.supported && (
              <button
                type="button"
                className={`feedback-mic-btn${speech.listening ? ' feedback-mic-btn--active' : ''}`}
                onClick={handleMicClick}
                aria-pressed={speech.listening}
              >
                <span aria-hidden="true">🎤</span>{' '}
                {speech.listening ? 'Stop listening' : 'Speak instead'}
              </button>
            )}
          </div>
          {micError && (
            <p className="dialog-error" role="alert">{micError}</p>
          )}
        </div>

        {submitStatus === 'error' && (
          <p className="dialog-error" role="alert">{submitError}</p>
        )}

        <div className="import-actions">
          <button type="submit" className="btn-primary" disabled={submitStatus === 'sending' || !text.trim()}>
            {submitStatus === 'sending' ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </form>

      <h3 className="today-section-heading">Past requests</h3>

      {listLoading ? (
        <p className="placeholder-content" role="status">Loading past requests…</p>
      ) : listError ? (
        <p className="dialog-error" role="alert">Couldn't load past requests: {listError}</p>
      ) : entries.length === 0 ? (
        <p className="placeholder-content">Nothing sent yet.</p>
      ) : (
        <ul className="feedback-list" aria-label="Past requests">
          {entries.map(entry => (
            <li key={entry.id} className="feedback-item">
              <div className="feedback-item-main">
                <p className="feedback-item-text">{entry.text}</p>
                <p className="feedback-item-meta">
                  <span className={`feedback-status feedback-status--${entry.status}`}>
                    {entry.status === 'reviewed' ? 'Reviewed' : 'New'}
                  </span>
                  {' · '}
                  {new Date(entry.submittedAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => toggleStatus(entry)}
              >
                Mark {entry.status === 'new' ? 'reviewed' : 'new'}
                <span className="sr-only"> — request sent {new Date(entry.submittedAt).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
