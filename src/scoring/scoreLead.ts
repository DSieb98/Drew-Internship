import type { Lead, Settings, ScoreCriterionResult, Tier } from '../store/types'

export interface ScoreResult {
  total: number
  breakdown: ScoreCriterionResult[]
}

// Find the highest tier whose min the value satisfies (tiers need not be contiguous).
function matchTier(value: number, tiers: Tier[]): number {
  const sorted = [...tiers].sort((a, b) => b.min - a.min)
  for (const t of sorted) {
    if (value >= t.min) return t.points
  }
  return 0
}

function textOf(lead: Lead, ...fields: (keyof Lead)[]): string {
  return fields.map(f => String(lead[f] ?? '')).join(' ').toLowerCase()
}

function hasAny(text: string, patterns: string[]): boolean {
  return patterns.some(p => text.includes(p))
}

export function scoreLead(lead: Lead, settings: Settings): ScoreResult {
  const breakdown: ScoreCriterionResult[] = []
  let total = 0

  function add(id: string, label: string, maxPoints: number, earned: number) {
    breakdown.push({ id, label, maxPoints, earnedPoints: earned })
    total += earned
  }

  // S-01: USA Based (+7) — a non-empty state field indicates a US-located lead
  add('S-01', 'USA Based', 7, lead.state ? 7 : 0)

  // S-02: Employees — configurable 4-tier points
  const empMax = Math.max(...settings.employeeTiers.map(t => t.points))
  add(
    'S-02', '250+ Employees', empMax,
    lead.employees !== null && lead.employees >= 0
      ? matchTier(lead.employees, settings.employeeTiers)
      : 0
  )

  // S-03: Revenue $25M+ — configurable 4-tier points; annualRevenue is the field
  const revMax = Math.max(...settings.revenueTiers.map(t => t.points))
  add(
    'S-03', 'Revenue $25M+', revMax,
    lead.annualRevenue !== null && lead.annualRevenue >= 0
      ? matchTier(lead.annualRevenue, settings.revenueTiers)
      : 0
  )

  // S-04: Has Marketing Department (+7) — keyword match on industry and job title
  const mktg = textOf(lead, 'industry', 'jobTitle')
  add('S-04', 'Has Marketing Department', 7,
    hasAny(mktg, [
      'market', 'advertis', 'brand', 'media', 'creative',
      'promot', 'public relation', 'communicat', 'pr ',
    ]) ? 7 : 0
  )

  // S-05: Has Events (+11) — keyword match on industry, stage, and pinned note
  const evts = textOf(lead, 'industry', 'stage', 'pinnedNote')
  add('S-05', 'Has Events', 11,
    hasAny(evts, [
      'event', 'trade show', 'tradeshow', 'conference', 'expo',
      'convention', 'festival', 'summit', 'gala', 'symposium',
    ]) ? 11 : 0
  )

  // S-06: Ordered Promo Products — 3 configurable point levels detected by keyword
  const promo = textOf(lead, 'stage', 'pinnedNote', 'industry')
  let promoEarned = 0
  if (hasAny(promo, [
    'multiple order', 'repeat customer', 'regular customer',
    'orders multiple', 'multi-year', 'several order', 'orders regularly',
  ])) {
    promoEarned = settings.promoMultipleOrdersPoints
  } else if (hasAny(promo, [
    'has ordered', 'ordered before', 'previous order', 'past order',
    'prior order', 'purchased promo', 'bought promo', 'ordered promo',
  ])) {
    promoEarned = settings.promoOneOrderPoints
  } else if (hasAny(promo, [
    'interested in promo', 'looking for promo', 'interested in merch',
    'inquired about promo', 'asked about promo',
  ])) {
    promoEarned = settings.promoInterestPoints
  }
  add('S-06', 'Ordered Promo Products Before', settings.promoMultipleOrdersPoints, promoEarned)

  // S-07: Orders Multiple Times/Year (+15) — keyword match on stage and note
  const freq = textOf(lead, 'stage', 'pinnedNote')
  add('S-07', 'Orders Multiple Times/Year', 15,
    hasAny(freq, [
      'multiple times', 'recurring order', 'recurring purchase',
      'twice a year', 'several times', '2x per', '3x per',
      'monthly order', 'quarterly order', 'orders frequently', 'orders several',
    ]) ? 15 : 0
  )

  // S-08: Immediate Need (+23) — urgency keyword match on stage and note
  const urgency = textOf(lead, 'stage', 'pinnedNote')
  add('S-08', 'Immediate Need', 23,
    hasAny(urgency, [
      'immediate need', 'urgent', 'asap', 'as soon as', 'deadline',
      'rush order', 'need by', 'upcoming event', 'time sensitive',
      'time-sensitive', 'rush', 'right away',
    ]) ? 23 : 0
  )

  return { total, breakdown }
}

export function deriveStatus(score: number, settings: Settings): 'Hot' | 'Warm' | 'Cold' {
  if (score >= settings.hotScoreThreshold) return 'Hot'
  if (score >= settings.warmScoreThreshold) return 'Warm'
  return 'Cold'
}
