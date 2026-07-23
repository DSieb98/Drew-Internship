import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import LeadDrawer from '../components/LeadDrawer'
import type { CallLog, Lead } from '../store/types'

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function HistoryPage() {
  const store = useStore()
  const { callLogs, leads, settings } = store
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const leadsById = useMemo(() => {
    const map = new Map<string, Lead>()
    for (const lead of leads) map.set(lead.id, lead)
    return map
  }, [leads])

  const sortedLogs = useMemo(
    () => [...callLogs].sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0)),
    [callLogs]
  )

  function describe(log: CallLog, lead: Lead | undefined): string {
    return [
      lead ? lead.company : 'Unknown lead',
      `Called ${formatDate(log.date)}`,
      `Duration ${log.durationMinutes} ${log.durationMinutes === 1 ? 'minute' : 'minutes'}`,
      `Outcome: ${log.outcome}`,
      log.notes ? `Notes: ${log.notes}` : null,
    ].filter(Boolean).join('. ')
  }

  return (
    <section aria-labelledby="history-heading">
      <h2 id="history-heading" className="page-heading">History</h2>

      {sortedLogs.length === 0 ? (
        <div className="placeholder-content">
          <p>No calls logged yet. Open a lead and choose "Log a call" to record one here.</p>
        </div>
      ) : (
        <>
          <p className="leads-count" aria-live="polite" aria-atomic="true">
            {sortedLogs.length} {sortedLogs.length === 1 ? 'call logged' : 'calls logged'}
          </p>
          <ul className="call-history-list" aria-label={`Call history, ${sortedLogs.length} calls`}>
            {sortedLogs.map(log => {
              const lead = leadsById.get(log.leadId)
              return (
                <li key={log.id} className="call-history-item" aria-label={describe(log, lead)}>
                  <div className="call-history-item-header">
                    {lead ? (
                      <button
                        type="button"
                        className="call-history-lead-link"
                        onClick={() => setSelectedLead(lead)}
                      >
                        {lead.company}
                      </button>
                    ) : (
                      <span className="call-history-lead-link call-history-lead-link--gone">
                        Unknown lead
                      </span>
                    )}
                    <span className={`call-history-outcome call-history-outcome--${log.outcome.toLowerCase().replace(/\s+/g, '-')}`} aria-hidden="true">
                      {log.outcome}
                    </span>
                  </div>
                  <div className="call-history-item-meta" aria-hidden="true">
                    <span>{formatDate(log.date)}</span>
                    <span>{log.durationMinutes} {log.durationMinutes === 1 ? 'minute' : 'minutes'}</span>
                  </div>
                  {log.notes && (
                    <p className="call-history-notes" aria-hidden="true">{log.notes}</p>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

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
