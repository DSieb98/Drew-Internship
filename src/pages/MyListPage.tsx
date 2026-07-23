import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAnnounce } from '../hooks/useAnnounce'
import { useTogglePin } from '../hooks/useTogglePin'
import LeadCard from '../components/LeadCard'
import LeadDrawer from '../components/LeadDrawer'
import ExplainTerm from '../components/ExplainTerm'
import type { Lead, Settings } from '../store/types'

interface WatchlistItemProps {
  lead: Lead
  settings: Settings
  now: Date
  onOpen: () => void
  onTogglePin: () => void
}

function WatchlistItem({ lead, settings, now, onOpen, onTogglePin }: WatchlistItemProps) {
  const store = useStore()
  const announce = useAnnounce()
  const [draft, setDraft] = useState(lead.pinnedNote)
  const dirty = draft !== lead.pinnedNote

  function saveNote() {
    store.updateLead(lead.id, { pinnedNote: draft })
    announce(draft ? `Note saved for ${lead.company}.` : `Note cleared for ${lead.company}.`)
  }

  return (
    <li className="watchlist-item">
      <LeadCard lead={lead} settings={settings} now={now} onOpen={onOpen} onTogglePin={onTogglePin} />
      <div className="watchlist-note">
        <label htmlFor={`watchlist-note-${lead.id}`}>
          Private note for {lead.company}
          {lead.pinnedNote && !dirty && <span className="watchlist-note-badge"> (has a note)</span>}
        </label>
        <textarea
          id={`watchlist-note-${lead.id}`}
          className="watchlist-note-textarea"
          rows={3}
          value={draft}
          onChange={e => setDraft(e.target.value)}
        />
        <button type="button" className="btn-secondary" onClick={saveNote} disabled={!dirty}>
          Save note
        </button>
      </div>
    </li>
  )
}

export default function MyListPage() {
  const store = useStore()
  const togglePin = useTogglePin()
  const { leads, settings } = store
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const now = useMemo(() => new Date(), [])

  const pinnedLeads = useMemo(
    () =>
      leads
        .filter(l => l.pinned)
        .sort((a, b) => b.score - a.score || b.dealValue - a.dealValue),
    [leads]
  )

  const totalValue = useMemo(
    () => pinnedLeads.reduce((sum, l) => sum + l.dealValue, 0),
    [pinnedLeads]
  )

  return (
    <section aria-labelledby="my-list-heading">
      <h2 id="my-list-heading" className="page-heading">My List</h2>
      <ExplainTerm id="my-list" />

      {pinnedLeads.length === 0 ? (
        <div className="placeholder-content">
          <p>
            You haven't pinned any leads yet. Open a lead from Today, All Leads, or the Map, and
            select "Pin" to keep an eye on it here.
          </p>
        </div>
      ) : (
        <>
          <div className="watchlist-summary" role="status">
            <p>
              {pinnedLeads.length} pinned {pinnedLeads.length === 1 ? 'lead' : 'leads'}
              {' · '}Total potential value: ${totalValue.toLocaleString()}
            </p>
          </div>

          <ul className="leads-list watchlist-list" aria-label={`My List, ${pinnedLeads.length} pinned leads`}>
            {pinnedLeads.map(lead => (
              <WatchlistItem
                key={lead.id}
                lead={lead}
                settings={settings}
                now={now}
                onOpen={() => setSelectedLead(lead)}
                onTogglePin={() => togglePin(lead)}
              />
            ))}
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
