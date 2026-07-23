// Plain-language definitions for the "what does this mean?" help system (gap G4).
// Each entry is reachable two ways: an inline ExplainTerm button next to the term
// where it first appears, and the full Glossary list opened from the header Help button.

export interface Explanation {
  id: string
  term: string
  text: string
}

export const EXPLANATIONS: Explanation[] = [
  {
    id: 'hot-warm-cold',
    term: 'Hot, Warm, and Cold status',
    text: "Every lead gets a status based on its score: Hot means ready to call now, Warm means it needs a follow-up, and Cold means it's not a priority yet. The cutoff scores for each status are set on the Settings page, and you can always change a lead's status yourself if you know better.",
  },
  {
    id: 'lead-score',
    term: 'Lead score',
    text: 'Each lead gets a score out of 100 points, built from things like company size, revenue, and past interest in your products. A higher score means a stronger lead. Open "Score breakdown" on a lead\'s Briefing tab to see exactly where the points came from.',
  },
  {
    id: 'deal-value-label',
    term: 'Deal value: High, Medium, Low',
    text: 'This label sums up how big the deal is worth, based on the dollar thresholds set on the Settings page. "High" is the biggest opportunities, "Low" is the smallest — the actual dollar amount is always shown alongside it.',
  },
  {
    id: 'hot-lead-alert',
    term: 'Hot Lead Alert',
    text: "This banner highlights your single most valuable Hot lead right now — the Hot lead with the biggest deal value that's still above the minimum dollar amount set in Settings. If nothing qualifies, no alert shows.",
  },
  {
    id: 'gone-quiet',
    term: '"Gone quiet"',
    text: 'A lead is marked "gone quiet" when there has been no contact for a number of days you set on the Settings page (Nurture Cue). It\'s a reminder to check back in before the lead goes cold.',
  },
  {
    id: 'good-calling-hours',
    term: 'Local time & calling hours',
    text: "This shows the lead's local time based on their time zone, so you know if it's a good time to call. A warning means it's outside normal business hours for them right now.",
  },
  {
    id: 'my-list',
    term: 'My List (Watchlist)',
    text: 'My List is your personal shortlist — pin any lead you want to keep an eye on, regardless of its status, and add a private note only you can see. The total potential value adds up the deal values of everything pinned.',
  },
  {
    id: 'call-log',
    term: 'Call logging & Call History',
    text: "Logging a call records the date, how long it took, the outcome, and any notes — and marks the lead as called. The History page lists every call you've logged, across all leads, most recent first.",
  },
  {
    id: 'ai-call-opener',
    term: 'AI call opener',
    text: "An AI-written opening line for your call, based on the lead's company and pipeline stage. It's a starting point — read it over and make it your own before you dial.",
  },
  {
    id: 'ai-next-steps',
    term: 'AI next-step tips',
    text: 'AI-suggested actions for following up with this lead, based on its status and stage. Treat these as ideas, not instructions — you know the relationship best.',
  },
  {
    id: 'ai-email-draft',
    term: 'AI email draft',
    text: 'An AI-written email you can edit before sending. Nothing is sent automatically — copy it to your clipboard or open it in your email program, and review it first.',
  },
  {
    id: 'pipeline-qualification',
    term: 'Pipeline qualification cutoff',
    text: 'Leads scoring at or above this number are considered qualified for the main pipeline. Set to 0, every imported lead qualifies. Adjust it on the Settings page.',
  },
]

export const EXPLANATIONS_BY_ID: Record<string, Explanation> =
  Object.fromEntries(EXPLANATIONS.map(e => [e.id, e]))
