/**
 * D-30/D-31 — AI assistant "Find a lead" navigation. Proves matching works by company/contact
 * name (D-30) and by city/state, including a natural phrase like "the guy from this city"
 * rather than requiring the exact city name alone (D-31).
 */
import { describe, it, expect } from 'vitest'
import { findLeads } from './leadSearch'
import type { Lead } from '../store/types'

let nextId = 1
function makeLead(overrides: Partial<Lead>): Lead {
  return {
    id: String(nextId++),
    company: 'Acme Corp',
    contactName: 'Jane Smith',
    email: '',
    phone: '',
    city: 'Dallas',
    state: 'TX',
    timezone: 'America/Chicago',
    dealValue: 0,
    stage: '',
    score: 50,
    scoreBreakdown: [],
    status: 'Warm',
    statusOverride: null,
    pinned: false,
    pinnedNote: '',
    called: false,
    lastContactDate: null,
    employees: null,
    annualRevenue: null,
    industry: null,
    jobTitle: null,
    nurtureEnrolled: false,
    nurtureEnrolledAt: null,
    nurtureTouches: [],
    nurtureArchived: false,
    importedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('findLeads', () => {
  it('matches by company name', () => {
    const acme = makeLead({ company: 'Acme Corp', city: 'Reno', state: 'NV' })
    const other = makeLead({ company: 'Other Inc', city: 'Reno', state: 'NV' })
    const { matches } = findLeads([acme, other], 'acme')
    expect(matches.map(l => l.id)).toEqual([acme.id])
  })

  it('matches by contact name', () => {
    const lead = makeLead({ contactName: 'John Doe' })
    const { matches } = findLeads([lead], 'john')
    expect(matches).toHaveLength(1)
  })

  it('matches by exact city name', () => {
    const dallas = makeLead({ company: 'A', city: 'Dallas', state: 'TX' })
    const austin = makeLead({ company: 'B', city: 'Austin', state: 'TX' })
    const { matches } = findLeads([dallas, austin], 'dallas')
    expect(matches.map(l => l.id)).toEqual([dallas.id])
  })

  it('matches a natural phrase mentioning the city ("the guy from this city")', () => {
    const dallas = makeLead({ company: 'A', city: 'Dallas', state: 'TX' })
    const austin = makeLead({ company: 'B', city: 'Austin', state: 'TX' })
    const { matches } = findLeads([dallas, austin], 'the guy from dallas')
    expect(matches.map(l => l.id)).toEqual([dallas.id])
  })

  it('matches by state abbreviation as a whole word', () => {
    const tx = makeLead({ company: 'A', city: 'Dallas', state: 'TX' })
    const ca = makeLead({ company: 'B', city: 'Fresno', state: 'CA' })
    const { matches } = findLeads([tx, ca], 'anyone in tx')
    expect(matches.map(l => l.id)).toEqual([tx.id])
  })

  it('matches by full state name even though the lead stores an abbreviation', () => {
    const tx = makeLead({ company: 'A', city: 'Dallas', state: 'TX' })
    const { matches } = findLeads([tx], 'someone from texas')
    expect(matches).toHaveLength(1)
  })

  it('does not let a 2-letter state code match inside an unrelated word', () => {
    // "context" contains "tx" as a substring — must not spuriously match Texas leads.
    const tx = makeLead({ company: 'A', city: 'Dallas', state: 'TX' })
    const { matches } = findLeads([tx], 'give me context please')
    expect(matches).toHaveLength(0)
  })

  it('returns totalMatches even when results are truncated to the display cap', () => {
    const leads = Array.from({ length: 12 }, (_, i) =>
      makeLead({ company: `Company ${i}`, city: 'Dallas', state: 'TX' })
    )
    const { matches, totalMatches } = findLeads(leads, 'dallas')
    expect(totalMatches).toBe(12)
    expect(matches.length).toBe(8)
  })

  it('returns nothing for a blank query', () => {
    const lead = makeLead({})
    expect(findLeads([lead], '   ')).toEqual({ matches: [], totalMatches: 0 })
  })
})
