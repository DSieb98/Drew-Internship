import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAnnounce } from '../hooks/useAnnounce'
import ExplainTerm from '../components/ExplainTerm'
import NurtureTouchDialog from '../components/NurtureTouchDialog'
import { isGoneQuiet } from '../utils/leadActivity'
import { makeInitialTouches, currentTouchIndex, touchDueDate, isActiveInNurture, hasGraduatedFromNurture } from '../nurture/nurturePlan'
import type { Lead } from '../store/types'

// M3-T01 — a Cold lead is a nurture *candidate* once it's gone quiet by the same silence
// threshold the existing "Gone Quiet" filter (AllLeadsPage) already uses, restricted to Cold
// status: REQ-10 is specifically for leads "below the score threshold," not every quiet lead
// regardless of status (a quiet Hot/Warm lead still belongs on Today, not here).
function isNurtureCandidate(lead: Lead, silenceDays: number, now: Date): boolean {
  return lead.status === 'Cold' && !lead.nurtureEnrolled && !lead.nurtureArchived
    && isGoneQuiet(lead, silenceDays, now)
}

export default function NurturePage() {
  const store = useStore()
  const announce = useAnnounce()
  const { leads, settings, loading, error } = store
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [enrollingId, setEnrollingId] = useState<string | null>(null)

  const now = useMemo(() => new Date(), [])

  // Looked up live (not a stale snapshot) so NurtureTouchDialog sees each committed touch
  // immediately and can advance to the next one without being closed and reopened.
  const selectedLead = selectedLeadId ? leads.find(l => l.id === selectedLeadId) ?? null : null

  const candidates = useMemo(
    () => leads.filter(l => isNurtureCandidate(l, settings.nurtureSilenceDays, now))
      .sort((a, b) => (a.lastContactDate ?? a.importedAt) > (b.lastContactDate ?? b.importedAt) ? 1 : -1),
    [leads, settings.nurtureSilenceDays, now]
  )

  const active = useMemo(
    () => leads.filter(isActiveInNurture)
      .sort((a, b) => {
        const aDue = a.nurtureEnrolledAt ? touchDueDate(a.nurtureEnrolledAt, Math.max(0, currentTouchIndex(a.nurtureTouches))) : ''
        const bDue = b.nurtureEnrolledAt ? touchDueDate(b.nurtureEnrolledAt, Math.max(0, currentTouchIndex(b.nurtureTouches))) : ''
        return aDue > bDue ? 1 : -1
      }),
    [leads]
  )

  const graduated = useMemo(() => leads.filter(hasGraduatedFromNurture), [leads])
  const archived = useMemo(() => leads.filter(l => l.nurtureArchived), [leads])

  async function enroll(lead: Lead) {
    setEnrollingId(lead.id)
    const today = new Date().toISOString().split('T')[0]
    try {
      await store.updateLead(lead.id, {
        nurtureEnrolled: true,
        nurtureEnrolledAt: today,
        nurtureTouches: makeInitialTouches(),
        nurtureArchived: false,
      })
      announce(`${lead.company} enrolled in the nurture sequence.`)
    } finally {
      setEnrollingId(null)
    }
  }

  async function restore(lead: Lead) {
    await store.updateLead(lead.id, { nurtureArchived: false })
    announce(`${lead.company} restored to active nurture.`)
  }

  async function clearGraduated(lead: Lead) {
    await store.updateLead(lead.id, { nurtureEnrolled: false })
    announce(`${lead.company} cleared from the nurture list.`)
  }

  if (leads.length === 0) {
    return (
      <section aria-labelledby="nurture-heading">
        <h2 id="nurture-heading" className="page-heading">Nurture</h2>
        {loading.leads ? (
          <p className="placeholder-content" role="status">Loading leads from LACRM…</p>
        ) : error.leads ? (
          <p className="dialog-error" role="alert">Couldn't load leads from LACRM: {error.leads}</p>
        ) : (
          <div className="placeholder-content">
            <p>No leads yet. Import leads from the All Leads page to see nurture candidates here.</p>
          </div>
        )}
      </section>
    )
  }

  return (
    <>
    <section aria-labelledby="nurture-heading">
      <h2 id="nurture-heading" className="page-heading">Nurture</h2>
      <p className="leads-filter-intro">
        Cold leads that have gone quiet, tracked through a 4-touch check-in sequence.
        <ExplainTerm id="nurture-sequence" />
      </p>

      {/* Eligible candidates */}
      <section aria-labelledby="nurture-candidates-heading" className="today-section">
        <h3 id="nurture-candidates-heading" className="today-section-heading">
          Ready to Enroll
          <span className="today-section-count" aria-label={`${candidates.length} leads`}> ({candidates.length})</span>
        </h3>
        {candidates.length === 0 ? (
          <p className="today-empty">No Cold leads have gone quiet right now.</p>
        ) : (
          <ul className="nurture-list" aria-label={`Ready to enroll, ${candidates.length} ${candidates.length === 1 ? 'lead' : 'leads'}`}>
            {candidates.map(lead => (
              <li key={lead.id} className="nurture-item">
                <div className="nurture-item-info">
                  <span className="nurture-item-company">{lead.company}</span>
                  {lead.contactName && <span className="nurture-item-contact"> — {lead.contactName}</span>}
                  <span className="nurture-item-meta">
                    {lead.lastContactDate
                      ? `Last contact ${new Date(lead.lastContactDate + 'T00:00:00').toLocaleDateString()}`
                      : 'Never contacted'}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => enroll(lead)}
                  disabled={enrollingId === lead.id}
                >
                  {enrollingId === lead.id ? 'Enrolling…' : 'Enroll in nurture'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Active nurture */}
      <section aria-labelledby="nurture-active-heading" className="today-section">
        <h3 id="nurture-active-heading" className="today-section-heading">
          Active Nurture
          <span className="today-section-count" aria-label={`${active.length} leads`}> ({active.length})</span>
        </h3>
        {active.length === 0 ? (
          <p className="today-empty">No leads currently enrolled.</p>
        ) : (
          <ul className="nurture-list" aria-label={`Active nurture, ${active.length} ${active.length === 1 ? 'lead' : 'leads'}`}>
            {active.map(lead => {
              const stepIdx = currentTouchIndex(lead.nurtureTouches)
              const due = lead.nurtureEnrolledAt && stepIdx >= 0 ? touchDueDate(lead.nurtureEnrolledAt, stepIdx) : null
              return (
                <li key={lead.id} className="nurture-item">
                  <div className="nurture-item-info">
                    <span className="nurture-item-company">{lead.company}</span>
                    {lead.contactName && <span className="nurture-item-contact"> — {lead.contactName}</span>}
                    <span className="nurture-item-meta">
                      Touch {stepIdx >= 0 ? stepIdx + 1 : 4} of 4
                      {due ? ` — due ${new Date(due + 'T00:00:00').toLocaleDateString()}` : ' — all touches complete'}
                    </span>
                  </div>
                  <button type="button" className="btn-secondary" onClick={() => setSelectedLeadId(lead.id)}>
                    Manage touches
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Graduated — still flagged enrolled, but no longer Cold */}
      {graduated.length > 0 && (
        <section aria-labelledby="nurture-graduated-heading" className="today-section">
          <h3 id="nurture-graduated-heading" className="today-section-heading">
            Moved Back to Main Pipeline
            <span className="today-section-count" aria-label={`${graduated.length} leads`}> ({graduated.length})</span>
          </h3>
          <p className="today-empty">
            These leads' scores improved out of Cold, so they no longer need nurturing — find them
            on Today or All Leads.
          </p>
          <ul className="nurture-list" aria-label={`Moved back to main pipeline, ${graduated.length} ${graduated.length === 1 ? 'lead' : 'leads'}`}>
            {graduated.map(lead => (
              <li key={lead.id} className="nurture-item">
                <div className="nurture-item-info">
                  <span className="nurture-item-company">{lead.company}</span>
                  <span className="nurture-item-meta">Now {lead.status}</span>
                </div>
                <button type="button" className="btn-secondary" onClick={() => clearGraduated(lead)}>
                  Clear from this list
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <details className="nurture-archived-details">
          <summary className="drawer-breakdown-summary">Archived ({archived.length})</summary>
          <ul className="nurture-list" aria-label={`Archived, ${archived.length} ${archived.length === 1 ? 'lead' : 'leads'}`}>
            {archived.map(lead => (
              <li key={lead.id} className="nurture-item">
                <div className="nurture-item-info">
                  <span className="nurture-item-company">{lead.company}</span>
                </div>
                <button type="button" className="btn-secondary" onClick={() => restore(lead)}>
                  Restore to active nurture
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>

    {selectedLead && (
      <NurtureTouchDialog
        key={selectedLead.id}
        lead={selectedLead}
        onClose={() => setSelectedLeadId(null)}
      />
    )}
    </>
  )
}
