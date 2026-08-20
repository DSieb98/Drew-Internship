/**
 * Found live 2026-08-20: "All leads" scope against the real ~21,212-lead production account
 * built a prompt that failed with "280498 tokens > 200000 maximum". These tests prove the fix
 * — selectLeadsForPrompt caps and sorts what actually goes into the prompt.
 */
import { describe, it, expect } from 'vitest'
import { selectLeadsForPrompt, summarizeLead, MAX_LEADS_IN_PROMPT } from './askAiPrompt'
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

describe('selectLeadsForPrompt', () => {
  it('returns every lead untouched when under the cap', () => {
    const leads = [makeLead({}), makeLead({})]
    const result = selectLeadsForPrompt(leads, 10)
    expect(result.truncated).toBe(false)
    expect(result.included).toHaveLength(2)
  })

  it('caps and flags truncation when over the cap', () => {
    const leads = Array.from({ length: 25 }, () => makeLead({}))
    const result = selectLeadsForPrompt(leads, 10)
    expect(result.truncated).toBe(true)
    expect(result.included).toHaveLength(10)
  })

  it('keeps the highest-scoring leads when truncating', () => {
    const low = makeLead({ company: 'Low', score: 10 })
    const mid = makeLead({ company: 'Mid', score: 50 })
    const high = makeLead({ company: 'High', score: 90 })
    const result = selectLeadsForPrompt([low, mid, high], 2)
    expect(result.included.map(l => l.company)).toEqual(['High', 'Mid'])
  })

  it('never exceeds the default cap even at real-account scale', () => {
    const leads = Array.from({ length: 21212 }, (_, i) => makeLead({ score: i % 100 }))
    const result = selectLeadsForPrompt(leads)
    expect(result.truncated).toBe(true)
    expect(result.included.length).toBe(MAX_LEADS_IN_PROMPT)
  })
})

describe('summarizeLead', () => {
  it('excludes email, phone, and pinnedNote', () => {
    const lead = makeLead({ email: 'a@b.com', phone: '555-1234', pinnedNote: 'secret note' })
    const summary = summarizeLead(lead)
    expect(summary).not.toContain('a@b.com')
    expect(summary).not.toContain('555-1234')
    expect(summary).not.toContain('secret note')
  })

  it('includes company, status, and score', () => {
    const lead = makeLead({ company: 'Acme', status: 'Hot', score: 88 })
    const summary = summarizeLead(lead)
    expect(summary).toContain('Acme')
    expect(summary).toContain('status Hot')
    expect(summary).toContain('score 88/100')
  })
})
