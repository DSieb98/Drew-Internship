import { useEffect, useRef, useState } from 'react'
import FocusTrapDialog from './FocusTrapDialog'
import { useAnnounce } from '../hooks/useAnnounce'
import {
  researchCompany,
  enrichCompany,
  type CompanyResearchResult,
  type EnrichmentResult,
} from '../utils/companyResearchApi'
import type { Lead } from '../store/types'

type ResearchStatus = 'idle' | 'loading' | 'done' | 'error'
type EnrichStatus = 'idle' | 'running' | 'done' | 'error'

interface CompanyResearchDialogProps {
  lead: Lead
  open: boolean
  onClose: () => void
}

// LeadCard's "Research company" button opens this. Runs one Exa search (via the Worker proxy —
// see companyResearchApi.ts) scoped to a single company, with no scope picker needed since it's
// already tied to the card it was opened from.
export default function CompanyResearchDialog({ lead, open, onClose }: CompanyResearchDialogProps) {
  const announce = useAnnounce()
  const [status, setStatus] = useState<ResearchStatus>('idle')
  const [result, setResult] = useState<CompanyResearchResult | null>(null)
  const [error, setError] = useState('')

  // D-49: employees/revenue/industry lookup — a separate, opt-in action (not auto-fired with
  // the summary above) since it's a slower, costlier Agent API call, not something to spend on
  // every card open. Display-only: nothing here writes to the lead. `cancelledRef` stops a
  // still-polling run from calling setState after the dialog's closed or moved to another lead.
  const [enrichStatus, setEnrichStatus] = useState<EnrichStatus>('idle')
  const [enrichResult, setEnrichResult] = useState<EnrichmentResult | null>(null)
  const [enrichStatusText, setEnrichStatusText] = useState('')
  const [enrichError, setEnrichError] = useState('')
  const cancelledRef = useRef(false)

  async function runSearch() {
    setStatus('loading')
    setError('')
    announce(`Researching ${lead.company}, please wait…`)
    try {
      const res = await researchCompany({
        company: lead.company,
        city: lead.city,
        state: lead.state,
        industry: lead.industry,
      })
      setResult(res)
      setStatus('done')
      announce('Company research ready.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      setStatus('error')
      announce(`Something went wrong. ${msg}`)
    }
  }

  async function runEnrichment() {
    setEnrichStatus('running')
    setEnrichError('')
    setEnrichStatusText('Starting…')
    announce(`Looking up employee count, revenue, and industry for ${lead.company}. This can take a minute — please wait…`)
    try {
      const res = await enrichCompany(
        { company: lead.company, city: lead.city, state: lead.state, industry: lead.industry },
        statusText => {
          if (!cancelledRef.current) setEnrichStatusText(`Still researching… (${statusText})`)
        }
      )
      if (cancelledRef.current) return
      setEnrichResult(res)
      setEnrichStatus('done')
      announce('Company details ready.')
    } catch (err) {
      if (cancelledRef.current) return
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setEnrichError(msg)
      setEnrichStatus('error')
      announce(`Something went wrong. ${msg}`)
    }
  }

  // Auto-start a fresh summary search each time the dialog opens for a (possibly different)
  // lead. Enrichment is opt-in (see runEnrichment above), so it's only reset here, not started.
  useEffect(() => {
    cancelledRef.current = false
    if (open) {
      setResult(null)
      setEnrichStatus('idle')
      setEnrichResult(null)
      setEnrichError('')
      runSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead.id])

  function handleClose() {
    cancelledRef.current = true
    setStatus('idle')
    setResult(null)
    setError('')
    setEnrichStatus('idle')
    setEnrichResult(null)
    setEnrichError('')
    onClose()
  }

  if (!open) return null

  return (
    <FocusTrapDialog
      open={open}
      onClose={handleClose}
      label={`Research ${lead.company}`}
      closeLabel="Close company research"
      contentClassName="research-dialog-content"
    >
      <h2 className="dialog-heading">Research {lead.company}</h2>
      <p className="askai-pii-note">
        Only company name, city/state, and industry are sent to run this web search —
        never email, phone, contact name, or your private notes.
      </p>

      {status === 'loading' && (
        <p className="drawer-ai-loading">Searching…</p>
      )}
      {status === 'error' && (
        <>
          <p className="dialog-error" role="alert">{error}</p>
          <button type="button" className="btn-secondary" onClick={runSearch}>
            Try again
          </button>
        </>
      )}
      {status === 'done' && result && (
        <>
          <div className="drawer-ai-result">{result.text || 'No summary was returned.'}</div>
          {result.citations.length > 0 && (
            <div className="research-citations">
              <h3 className="today-section-heading">Sources</h3>
              <ul>
                {result.citations.map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" className="btn-secondary" onClick={runSearch}>
            Search again
          </button>
        </>
      )}

      <h3 className="today-section-heading">Company details</h3>

      {enrichStatus === 'idle' && (
        <button type="button" className="btn-secondary" onClick={runEnrichment}>
          Look up employee count, revenue, and industry
        </button>
      )}
      {enrichStatus === 'running' && (
        <p className="drawer-ai-loading">{enrichStatusText || 'Starting…'}</p>
      )}
      {enrichStatus === 'error' && (
        <>
          <p className="dialog-error" role="alert">{enrichError}</p>
          <button type="button" className="btn-secondary" onClick={runEnrichment}>
            Try again
          </button>
        </>
      )}
      {enrichStatus === 'done' && enrichResult && (
        <>
          <dl className="research-enrichment-fields">
            <div>
              <dt>Employees</dt>
              <dd>{enrichResult.structured.employees != null ? enrichResult.structured.employees.toLocaleString() : 'Not found'}</dd>
            </div>
            <div>
              <dt>Annual revenue</dt>
              <dd>{enrichResult.structured.annualRevenue != null ? `$${enrichResult.structured.annualRevenue.toLocaleString()}` : 'Not found'}</dd>
            </div>
            <div>
              <dt>Industry</dt>
              <dd>{enrichResult.structured.industry ?? 'Not found'}</dd>
            </div>
          </dl>
          <p className="askai-pii-note">
            Shown here only — not saved to this lead. (Saving these to the lead automatically,
            with your approval, may come later.)
          </p>
          {enrichResult.citations.length > 0 && (
            <div className="research-citations">
              <h3 className="today-section-heading">Sources</h3>
              <ul>
                {enrichResult.citations.map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" className="btn-secondary" onClick={runEnrichment}>
            Look up again
          </button>
        </>
      )}
    </FocusTrapDialog>
  )
}
