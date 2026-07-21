import { useMemo, useRef, useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext'
import { useAnnounce } from '../hooks/useAnnounce'
import USAMap from '../components/USAMap'
import LeadCard from '../components/LeadCard'
import LeadDrawer from '../components/LeadDrawer'
import type { Lead } from '../store/types'

type StatusFilter = 'all' | 'Hot' | 'Warm' | 'Cold'

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All',
  Hot: 'Hot',
  Warm: 'Warm',
  Cold: 'Cold',
}

const ALL_CITIES = 'all'

export default function MapPage() {
  const store = useStore()
  const announce = useAnnounce()
  const { leads, settings } = store

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [cityFilter, setCityFilter] = useState<string>(ALL_CITIES)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const now = useMemo(() => new Date(), [])

  const cities = useMemo(() => {
    const set = new Set<string>()
    for (const lead of leads) {
      if (lead.city.trim()) set.add(lead.city.trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [leads])

  const filteredLeads = useMemo(() => {
    return leads
      .filter(l => statusFilter === 'all' || l.status === statusFilter)
      .filter(l => cityFilter === ALL_CITIES || l.city.trim() === cityFilter)
      .sort((a, b) => b.score - a.score || b.dealValue - a.dealValue)
  }, [leads, statusFilter, cityFilter])

  const filtersActive = statusFilter !== 'all' || cityFilter !== ALL_CITIES

  // Announce count when filters change (skip initial render)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    const count = filteredLeads.length
    announce(`${count} ${count === 1 ? 'lead' : 'leads'} shown on the map`)
  }, [statusFilter, cityFilter, filteredLeads.length, announce])

  function clearFilters() {
    setStatusFilter('all')
    setCityFilter(ALL_CITIES)
    announce('Filters cleared')
  }

  if (leads.length === 0) {
    return (
      <section aria-labelledby="map-heading">
        <h2 id="map-heading" className="page-heading">Map</h2>
        <div className="placeholder-content">
          <p>No leads yet. Import leads from the All Leads page to see them on the map.</p>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="map-heading">
      <h2 id="map-heading" className="page-heading">Map</h2>

      <div className="map-filter-bar" role="group" aria-label="Filter leads shown on the map">
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

        <div className="map-city-filter">
          <label htmlFor="map-city-select">City</label>
          <select
            id="map-city-select"
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
          >
            <option value={ALL_CITIES}>All cities</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

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

      <div className="map-legend" aria-hidden="true">
        <span className="map-legend-item"><span className="usa-map-pin usa-map-pin--hot" /> Hot</span>
        <span className="map-legend-item"><span className="usa-map-pin usa-map-pin--warm" /> Warm</span>
        <span className="map-legend-item"><span className="usa-map-pin usa-map-pin--cold" /> Cold</span>
      </div>

      <div className="map-container">
        <USAMap leads={filteredLeads} />
      </div>

      <h3 className="today-section-heading">
        Leads on the map
        <span className="today-section-count" aria-label={`${filteredLeads.length} leads`}>
          {' '}({filteredLeads.length})
        </span>
      </h3>

      {filteredLeads.length === 0 ? (
        <p className="today-empty">No leads match this filter.</p>
      ) : (
        <ul
          className="leads-list"
          aria-label={`Leads on the map, ${filteredLeads.length} total`}
        >
          {filteredLeads.map(lead => (
            <li key={lead.id}>
              <LeadCard lead={lead} settings={settings} now={now} onOpen={() => setSelectedLead(lead)} />
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
