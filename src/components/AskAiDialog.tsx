import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FocusTrapDialog from './FocusTrapDialog'
import ExplainTerm from './ExplainTerm'
import { useStore } from '../store/StoreContext'
import { useAnnounce } from '../hooks/useAnnounce'
import { askClaude } from '../utils/claudeApi'
import { findLeads } from '../utils/leadSearch'
import type { Lead } from '../store/types'

type ScopeId = 'hot' | 'hot-warm' | 'all'

// PII boundary (M0-T11, gap G5, open master-plan question 3): how many leads'
// data goes into the prompt for a given question. Adjust SCOPES/DEFAULT_SCOPE
// here once Drew rules on the open PII question — nothing else needs to change.
const SCOPES: { id: ScopeId; label: string; match: (status: Lead['status']) => boolean }[] = [
  { id: 'hot',      label: 'Hot leads only',    match: s => s === 'Hot' },
  { id: 'hot-warm', label: 'Hot and Warm leads', match: s => s === 'Hot' || s === 'Warm' },
  { id: 'all',      label: 'All leads',         match: () => true },
]
const DEFAULT_SCOPE: ScopeId = 'hot'

const STARTER_QUESTIONS = [
  'Who should I call first today?',
  'Anyone gone quiet I should follow up with?',
  'Summarize my hot leads for me.',
]

type AiStatus = 'idle' | 'loading' | 'done' | 'error'

interface AskAiDialogProps {
  open: boolean
  onClose: () => void
}

// Deliberately excludes email, phone, and pinnedNote — the fields most likely
// to carry sensitive contact PII or Tim's private notes (see PII note above).
function summarizeLead(lead: Lead): string {
  const parts = [lead.company, `status ${lead.status}`, `score ${lead.score}/100`]
  if (lead.contactName) parts.push(`contact ${lead.contactName}`)
  if (lead.dealValue > 0) parts.push(`deal $${lead.dealValue.toLocaleString()}`)
  if (lead.stage) parts.push(`stage "${lead.stage}"`)
  parts.push(lead.lastContactDate ? `last contact ${lead.lastContactDate}` : 'never contacted')
  return `- ${parts.join(', ')}`
}

export default function AskAiDialog({ open, onClose }: AskAiDialogProps) {
  const store = useStore()
  const announce = useAnnounce()
  const navigate = useNavigate()
  const [scope, setScope] = useState<ScopeId>(DEFAULT_SCOPE)
  const [question, setQuestion] = useState('')
  const [status, setStatus] = useState<AiStatus>('idle')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [findQuery, setFindQuery] = useState('')
  const [findResults, setFindResults] = useState<{ matches: Lead[]; totalMatches: number } | null>(null)
  const [lastFindQuery, setLastFindQuery] = useState('')

  const activeScope = SCOPES.find(s => s.id === scope) ?? SCOPES[0]
  const scopedLeads = store.leads.filter(l => activeScope.match(l.status))

  function reset() {
    setQuestion('')
    setStatus('idle')
    setAnswer('')
    setError('')
    setFindQuery('')
    setFindResults(null)
    setLastFindQuery('')
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

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    setStatus('loading')
    setError('')
    setAnswer('')
    announce('Thinking, please wait…')

    const today = new Date().toISOString().split('T')[0]
    const leadLines = scopedLeads.length > 0
      ? scopedLeads.map(summarizeLead).join('\n')
      : '(no leads in this scope)'

    const prompt = `You are a warm, plain-language sales assistant inside SalesWhiz, a CRM dashboard for a salesperson named Tim. Answer the question below using only the lead data provided. Be concise, concrete, and avoid jargon. If the data doesn't answer the question, say so honestly instead of guessing.

Today's date: ${today}

Leads in scope (${scopedLeads.length} of ${store.leads.length} total leads — ${activeScope.label}):
${leadLines}

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
        Ask a plain-English question about your leads and get a quick answer, or find a specific
        lead below and jump straight to it.
        <ExplainTerm id="ai-assistant" />
      </p>

      <h3 className="today-section-heading">Find a lead</h3>
      <form onSubmit={handleFind} className="askai-find-form">
        <div className="settings-field">
          <label htmlFor="askai-find-query" className="settings-field-label">
            Search by company, contact name, city, or state
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
      <fieldset className="log-call-outcome-group askai-scope-group">
        <legend className="settings-field-label">
          Leads to consider ({scopedLeads.length} of {store.leads.length})
        </legend>
        {SCOPES.map(s => (
          <label key={s.id} className="log-call-outcome-option">
            <input
              type="radio"
              name="askai-scope"
              value={s.id}
              checked={scope === s.id}
              onChange={() => setScope(s.id)}
            />
            {s.label}
          </label>
        ))}
      </fieldset>
      <p className="askai-pii-note">
        Only company, status, score, deal size, stage, and contact name are sent for the leads
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
            placeholder="e.g. Who should I call first today?"
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
          <button type="submit" className="btn-primary" disabled={status === 'loading' || !question.trim()}>
            {status === 'loading' ? 'Asking…' : 'Ask'}
          </button>
        </div>
      </form>
    </FocusTrapDialog>
  )
}
