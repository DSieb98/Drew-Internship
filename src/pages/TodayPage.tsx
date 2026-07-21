import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAnnounce } from '../hooks/useAnnounce'
import LeadCard from '../components/LeadCard'
import LeadDrawer from '../components/LeadDrawer'
import type { Lead } from '../store/types'

function daysSince(dateStr: string, now: Date): number {
  const ref = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'))
  return (now.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24)
}

function isGoneQuiet(lead: Lead, silenceDays: number, now: Date): boolean {
  const refStr = lead.lastContactDate ?? lead.importedAt.split('T')[0]
  return daysSince(refStr, now) >= silenceDays
}

export default function TodayPage() {
  const store = useStore()
  const announce = useAnnounce()
  const { leads, settings } = store
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // Stable "now" for the whole render (avoid per-card drift)
  const now = useMemo(() => new Date(), [])

  const hotLeads = useMemo(
    () =>
      leads
        .filter(l => l.status === 'Hot')
        .sort((a, b) => b.score - a.score || b.dealValue - a.dealValue),
    [leads]
  )

  const warmLeads = useMemo(
    () =>
      leads
        .filter(l => l.status === 'Warm')
        .sort((a, b) => b.score - a.score || b.dealValue - a.dealValue),
    [leads]
  )

  // REQ-07: highest-value Hot lead at or above the deal-value alert threshold
  const alertLead = useMemo(
    () =>
      hotLeads
        .filter(l => l.dealValue >= settings.hotAlertMinDealValue)
        .sort((a, b) => b.dealValue - a.dealValue)[0] ?? null,
    [hotLeads, settings.hotAlertMinDealValue]
  )

  // Recent activity: leads contacted within the configurable window, newest first, max 5
  const recentlyContacted = useMemo(
    () =>
      leads
        .filter(l => l.lastContactDate && daysSince(l.lastContactDate, now) < settings.recentActivityDays)
        .sort((a, b) => (b.lastContactDate! > a.lastContactDate! ? 1 : -1))
        .slice(0, 5),
    [leads, now, settings.recentActivityDays]
  )

  // Announce the hot alert once when it changes
  const prevAlertId = useRef<string | null>(undefined)
  useEffect(() => {
    if (alertLead && alertLead.id !== prevAlertId.current) {
      announce(
        `Hot lead alert: ${alertLead.company}` +
        (alertLead.dealValue > 0 ? `, deal value $${alertLead.dealValue.toLocaleString()}` : '')
      )
    }
    prevAlertId.current = alertLead?.id ?? null
  }, [alertLead, announce])

  if (leads.length === 0) {
    return (
      <section aria-labelledby="today-heading">
        <h2 id="today-heading" className="page-heading">Today</h2>
        <div className="placeholder-content">
          <p>No leads yet. Import leads from the All Leads page to see your daily priorities here.</p>
        </div>
      </section>
    )
  }

  return (
    <>
    <section aria-labelledby="today-heading">
      <h2 id="today-heading" className="page-heading">Today</h2>

      {/* REQ-07: Hot lead alert */}
      {alertLead && (
        <div className="hot-alert" role="status" aria-label={
          `Hot lead alert: ${alertLead.company}` +
          (alertLead.dealValue > 0 ? `, $${alertLead.dealValue.toLocaleString()} deal value` : '')
        }>
          <span className="hot-alert-badge" aria-hidden="true">Hot Lead Alert</span>
          <span className="hot-alert-company">{alertLead.company}</span>
          {alertLead.contactName && (
            <span className="hot-alert-contact" aria-hidden="true"> — {alertLead.contactName}</span>
          )}
          {alertLead.dealValue > 0 && (
            <span className="hot-alert-value" aria-hidden="true">
              {' '}· ${alertLead.dealValue.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Call Today */}
      <section aria-labelledby="call-today-heading" className="today-section">
        <h3 id="call-today-heading" className="today-section-heading">
          Call Today
          <span className="today-section-count" aria-label={`${hotLeads.length} leads`}>
            {' '}({hotLeads.length})
          </span>
        </h3>
        {hotLeads.length === 0 ? (
          <p className="today-empty">No hot leads at this time.</p>
        ) : (
          <ul className="leads-list" aria-label={`Call today, ${hotLeads.length} ${hotLeads.length === 1 ? 'lead' : 'leads'}`}>
            {hotLeads.map(lead => (
              <li key={lead.id}>
                <LeadCard lead={lead} settings={settings} now={now} onOpen={() => setSelectedLead(lead)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Follow-Up */}
      <section aria-labelledby="follow-up-heading" className="today-section">
        <h3 id="follow-up-heading" className="today-section-heading">
          Follow-Up Needed
          <span className="today-section-count" aria-label={`${warmLeads.length} leads`}>
            {' '}({warmLeads.length})
          </span>
        </h3>
        {warmLeads.length === 0 ? (
          <p className="today-empty">No warm leads at this time.</p>
        ) : (
          <ul className="leads-list" aria-label={`Follow-up needed, ${warmLeads.length} ${warmLeads.length === 1 ? 'lead' : 'leads'}`}>
            {warmLeads.map(lead => (
              <li key={lead.id}>
                <LeadCard lead={lead} settings={settings} now={now} onOpen={() => setSelectedLead(lead)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent Activity */}
      <section aria-labelledby="recent-activity-heading" className="today-section">
        <h3 id="recent-activity-heading" className="today-section-heading">Recent Activity</h3>
        {recentlyContacted.length === 0 ? (
          <p className="today-empty">No leads contacted in the past {settings.recentActivityDays} days.</p>
        ) : (
          <>
            <p className="today-activity-summary" aria-hidden="true">
              {recentlyContacted.length} {recentlyContacted.length === 1 ? 'lead' : 'leads'} contacted in the past {settings.recentActivityDays} days.
            </p>
            <ul
              className="leads-list"
              aria-label={`Recently contacted, ${recentlyContacted.length} ${recentlyContacted.length === 1 ? 'lead' : 'leads'}`}
            >
              {recentlyContacted.map(lead => (
                <li key={lead.id}>
                  <LeadCard lead={lead} settings={settings} now={now} onOpen={() => setSelectedLead(lead)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Gone-quiet summary */}
      {(() => {
        const quietCount = leads.filter(l => isGoneQuiet(l, settings.nurtureSilenceDays, now)).length
        return quietCount > 0 ? (
          <p className="today-quiet-notice" role="status">
            <strong>{quietCount}</strong> {quietCount === 1 ? 'lead has' : 'leads have'} gone quiet
            (no contact in {settings.nurtureSilenceDays}+ days). See All Leads → Gone Quiet.
          </p>
        ) : null
      })()}
    </section>

      {selectedLead && (
        <LeadDrawer
          key={selectedLead.id}
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          settings={settings}
        />
      )}
    </>
  )
}
