import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FocusTrapDialog from './FocusTrapDialog'
import ExplainTerm from './ExplainTerm'
import { useStore } from '../store/StoreContext'
import { useAnnounce } from '../hooks/useAnnounce'
import { askClaude } from '../utils/claudeApi'
import { findLeads } from '../utils/leadSearch'
import { summarizeLead } from '../utils/askAiPrompt'
import type { Lead } from '../store/types'

// D-47: "Ask a question" only ever asks about one specific lead now — Drew's call, to keep AI
// budget spend predictable and simple to reason about. (Earlier versions offered Hot/Hot+Warm/
// All-leads scopes; D-44's MAX_LEADS_IN_PROMPT cap had already made even "All leads" cheap, but
// Drew wanted it gone as an option regardless, then went further and asked for single-lead-only.)
const STARTER_QUESTIONS = [
  "What's the best way to approach this lead?",
  'Summarize this lead for me.',
  'What should I know before I call them?',
]

type AiStatus = 'idle' | 'loading' | 'done' | 'error'

interface AskAiDialogProps {
  open: boolean
  onClose: () => void
}

export default function AskAiDialog({ open, onClose }: AskAiDialogProps) {
  const store = useStore()
  const announce = useAnnounce()
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [status, setStatus] = useState<AiStatus>('idle')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [findQuery, setFindQuery] = useState('')
  const [findResults, setFindResults] = useState<{ matches: Lead[]; totalMatches: number } | null>(null)
  const [lastFindQuery, setLastFindQuery] = useState('')

  // Which lead the question is about — a separate picker from "Find a lead" above, since that
  // one navigates away rather than selecting a target for the question.
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [leadPickerQuery, setLeadPickerQuery] = useState('')
  const [leadPickerResults, setLeadPickerResults] = useState<{ matches: Lead[]; totalMatches: number } | null>(null)

  function reset() {
    setQuestion('')
    setStatus('idle')
    setAnswer('')
    setError('')
    setFindQuery('')
    setFindResults(null)
    setLastFindQuery('')
    setSelectedLead(null)
    setLeadPickerQuery('')
    setLeadPickerResults(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleFind(e: React.FormEvent) {
    e.preventDefault()
    const q = findQuery.trim()
    if (!q) return
    const results = findLeads(store.leads, q)
    setFindResults(results)
    setLastFindQuery(q)
    announce(
      results.totalMatches === 0
        ? `No leads found for "${q}".`
        : `${results.totalMatches} ${results.totalMatches === 1 ? 'lead' : 'leads'} found for "${q}".${
            results.totalMatches > results.matches.length ? ` Showing the top ${results.matches.length}.` : ''
          }`
    )
  }

  // Navigates to All Leads (the only list that holds every lead regardless of status/filter)
  // and asks it to open this lead's drawer once it lands there — see AllLeadsPage's
  // location.state handling.
  function openLead(lead: Lead) {
    handleClose()
    navigate('/all-leads', { state: { openLeadId: lead.id } })
  }

  function useSuggestion(q: string) {
    setQuestion(q)
    textareaRef.current?.focus()
  }

  function handleLeadPickerSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = leadPickerQuery.trim()
    if (!q) return
    const results = findLeads(store.leads, q)
    setLeadPickerResults(results)
    announce(
      results.totalMatches === 0
        ? `No leads found for "${q}".`
        : `${results.totalMatches} ${results.totalMatches === 1 ? 'lead' : 'leads'} found for "${q}".`
    )
  }

  function pickLead(lead: Lead) {
    setSelectedLead(lead)
    setLeadPickerQuery('')
    setLeadPickerResults(null)
    announce(`Asking about ${lead.company}.`)
    textareaRef.current?.focus()
  }

  function clearSelectedLead() {
    setSelectedLead(null)
    announce('Lead cleared.')
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim() || !selectedLead) return
    setStatus('loading')
    setError('')
    setAnswer('')
    announce('Thinking, please wait…')

    const today = new Date().toISOString().split('T')[0]

    const prompt = `You are a warm, plain-language sales assistant inside SalesWhiz, a CRM dashboard for a salesperson named Tim. Answer the question below using only the lead data provided. Be concise, concrete, and avoid jargon. If the data doesn't answer the question, say so honestly instead of guessing.

Today's date: ${today}

Lead in scope — ${selectedLead.company}:
${summarizeLead(selectedLead)}

Question: ${question.trim()}`

    try {
      const text = await askClaude(prompt)
      setStatus('done')
      setAnswer(text)
      announce('Answer ready.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setStatus('error')
      setError(msg)
      announce(`Something went wrong. ${msg}`)
    }
  }

  return (
    <FocusTrapDialog
      open={open}
      onClose={handleClose}
      label="Ask your AI assistant"
      closeLabel="Close AI assistant"
      contentClassName="askai-dialog-content"
    >
      <h2 className="dialog-heading">Ask your AI assistant</h2>
      <p className="dialog-body">
        Ask a plain-English question about a specific lead and get a quick answer, or find a
        lead below and jump straight to it.
        <ExplainTerm id="ai-assistant" />
      </p>

      <h3 className="today-section-heading">Find a lead</h3>
      <form onSubmit={handleFind} className="askai-find-form">
        <div className="settings-field">
          <label htmlFor="askai-find-query" className="settings-field-label">
            Search by company, contact name, city, state, or industry
          </label>
          <div className="askai-find-row">
            <input
              id="askai-find-query"
              type="text"
              className="askai-find-input"
              value={findQuery}
              onChange={e => setFindQuery(e.target.value)}
              placeholder="e.g. Acme Corp, Jane Smith, or the guy from Dallas"
            />
            <button type="submit" className="btn-secondary" disabled={!findQuery.trim()}>
              Find
            </button>
          </div>
        </div>
      </form>

      {findResults !== null && (
        findResults.totalMatches === 0 ? (
          <p className="askai-find-empty" role="status">No leads found for &ldquo;{lastFindQuery}&rdquo;.</p>
        ) : (
          <>
            <ul className="askai-find-results" aria-label={`${findResults.totalMatches} matching leads for "${lastFindQuery}"`}>
              {findResults.matches.map(lead => {
                const location = [lead.city, lead.state].filter(Boolean).join(', ')
                return (
                  <li key={lead.id}>
                    <button
                      type="button"
                      className="askai-find-result-btn"
                      onClick={() => openLead(lead)}
                    >
                      {lead.company}
                      {lead.contactName ? ` — ${lead.contactName}` : ''}
                      {' '}<span className="askai-find-result-status">
                        ({lead.status}{location ? `, ${location}` : ''})
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {findResults.totalMatches > findResults.matches.length && (
              <p className="askai-find-truncated">
                Showing the top {findResults.matches.length} of {findResults.totalMatches} matches.
                Add more to your search — like a company name — to narrow it down.
              </p>
            )}
          </>
        )
      )}

      <h3 className="today-section-heading">Ask a question</h3>

      {selectedLead ? (
        <p className="askai-pii-note">
          Asking about <strong>{selectedLead.company}</strong>
          {selectedLead.contactName ? ` — ${selectedLead.contactName}` : ''}.{' '}
          <button type="button" className="btn-secondary" onClick={clearSelectedLead}>
            Change lead
          </button>
        </p>
      ) : (
        <>
          <form onSubmit={handleLeadPickerSearch} className="askai-find-form">
            <div className="settings-field">
              <label htmlFor="askai-lead-picker-query" className="settings-field-label">
                Which lead is this about?
              </label>
              <div className="askai-find-row">
                <input
                  id="askai-lead-picker-query"
                  type="text"
                  className="askai-find-input"
                  value={leadPickerQuery}
                  onChange={e => setLeadPickerQuery(e.target.value)}
                  placeholder="e.g. Acme Corp or Jane Smith"
                />
                <button type="submit" className="btn-secondary" disabled={!leadPickerQuery.trim()}>
                  Search
                </button>
              </div>
            </div>
          </form>

          {leadPickerResults !== null && (
            leadPickerResults.totalMatches === 0 ? (
              <p className="askai-find-empty" role="status">No leads found for &ldquo;{leadPickerQuery}&rdquo;.</p>
            ) : (
              <ul className="askai-find-results" aria-label={`${leadPickerResults.totalMatches} matching leads`}>
                {leadPickerResults.matches.map(lead => (
                  <li key={lead.id}>
                    <button
                      type="button"
                      className="askai-find-result-btn"
                      onClick={() => pickLead(lead)}
                    >
                      {lead.company}
                      {lead.contactName ? ` — ${lead.contactName}` : ''}
                      {' '}<span className="askai-find-result-status">({lead.status})</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
        </>
      )}

      <p className="askai-pii-note">
        Only company, status, score, deal size, stage, and contact name are sent for the lead
        above — never email, phone, or your private notes.
      </p>

      <div className="askai-suggestions" role="group" aria-label="Suggested questions">
        {STARTER_QUESTIONS.map(q => (
          <button
            key={q}
            type="button"
            className="askai-suggestion-btn"
            onClick={() => useSuggestion(q)}
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={handleAsk}>
        <div className="settings-field">
          <label htmlFor="askai-question" className="settings-field-label">Your question</label>
          <textarea
            id="askai-question"
            ref={textareaRef}
            className="drawer-email-textarea"
            rows={3}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="e.g. What should I say when I call them?"
          />
        </div>

        {status === 'error' && (
          <p className="dialog-error" role="alert">{error}</p>
        )}
        {status === 'loading' && (
          <p className="drawer-ai-loading">Thinking…</p>
        )}
        {status === 'done' && (
          <div className="drawer-ai-result">{answer}</div>
        )}

        <div className="import-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={status === 'loading' || !question.trim() || !selectedLead}
          >
            {status === 'loading' ? 'Asking…' : 'Ask'}
          </button>
        </div>
      </form>
    </FocusTrapDialog>
  )
}
