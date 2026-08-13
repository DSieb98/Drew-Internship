import { useMemo, useRef, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { useAnnounce } from '../hooks/useAnnounce'
import { useTogglePin } from '../hooks/useTogglePin'
import { useNow } from '../hooks/useNow'
import LeadImportDialog from '../components/LeadImportDialog'
import LeadCard from '../components/LeadCard'
import LeadDrawer from '../components/LeadDrawer'
import ExplainTerm from '../components/ExplainTerm'
import { isGoneQuiet } from '../utils/leadActivity'
import type { Lead } from '../store/types'

type Filter = 'all' | 'call-today' | 'follow-up' | 'gone-quiet'

const FILTER_LABELS: Record<Filter, string> = {
  'all': 'All',
  'call-today': 'Call Today',
  'follow-up': 'Follow-Up',
  'gone-quiet': 'Gone Quiet',
}

export default function AllLeadsPage() {
  const store = useStore()
  const announce = useAnnounce()
  const togglePin = useTogglePin()
  const location = useLocation()
  const navigate = useNavigate()
  const { leads, settings, loading, error } = store

  const [dialogOpen, setDialogOpen] = useState(false)
  const [lastImportCount, setLastImportCount] = useState<number | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const now = useNow()

  // Opens a lead handed off by the AI assistant's "Find a lead" navigation
  // (AskAiDialog) once leads have finished loading, then clears the nav state
  // so revisiting this page later doesn't reopen it.
  useEffect(() => {
    const openLeadId = (location.state as { openLeadId?: string } | null)?.openLeadId
    if (!openLeadId || loading.leads) return
    const lead = leads.find(l => l.id === openLeadId)
    if (lead) setSelectedLead(lead)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, leads, loading.leads, navigate])

  const filteredLeads = useMemo(() => {
    let result: Lead[]
    switch (filter) {
      case 'call-today':
        result = leads.filter(l => l.status === 'Hot')
        break
      case 'follow-up':
        result = leads.filter(l => l.status === 'Warm')
        break
      case 'gone-quiet':
        result = leads.filter(l => isGoneQuiet(l, settings.nurtureSilenceDays, now))
        break
      default:
        result = leads
    }
    return result.sort((a, b) => b.score - a.score || b.dealValue - a.dealValue)
  }, [leads, filter, settings.nurtureSilenceDays, now])

  // Announce count when filter or lead count changes (skip initial render)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const label = FILTER_LABELS[filter]
    const count = filteredLeads.length
    announce(`${label}: ${count} ${count === 1 ? 'lead' : 'leads'}`)
  }, [filter, filteredLeads.length, announce])

  function handleImported(count: number) {
    setLastImportCount(count)
  }

  return (
    <section aria-labelledby="all-leads-heading">
      <h2 id="all-leads-heading" className="page-heading">All Leads</h2>

      <div className="all-leads-toolbar">
        <button
          type="button"
          className="btn-primary"
          onClick={() => setDialogOpen(true)}
        >
          Import leads from spreadsheet
        </button>
      </div>

      {lastImportCount !== null && (
        <div className="import-success-banner" role="status">
          {lastImportCount} {lastImportCount === 1 ? 'lead' : 'leads'} imported successfully.
        </div>
      )}

      {leads.length === 0 ? (
        loading.leads ? (
          <p className="placeholder-content" role="status">Loading leads from LACRM…</p>
        ) : error.leads ? (
          <p className="dialog-error" role="alert">Couldn't load leads from LACRM: {error.leads}</p>
        ) : (
          <div className="placeholder-content">
            <p>No leads yet. Use the button above to import leads from a spreadsheet.</p>
          </div>
        )
      ) : (
        <>
          {/* Filter bar */}
          <p className="leads-filter-intro">
            Filter by status
            <ExplainTerm id="hot-warm-cold" />
            <ExplainTerm id="gone-quiet" />
          </p>
          <div className="leads-filter-bar" role="group" aria-label="Filter leads">
            {(Object.keys(FILTER_LABELS) as Filter[]).map(f => {
              const count = f === 'all' ? leads.length
                : f === 'call-today' ? leads.filter(l => l.status === 'Hot').length
                : f === 'follow-up' ? leads.filter(l => l.status === 'Warm').length
                : leads.filter(l => isGoneQuiet(l, settings.nurtureSilenceDays, now)).length

              return (
                <button
                  key={f}
                  type="button"
                  className={`filter-btn${filter === f ? ' filter-btn--active' : ''}`}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {FILTER_LABELS[f]}
                  <span className="filter-btn-count" aria-hidden="true"> ({count})</span>
                </button>
              )
            })}
          </div>

          {/* Lead count (SR-visible) */}
          <p className="leads-count" aria-live="polite" aria-atomic="true">
            {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
            {filter !== 'all' ? ` — ${FILTER_LABELS[filter]}` : ''}
          </p>

          {filteredLeads.length === 0 ? (
            <p className="today-empty">No leads match this filter.</p>
          ) : (
            <ul
              className="leads-list"
              aria-label={`${FILTER_LABELS[filter]} leads, ${filteredLeads.length} total`}
            >
              {filteredLeads.map(lead => (
                <li key={lead.id}>
                  <LeadCard lead={lead} settings={settings} now={now} onOpen={() => setSelectedLead(lead)} onTogglePin={() => togglePin(lead)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <LeadImportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onImported={handleImported}
      />

      {selectedLead && (
        <LeadDrawer
          key={selectedLead.id}
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          settings={settings}
        />
      )}
    </section>
  )
}
