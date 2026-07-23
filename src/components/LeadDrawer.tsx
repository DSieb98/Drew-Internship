import { useRef, useState, useCallback } from 'react'
import FocusTrapDialog from './FocusTrapDialog'
import LogCallDialog from './LogCallDialog'
import { useStore } from '../store/StoreContext'
import { useAnnounce } from '../hooks/useAnnounce'
import { askClaude } from '../utils/claudeApi'
import type { Lead, Settings } from '../store/types'

type TabId = 'briefing' | 'opener' | 'next-steps' | 'email'

const TABS: { id: TabId; label: string }[] = [
  { id: 'briefing',   label: 'Briefing'    },
  { id: 'opener',     label: 'Call Opener' },
  { id: 'next-steps', label: 'Next Steps'  },
  { id: 'email',      label: 'Email Draft' },
]

type AiStatus = 'idle' | 'loading' | 'done' | 'error'

interface AiState {
  status: AiStatus
  text: string
  error: string
}

const INIT_AI: AiState = { status: 'idle', text: '', error: '' }

interface LeadDrawerProps {
  lead: Lead | null
  onClose: () => void
  settings: Settings
}

export default function LeadDrawer({ lead, onClose, settings }: LeadDrawerProps) {
  const store = useStore()
  const announce = useAnnounce()
  const [activeTab, setActiveTab] = useState<TabId>('briefing')
  const [opener, setOpener] = useState<AiState>(INIT_AI)
  const [nextSteps, setNextSteps] = useState<AiState>(INIT_AI)
  const [email, setEmail] = useState<AiState>(INIT_AI)
  const [emailText, setEmailText] = useState('')
  const [logCallOpen, setLogCallOpen] = useState(false)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  function markAsCalled() {
    if (!lead) return
    const date = new Date().toISOString().split('T')[0]
    store.updateLead(lead.id, { called: true, lastContactDate: date })
    announce(`${lead.company} marked as called.`)
  }

  const switchTab = useCallback((idx: number) => {
    setActiveTab(TABS[idx].id)
    // Defer focus so the tab has re-rendered with tabIndex=0 first
    setTimeout(() => tabRefs.current[idx]?.focus(), 0)
  }, [])

  function handleTabKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      switchTab((idx + 1) % TABS.length)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      switchTab((idx - 1 + TABS.length) % TABS.length)
    } else if (e.key === 'Home') {
      e.preventDefault()
      switchTab(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      switchTab(TABS.length - 1)
    }
  }

  async function generate(
    type: 'opener' | 'next-steps' | 'email',
    setter: React.Dispatch<React.SetStateAction<AiState>>,
    onResult?: (text: string) => void
  ) {
    if (!lead) return
    if (!settings.anthropicApiKey) {
      setter({ status: 'error', text: '', error: 'No API key — add it on the Settings page.' })
      announce('No Anthropic API key. Add it on the Settings page to use AI features.')
      return
    }
    setter({ status: 'loading', text: '', error: '' })
    const featureLabel = type === 'opener' ? 'call opener' : type === 'next-steps' ? 'next steps' : 'email draft'
    announce(`Generating ${featureLabel}, please wait…`)

    let prompt: string
    if (type === 'opener') {
      prompt = `Write a short (2-3 sentence) warm, natural call opener for a sales rep reaching out to ${lead.contactName || 'the contact'} at ${lead.company}${lead.industry ? ` (${lead.industry})` : ''}. Their pipeline stage: "${lead.stage || 'unknown'}". Keep it conversational and confident. Output only the opener text, no preamble.`
    } else if (type === 'next-steps') {
      prompt = `Give 2-3 concrete next-step suggestions for a salesperson following up with ${lead.company}${lead.contactName ? ` (contact: ${lead.contactName})` : ''}. Lead status: ${lead.status}. Pipeline stage: "${lead.stage || 'unknown'}". Be specific and actionable. Output as a short numbered list, no preamble.`
    } else {
      prompt = `Write a brief follow-up email body (no subject line) to ${lead.contactName || 'the contact'} at ${lead.company} about their interest in promotional merchandise. Pipeline stage: "${lead.stage || 'unknown'}". Keep it under 150 words, friendly, with a clear call to action. Output only the email body, no preamble.`
    }

    try {
      const text = await askClaude(settings.anthropicApiKey, prompt)
      setter({ status: 'done', text, error: '' })
      onResult?.(text)
      const doneLabel = type === 'opener' ? 'Call opener ready.' : type === 'next-steps' ? 'Next steps ready.' : 'Email draft ready.'
      announce(doneLabel)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setter({ status: 'error', text: '', error: msg })
      announce(`Generation failed. ${msg}`)
    }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(emailText)
      announce('Email draft copied to clipboard.')
    } catch {
      announce('Copy failed. Please select the text and copy manually.')
    }
  }

  if (!lead) return null

  const dvLabel = lead.dealValue >= settings.dealHighThreshold ? 'High'
    : lead.dealValue >= settings.dealMediumThreshold ? 'Medium' : 'Low'
  const location = [lead.city, lead.state].filter(Boolean).join(', ')
  const mailtoHref = `mailto:${encodeURIComponent(lead.email ?? '')}?body=${encodeURIComponent(emailText)}`

  return (
    <>
    <FocusTrapDialog
      open
      onClose={onClose}
      label={`Lead details: ${lead.company}`}
      closeLabel="Close lead details"
      contentClassName="drawer-dialog-content"
    >
      <div className="drawer-inner">

        {/* ── Header ── */}
        <div className="drawer-header">
          <span
            className={`drawer-status drawer-status--${lead.status.toLowerCase()}`}
            aria-hidden="true"
          >
            {lead.status}
          </span>
          {lead.called && (
            <span className="drawer-called-badge">Called</span>
          )}
          <h2 className="drawer-company">{lead.company}</h2>
          {lead.contactName && (
            <p className="drawer-contact-name" aria-hidden="true">{lead.contactName}</p>
          )}
        </div>

        {/* ── Tab list ── */}
        <div role="tablist" aria-label="Lead details sections" className="drawer-tablist">
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              ref={el => { tabRefs.current[i] = el }}
              role="tab"
              id={`drawer-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`drawer-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={`drawer-tab${activeTab === tab.id ? ' drawer-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={e => handleTabKeyDown(e, i)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Briefing panel ── */}
        <div
          role="tabpanel"
          id="drawer-panel-briefing"
          aria-labelledby="drawer-tab-briefing"
          hidden={activeTab !== 'briefing'}
          className="drawer-panel"
        >
          <dl className="drawer-briefing">
            {lead.contactName && (
              <>
                <dt>Contact</dt>
                <dd>{lead.contactName}{lead.jobTitle ? ` — ${lead.jobTitle}` : ''}</dd>
              </>
            )}
            {lead.email && (
              <>
                <dt>Email</dt>
                <dd><a href={`mailto:${lead.email}`} className="drawer-link">{lead.email}</a></dd>
              </>
            )}
            {lead.phone && (
              <>
                <dt>Phone</dt>
                <dd><a href={`tel:${lead.phone}`} className="drawer-link">{lead.phone}</a></dd>
              </>
            )}
            {location && (
              <>
                <dt>Location</dt>
                <dd>{location}</dd>
              </>
            )}
            {lead.dealValue > 0 && (
              <>
                <dt>Deal value</dt>
                <dd>
                  <span className={`drawer-dv drawer-dv--${dvLabel.toLowerCase()}`}>{dvLabel}</span>
                  {' $'}{lead.dealValue.toLocaleString()}
                </dd>
              </>
            )}
            {lead.stage && (
              <>
                <dt>Stage</dt>
                <dd>{lead.stage}</dd>
              </>
            )}
            {lead.industry && (
              <>
                <dt>Industry</dt>
                <dd>{lead.industry}</dd>
              </>
            )}
            {lead.employees != null && (
              <>
                <dt>Employees</dt>
                <dd>{lead.employees.toLocaleString()}</dd>
              </>
            )}
            {lead.annualRevenue != null && (
              <>
                <dt>Annual revenue</dt>
                <dd>${lead.annualRevenue.toLocaleString()}</dd>
              </>
            )}
            <dt>Score</dt>
            <dd>{lead.score} / 100</dd>
            {lead.lastContactDate && (
              <>
                <dt>Last contact</dt>
                <dd>{new Date(lead.lastContactDate + 'T00:00:00').toLocaleDateString()}</dd>
              </>
            )}
          </dl>

          {lead.scoreBreakdown.length > 0 && (
            <details className="drawer-breakdown">
              <summary className="drawer-breakdown-summary">Score breakdown</summary>
              <ul className="drawer-breakdown-list">
                {lead.scoreBreakdown.map(c => (
                  <li key={c.id} className="drawer-breakdown-item">
                    <span className="drawer-breakdown-label">{c.label}</span>
                    <span className="drawer-breakdown-pts">{c.earnedPoints} / {c.maxPoints} pts</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="drawer-call-actions">
            <button type="button" className="btn-secondary" onClick={markAsCalled} disabled={lead.called}>
              {lead.called ? 'Marked as called' : 'Mark as called'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setLogCallOpen(true)}>
              Log a call
            </button>
          </div>
        </div>

        {/* ── Call Opener panel ── */}
        <div
          role="tabpanel"
          id="drawer-panel-opener"
          aria-labelledby="drawer-tab-opener"
          hidden={activeTab !== 'opener'}
          className="drawer-panel"
        >
          <p className="drawer-ai-intro">
            A natural opener for your call with {lead.contactName || lead.company}.
          </p>
          {opener.status === 'error' && (
            <p className="drawer-ai-error" role="alert">{opener.error}</p>
          )}
          {opener.status === 'loading' && (
            <p className="drawer-ai-loading">Generating…</p>
          )}
          {opener.status === 'done' && (
            <div className="drawer-ai-result">{opener.text}</div>
          )}
          <div className="drawer-ai-actions">
            {opener.status !== 'loading' && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => generate('opener', setOpener)}
              >
                {opener.status === 'done' ? 'Regenerate' : 'Generate call opener'}
              </button>
            )}
          </div>
        </div>

        {/* ── Next Steps panel ── */}
        <div
          role="tabpanel"
          id="drawer-panel-next-steps"
          aria-labelledby="drawer-tab-next-steps"
          hidden={activeTab !== 'next-steps'}
          className="drawer-panel"
        >
          <p className="drawer-ai-intro">
            Suggested next moves for {lead.company}.
          </p>
          {nextSteps.status === 'error' && (
            <p className="drawer-ai-error" role="alert">{nextSteps.error}</p>
          )}
          {nextSteps.status === 'loading' && (
            <p className="drawer-ai-loading">Generating…</p>
          )}
          {nextSteps.status === 'done' && (
            <div className="drawer-ai-result">{nextSteps.text}</div>
          )}
          <div className="drawer-ai-actions">
            {nextSteps.status !== 'loading' && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => generate('next-steps', setNextSteps)}
              >
                {nextSteps.status === 'done' ? 'Regenerate' : 'Generate next steps'}
              </button>
            )}
          </div>
        </div>

        {/* ── Email Draft panel ── */}
        <div
          role="tabpanel"
          id="drawer-panel-email"
          aria-labelledby="drawer-tab-email"
          hidden={activeTab !== 'email'}
          className="drawer-panel"
        >
          <p className="drawer-ai-intro">
            AI-drafted email for {lead.contactName || lead.company}. Edit before sending.
          </p>
          {email.status === 'error' && (
            <p className="drawer-ai-error" role="alert">{email.error}</p>
          )}
          {email.status === 'loading' && (
            <p className="drawer-ai-loading">Generating…</p>
          )}
          {email.status === 'done' && (
            <>
              <label htmlFor="drawer-email-text" className="drawer-email-label">
                Email body (edit before sending)
              </label>
              <textarea
                id="drawer-email-text"
                className="drawer-email-textarea"
                value={emailText}
                onChange={e => setEmailText(e.target.value)}
                rows={8}
              />
              <div className="drawer-email-actions">
                <button type="button" className="btn-secondary" onClick={copyEmail}>
                  Copy to clipboard
                </button>
                {lead.email && (
                  <a href={mailtoHref} className="btn-secondary drawer-mailto-link">
                    Open in email client
                  </a>
                )}
              </div>
            </>
          )}
          <div className="drawer-ai-actions">
            {email.status !== 'loading' && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => generate('email', setEmail, setEmailText)}
              >
                {email.status === 'done' ? 'Regenerate' : 'Generate email draft'}
              </button>
            )}
          </div>
        </div>

      </div>
    </FocusTrapDialog>
    <LogCallDialog open={logCallOpen} onClose={() => setLogCallOpen(false)} lead={lead} />
    </>
  )
}
