import { useMemo, useRef, useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAnnounce } from '../hooks/useAnnounce'
import { useTogglePin } from '../hooks/useTogglePin'
import { useNow } from '../hooks/useNow'
import LeadCard from '../components/LeadCard'
import LeadDrawer from '../components/LeadDrawer'
import ExplainTerm from '../components/ExplainTerm'
import { getTZInfo } from '../utils/tz'
import type { Lead } from '../store/types'

// D-34: replaces the visual US map (T06) with city/state/time-zone filtering, at Tim's
// request — the map itself didn't tell him whether it was actually a good time to call someone
// in a different time zone, which filtering by zone plus a "good calling hours now" toggle does
// directly. LeadCard already shows each lead's local time/calling-hours warning (TZ-01); this
// page's job is narrowing a long list down to who's callable right now.

type StatusFilter = 'all' | 'Hot' | 'Warm' | 'Cold'

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  Hot: 'Hot',
  Warm: 'Warm',
  Cold: 'Cold',
}

const ALL_VALUES = 'all'

export default function CallTimesPage() {
  const store = useStore()
  const announce = useAnnounce()
  const togglePin = useTogglePin()
  const { leads, settings } = store

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [cityFilter, setCityFilter] = useState<string>(ALL_VALUES)
  const [stateFilter, setStateFilter] = useState<string>(ALL_VALUES)
  const [tzFilter, setTzFilter] = useState<string>(ALL_VALUES)
  const [callableNowOnly, setCallableNowOnly] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const now = useNow()

  const cities = useMemo(() => {
    const set = new Set<string>()
    for (const lead of leads) {
      if (lead.city.trim()) set.add(lead.city.trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [leads])

  const states = useMemo(() => {
    const set = new Set<string>()
    for (const lead of leads) {
      if (lead.state.trim()) set.add(lead.state.trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [leads])

  // One option per distinct time zone actually present among leads, labeled with its current
  // abbreviation (e.g. "CDT") so Tim recognizes it without needing to read an IANA zone id.
  const timezones = useMemo(() => {
    const seen = new Map<string, string>()
    for (const lead of leads) {
      if (lead.timezone && !seen.has(lead.timezone)) {
        const info = getTZInfo(lead.timezone, now)
        seen.set(lead.timezone, info?.abbreviation ?? lead.timezone)
      }
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [leads, now])

  const filteredLeads = useMemo(() => {
    return leads
      .filter(l => statusFilter === 'all' || l.status === statusFilter)
      .filter(l => cityFilter === ALL_VALUES || l.city.trim() === cityFilter)
      .filter(l => stateFilter === ALL_VALUES || l.state.trim() === stateFilter)
      .filter(l => tzFilter === ALL_VALUES || l.timezone === tzFilter)
      .filter(l => {
        if (!callableNowOnly) return true
        const info = l.timezone ? getTZInfo(l.timezone, now) : null
        return info !== null && !info.badHour
      })
      .sort((a, b) => b.score - a.score || b.dealValue - a.dealValue)
  }, [leads, statusFilter, cityFilter, stateFilter, tzFilter, callableNowOnly, now])

  const filtersActive =
    statusFilter !== 'all' || cityFilter !== ALL_VALUES || stateFilter !== ALL_VALUES ||
    tzFilter !== ALL_VALUES || callableNowOnly

  // Announce count when filters change (skip initial render)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const count = filteredLeads.length
    announce(`${count} ${count === 1 ? 'lead' : 'leads'} shown`)
  }, [statusFilter, cityFilter, stateFilter, tzFilter, callableNowOnly, filteredLeads.length, announce])

  function clearFilters() {
    setStatusFilter('all')
    setCityFilter(ALL_VALUES)
    setStateFilter(ALL_VALUES)
    setTzFilter(ALL_VALUES)
    setCallableNowOnly(false)
    announce('Filters cleared')
  }

  if (leads.length === 0) {
    return (
      <section aria-labelledby="call-times-heading">
        <h2 id="call-times-heading" className="page-heading">Map</h2>
        <div className="placeholder-content">
          <p>No leads yet. Import leads from the All Leads page to see them here.</p>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="call-times-heading">
      <h2 id="call-times-heading" className="page-heading">Map</h2>
      <p className="leads-filter-intro">
        Filter leads by city, state, or time zone to find who&rsquo;s where — and who you can
        actually call right now.
        <ExplainTerm id="good-calling-hours" />
      </p>

      <div className="calltimes-filter-bar" role="group" aria-label="Filter leads">
        <div className="leads-filter-bar" role="group" aria-label="Filter by status">
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map(f => {
            const count = f === 'all' ? leads.length : leads.filter(l => l.status === f).length
            return (
              <button
                key={f}
                type="button"
                className={`filter-btn${statusFilter === f ? ' filter-btn--active' : ''}`}
                aria-pressed={statusFilter === f}
                onClick={() => setStatusFilter(f)}
              >
                {STATUS_LABELS[f]}
                <span className="filter-btn-count" aria-hidden="true"> ({count})</span>
              </button>
            )
          })}
        </div>

        <div className="calltimes-select-group">
          <label htmlFor="calltimes-city-select">City</label>
          <select
            id="calltimes-city-select"
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
          >
            <option value={ALL_VALUES}>All cities</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        <div className="calltimes-select-group">
          <label htmlFor="calltimes-state-select">State</label>
          <select
            id="calltimes-state-select"
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
          >
            <option value={ALL_VALUES}>All states</option>
            {states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        <div className="calltimes-select-group">
          <label htmlFor="calltimes-tz-select">Time zone</label>
          <select
            id="calltimes-tz-select"
            value={tzFilter}
            onChange={e => setTzFilter(e.target.value)}
          >
            <option value={ALL_VALUES}>All time zones</option>
            {timezones.map(([tz, label]) => (
              <option key={tz} value={tz}>{label}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={`filter-btn${callableNowOnly ? ' filter-btn--active' : ''}`}
          aria-pressed={callableNowOnly}
          onClick={() => setCallableNowOnly(v => !v)}
        >
          Good calling hours only
        </button>

        {filtersActive && (
          <button type="button" className="filter-btn" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <p className="leads-count" aria-live="polite" aria-atomic="true">
        {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
        {filtersActive ? ' matching the current filters' : ''}
      </p>

      {filteredLeads.length === 0 ? (
        <p className="today-empty">No leads match this filter.</p>
      ) : (
        <ul
          className="leads-list"
          aria-label={`Leads, ${filteredLeads.length} total`}
        >
          {filteredLeads.map(lead => (
            <li key={lead.id}>
              <LeadCard lead={lead} settings={settings} now={now} onOpen={() => setSelectedLead(lead)} onTogglePin={() => togglePin(lead)} />
            </li>
          ))}
        </ul>
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
