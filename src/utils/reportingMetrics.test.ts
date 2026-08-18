/**
 * M5-T01/T02 — reporting metrics that are genuinely sourceable today (D-37, no new tracking).
 * Covers stage-order counting (including legacy stage names and leads never placed in the
 * pipeline) and the qualification-cutoff count.
 */
import { describe, it, expect } from 'vitest'
import { countAtOrPastStage, countQualifiedLeads } from './reportingMetrics'
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

describe('countAtOrPastStage', () => {
  it('counts a lead exactly at the target stage', () => {
    const lead = makeLead({ stage: 'Sample Box Sent' })
    expect(countAtOrPastStage([lead], 'Sample Box Sent')).toBe(1)
  })

  it('counts a lead that has moved past the target stage', () => {
    const lead = makeLead({ stage: 'First Order' })
    expect(countAtOrPastStage([lead], 'Sample Box Sent')).toBe(1)
  })

  it('does not count a lead that has not reached the target stage yet', () => {
    const lead = makeLead({ stage: 'Discovery Call' })
    expect(countAtOrPastStage([lead], 'Sample Box Sent')).toBe(0)
  })

  it('does not count a lead never placed in the pipeline (New Lead/Contacted)', () => {
    const notPlaced = makeLead({ stage: 'Contacted' })
    expect(countAtOrPastStage([notPlaced], 'Qualified')).toBe(0)
  })

  it('resolves legacy stage names before comparing (e.g. "Sample Sent" -> "Sample Box Sent")', () => {
    const legacy = makeLead({ stage: 'Sample Sent' })
    expect(countAtOrPastStage([legacy], 'Sample Box Sent')).toBe(1)
  })
})

describe('countQualifiedLeads', () => {
  it('counts every lead when the threshold is 0 (current default)', () => {
    const leads = [makeLead({ score: 0 }), makeLead({ score: 40 }), makeLead({ score: 90 })]
    expect(countQualifiedLeads(leads, 0)).toBe(3)
  })

  it('excludes leads below a real threshold', () => {
    const leads = [makeLead({ score: 20 }), makeLead({ score: 60 }), makeLead({ score: 90 })]
    expect(countQualifiedLeads(leads, 50)).toBe(2)
  })
})
